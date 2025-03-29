
import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import mongoose, { isValidObjectId, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FilterProductDTO } from './dto/filter-product.dto';
import { Product, ProductDocument } from './schema/product.schema';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductCategoriesService } from '../product-category/product-category.service';
import { ProductCategory } from '../product-category/schema/product-category.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly categoryService: ProductCategoriesService,
  ) { }

  /**
   * 🔍 Search for products by name, category, or keyword
   */

  async getFilteredProducts(filterProductDTO: FilterProductDTO, page: number = 1, limit: number = 10): Promise<any> {
    const { category, search } = filterProductDTO;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      query.categoryId = new mongoose.Types.ObjectId(category);
    } else if (category) {
      throw new Error('Invalid category ID format');
    }

    const skip = (page - 1) * limit;

    const products = await this.productModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .populate('categoryId') // Removed unitId
      .exec();

    const total = await this.productModel.countDocuments(query);

    return {
      data: products,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 📦 Get all products with pagination
   */
  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const products = await this.productModel
      .find()
      .skip(skip)
      .limit(limit)
      .populate('categoryId')
      .populate('unitId')
      .exec();

    if (!products.length) {
      throw new HttpException('No products found', HttpStatus.NOT_FOUND);
    }

    const total = await this.productModel.countDocuments();

    return {
      data: products,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 🆔 Get a single product by ID
   */
  async findOne(id: string): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const product = await this.productModel.findById(id).populate('categoryId').populate('unitId').exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /**
   * 🔍 Search for a product by barcode before scanning
   */
  async searchProductByCode(code: string): Promise<Product | null> {
    return this.productModel.findOne({ code }).exec();
  }

  /**
    * ➕ Add a new product (Scanning required for new products)
    */
  async addProduct(createProductDTO: CreateProductDto): Promise<Product> {
    const existingProduct = await this.searchProductByCode(createProductDTO.code);
    if (existingProduct) throw new NotFoundException('Product code already exists');

    const { category, brands, ...rest } = createProductDTO;
    let categoryEntity: ProductCategory | null = null;

    if (category) {
      categoryEntity = await this.categoryService.findOrCreate(category);
      if (!categoryEntity) {
        throw new NotFoundException('Failed to find or create category.');
      }
    } else {
      // Handle the case where no category is provided (e.g., set a default)
      const defaultCategoryName = 'Uncategorized';
      categoryEntity = await this.categoryService.findOrCreate(defaultCategoryName);
      if (!categoryEntity) {
        throw new Error('Could not find or create default category.');
      }
    }

    const newProduct = new this.productModel({
      ...rest,
      categoryId: categoryEntity._id,
      category: category, // Save the category name
      brands: brands, // Save the brand
    });
    return newProduct.save();
  }



  /**
   * ✏️ Update an existing product
   */
  /**
    * ✏️ Update an existing product
    */
  async updateProduct(id: string, updateProductDTO: UpdateProductDto): Promise<Product> {
    const { category, brands, ...rest } = updateProductDTO;
    const existingProduct = await this.productModel.findById(id);
    if (!existingProduct) throw new NotFoundException('Product not found');

    if (category) {
      const categoryEntity = await this.categoryService.findOrCreate(category);
      if (!categoryEntity) {
        throw new NotFoundException('Failed to find or create category.');
      }
      existingProduct.categoryId = categoryEntity._id as Types.ObjectId; // Explicit cast (if needed temporarily)
      existingProduct.category = category;
    }

    if (brands) {
      existingProduct.brands = brands;
    }

    Object.assign(existingProduct, rest); // Assign other update properties
    return existingProduct.save();
  }

  /**
   * ❌ Delete a product
   */
  async deleteProduct(id: string): Promise<{ deleted: boolean }> {
    const result = await this.productModel.findByIdAndDelete(id);
    return { deleted: !!result };
  }

  /**
   * 🚀 Supply an existing product (Increase stock & optionally update details)
   * - If product exists, update stock & optional details
   * - If product does NOT exist, requires scanning & adding
   */

  // supplier.service.ts

  async supplyProduct(id: string, additionalStock: number): Promise<Product> {
    const existingProduct = await this.productModel.findById(id);

    if (existingProduct) {
      existingProduct.stock += additionalStock;
      return existingProduct.save();
    } else {
      throw new NotFoundException('Product not found.');
    }
  }

  /**
   * 📷 Scan & Add a new product if it does not exist in the search
   */

  async scanAndAddProduct(createProductDto: CreateProductDto): Promise<Product> {
    // This method should now call addProduct, as the logic is similar
    return this.addProduct(createProductDto);
  }

  // 📌 Get All Products (Paginated)
  async getAllProducts(page: number, limit: number) {
    return this.productModel.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async getAllProduct() {
    return this.productModel.find().exec();
  }

  // 📌 Get Expiring Products (Within 30 Days)
  async getExpiringProducts() {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    return this.productModel.find({
      expiryDate: { $gte: today, $lte: thirtyDaysLater },
    }).exec();
  }

  // 📌 Get Low Stock Products (Stock < 5)
  async getLowStockProducts() {
    return this.productModel.find({ stock: { $lt: 5 } }).exec();
  }
}



