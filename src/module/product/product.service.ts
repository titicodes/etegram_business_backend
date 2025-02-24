import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FilterProductDTO } from './dto/filter-product.dto';
import { Product, ProductDocument } from './schema/product.schema';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductCategoriesService } from '../product-category/product-category.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly categoryService: ProductCategoriesService,
  ) { }

  async getFilteredProducts(filterProductDTO: FilterProductDTO): Promise<Product[]> {
    const { category, search } = filterProductDTO;
    let query = this.productModel.find();

    if (search) {
      query = query.or([{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]);
    }
    if (category) {
      query = query.where('categoryId').equals(category);
    }

    return query.exec();
  }

  // async findAll(): Promise<Product[]> {
  //   return this.productModel.find().populate('categoryId').populate('unitId').exec();
  // }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const products = await this.productModel
      .find()
      .skip(skip)
      .limit(limit)
      .populate('categoryId').populate('unitId')
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
        totalPages: Math.ceil(total / limit)
      }
    };
  }


  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).populate('categoryId').populate('unitId').exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getProductByCode(code: string): Promise<Product | null> {
    return this.productModel.findOne({ code }).exec();
  }

  async addProduct(createProductDTO: CreateProductDto): Promise<Product> {
    const existingProduct = await this.getProductByCode(createProductDTO.code);
    if (existingProduct) throw new NotFoundException('Product code already exists');

    const newProduct = new this.productModel(createProductDTO);
    return newProduct.save();
  }

  async updateProduct(id: string, updateProductDTO: UpdateProductDto): Promise<Product> {
    const updatedProduct = await this.productModel.findByIdAndUpdate(id, updateProductDTO, { new: true });
    if (!updatedProduct) throw new NotFoundException('Product not found');
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<{ deleted: boolean }> {
    const result = await this.productModel.findByIdAndDelete(id);
    return { deleted: !!result };
  }

  async scanAndAddProduct(createProductDto: CreateProductDto): Promise<Product> {
    const { code, name, categoryId, price, stock } = createProductDto;

    const existingCategory = await this.categoryService.findOne(categoryId);
    if (!existingCategory) throw new NotFoundException('Category not found');

    return this.productModel.findOneAndUpdate(
      { code },
      { $inc: { stock: stock }, $setOnInsert: { name, categoryId, price } },
      { new: true, upsert: true }
    );
  }
}
