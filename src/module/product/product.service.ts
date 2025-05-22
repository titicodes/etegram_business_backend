import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schema/product.schema';
import { Store, StoreDocument } from '../store/schema/store.schema';
import { ProductCategoriesService } from '../product-category/product-category.service';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Store.name) private readonly storeModel: Model<StoreDocument>,
    private readonly categoryService: ProductCategoriesService,
  ) { }

  async addProduct(createProductDto: CreateProductDto, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<ProductDocument> {
    try {
      console.log('[ProductService][addProduct] Attempting to add product:', {
        storeId,
        ownerId,
        productName: createProductDto.name,
        userRole,
      });

      // Validate user role
      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][addProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can add products');
      }

      // Validate storeId
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][addProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }

      // Check store ownership (unless user is ADMIN)
      let store: StoreDocument | null;
      if (userRole.includes(UserRoleEnum.ADMIN)) {
        store = await this.storeModel.findById(storeId).exec();
      } else {
        store = await this.storeModel.findOne({ _id: storeId, owner: ownerId }).exec();
      }

      if (!store) {
        console.error('[ProductService][addProduct] Store not found or unauthorized:', { storeId, ownerId });
        throw new BadRequestException('Store not found or you do not have permission');
      }

      // Validate product data
      if (!createProductDto.name || createProductDto.price < 0 || createProductDto.quantity < 0) {
        console.error('[ProductService][addProduct] Invalid product data:', { createProductDto });
        throw new BadRequestException('Invalid product data: name, price, and quantity are required and must be valid');
      }

      // Check for duplicate product code
      if (createProductDto.code) {
        const existingProduct = await this.productModel.findOne({ code: createProductDto.code, store: storeId }).exec();
        if (existingProduct) {
          console.error('[ProductService][addProduct] Product code already exists:', { code: createProductDto.code });
          throw new ConflictException('Product code already exists');
        }
      }

      // Handle category
      let categoryId: Types.ObjectId | undefined;
      if (createProductDto.category) {
        const categoryEntity = await this.categoryService.findOrCreate(createProductDto.category);
        categoryId = categoryEntity._id as Types.ObjectId;
      }

      // Create new product
      const newProduct = new this.productModel({
        ...createProductDto,
        categoryId,
        store: store._id,
        createdBy: ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await newProduct.save();

      // Update store's products array
      await this.storeModel.updateOne({ _id: store._id }, { $push: { products: newProduct._id } }).exec();

      console.log('[ProductService][addProduct] Product added successfully:', {
        productId: newProduct._id,
        storeId,
        ownerId,
      });

      return newProduct;
    } catch (error) {
      console.error('[ProductService][addProduct] Error:', error);
      throw new BadRequestException(error.message || 'Failed to add product');
    }
  }

  async getFilteredProducts(
    filterProductDto: FilterProductDto,
    ownerId: string,
    storeId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      console.log('[ProductService][getFilteredProducts] Fetching filtered products:', {
        ownerId,
        storeId,
        filter: filterProductDto,
        page,
        limit,
      });

      const { category, search } = filterProductDto;
      const query: any = { createdBy: ownerId, store: storeId };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
        ];
      }

      if (category && Types.ObjectId.isValid(category)) {
        query.categoryId = new Types.ObjectId(category);
      } else if (category) {
        console.error('[ProductService][getFilteredProducts] Invalid category ID:', { category });
        throw new BadRequestException('Invalid category ID format');
      }

      const skip = (page - 1) * limit;

      const products = await this.productModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('categoryId')
        .exec();

      const total = await this.productModel.countDocuments(query);

      console.log('[ProductService][getFilteredProducts] Products fetched:', { total, page, limit });

      return {
        data: products,
        metadata: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      console.error('[ProductService][getFilteredProducts] Error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch filtered products');
    }
  }

  async findOne(id: string, ownerId: string, storeId: string): Promise<ProductDocument> {
    try {
      console.log('[ProductService][findOne] Fetching product:', { id, ownerId, storeId });

      if (!Types.ObjectId.isValid(id)) {
        console.error('[ProductService][findOne] Invalid product ID:', { id });
        throw new BadRequestException('Invalid product ID format');
      }

      const product = await this.productModel
        .findOne({ _id: id, createdBy: ownerId, store: storeId })
        .populate('categoryId')
        .exec();
      if (!product) {
        console.error('[ProductService][findOne] Product not found:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      console.log('[ProductService][findOne] Product fetched:', { productId: id });
      return product;
    } catch (error) {
      console.error('[ProductService][findOne] Error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch product');
    }
  }

  async searchProductByCode(code: string, ownerId: string, storeId: string): Promise<ProductDocument | null> {
    try {
      console.log('[ProductService][searchProductByCode] Searching product:', { code, ownerId, storeId });

      if (!code || !Types.ObjectId.isValid(ownerId) || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][searchProductByCode] Invalid input:', { code, ownerId, storeId });
        throw new BadRequestException('Invalid code, ownerId, or storeId');
      }

      const product = await this.productModel
        .findOne({
          code,
          createdBy: new Types.ObjectId(ownerId),
          store: new Types.ObjectId(storeId),
        })
        .populate('categoryId')
        .exec();

      console.log('[ProductService][searchProductByCode] Search result:', { found: !!product, code });
      return product;
    } catch (error) {
      console.error('[ProductService][searchProductByCode] Error:', error);
      throw new BadRequestException(error.message || 'Failed to search product');
    }
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<ProductDocument> {
    try {
      console.log('[ProductService][updateProduct] Attempting to update product:', { id, ownerId, storeId, userRole });

      // Validate user role
      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][updateProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can update products');
      }

      const existingProduct = await this.productModel
        .findOne({ _id: id, createdBy: ownerId, store: storeId })
        .exec();
      if (!existingProduct) {
        console.error('[ProductService][updateProduct] Product not found:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      // Handle category
      if (updateProductDto.category) {
        const categoryEntity = await this.categoryService.findOrCreate(updateProductDto.category);
        existingProduct.categoryId = categoryEntity._id as Types.ObjectId;
        existingProduct.category = updateProductDto.category;
      }

      Object.assign(existingProduct, updateProductDto);
      await existingProduct.save();


      console.log('[ProductService][updateProduct] Product updated:', { productId: id });
      return existingProduct;
    } catch (error) {
      console.error('[ProductService][updateProduct] Error:', error);
      throw new BadRequestException(error.message || 'Failed to update product');
    }
  }

  async deleteProduct(id: string, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<{ deleted: boolean }> {
    try {
      console.log('[ProductService][deleteProduct] Attempting to delete product:', { id, ownerId, storeId, userRole });

      // Validate user role
      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][deleteProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can delete products');
      }

      const result = await this.productModel.deleteOne({
        _id: id,
        createdBy: ownerId,
        store: storeId,
      }).exec();

      if (result.deletedCount === 0) {
        console.error('[ProductService][deleteProduct] Product not found:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      // Remove product from store's products array
      await this.storeModel.updateOne({ _id: storeId }, { $pull: { products: id } }).exec();

      console.log('[ProductService][deleteProduct] Product deleted:', { productId: id });
      return { deleted: true };
    } catch (error) {
      console.error('[ProductService][deleteProduct] Error:', error);
      throw new BadRequestException(error.message || 'Failed to delete product');
    }
  }

  async supplyProduct(id: string, additionalQuantity: number, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<ProductDocument> {
    try {
      console.log('[ProductService][supplyProduct] Attempting to supply product:', {
        id,
        ownerId,
        storeId,
        additionalQuantity,
        userRole,
      });

      // Validate user role
      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][supplyProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can supply products');
      }

      const product = await this.productModel
        .findOne({ _id: id, createdBy: ownerId, store: storeId })
        .exec();
      if (!product) {
        console.error('[ProductService][supplyProduct] Product not found:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      if (additionalQuantity < 0) {
        console.error('[ProductService][supplyProduct] Invalid quantity:', { additionalQuantity });
        throw new BadRequestException('Additional quantity must be non-negative');
      }

      product.quantity += additionalQuantity;
      product.updatedAt = new Date();
      await product.save();

      console.log('[ProductService][supplyProduct] Product supplied:', { productId: id, newQuantity: product.quantity });
      return product;
    } catch (error) {
      console.error('[ProductService][supplyProduct] Error:', error);
      throw new BadRequestException(error.message || 'Failed to supply product');
    }
  }

  async scanAndAddProduct(
    createProductDto: CreateProductDto,
    ownerId: string,
    storeId: string,
    userRole: UserRoleEnum[],
  ): Promise<ProductDocument> {
    try {
      console.log('[ProductService][scanAndAddProduct] Attempting to scan and add product:', {
        storeId,
        ownerId,
        productName: createProductDto.name,
        userRole,
      });

      return await this.addProduct(createProductDto, ownerId, storeId, userRole);
    } catch (error) {
      console.error('[ProductService][scanAndAddProduct] Error:', error);
      throw new BadRequestException(error.message || 'Failed to scan and add product');
    }
  }

  async checkProductExistenceByCode(
    code: string,
    ownerId: string,
    storeId: string,
  ): Promise<{ exists: boolean; product?: ProductDocument }> {
    try {
      console.log('[ProductService][checkProductExistenceByCode] Checking product existence:', {
        code,
        ownerId,
        storeId,
      });

      const product = await this.productModel
        .findOne({ code, createdBy: ownerId, store: storeId })
        .exec();

      console.log('[ProductService][checkProductExistenceByCode] Result:', { exists: !!product, code });
      return { exists: !!product, product: product || undefined };
    } catch (error) {
      console.error('[ProductService][checkProductExistenceByCode] Error:', error);
      throw new BadRequestException(error.message || 'Failed to check product existence');
    }
  }

  async getExpiringProducts(
    ownerId: string,
    storeId: string,
    days: number = 30,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      console.log('[ProductService][getExpiringProducts] Fetching expiring products:', {
        ownerId,
        storeId,
        days,
        page,
        limit,
      });

      if (!Types.ObjectId.isValid(ownerId) || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][getExpiringProducts] Invalid input:', { ownerId, storeId });
        throw new BadRequestException('Invalid ownerId or storeId');
      }

      const today = new Date();
      const expiryThreshold = new Date();
      expiryThreshold.setDate(today.getDate() + days);

      const query = {
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
        expiryDate: { $gte: today, $lte: expiryThreshold },
      };

      const skip = (page - 1) * limit;

      const products = await this.productModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('categoryId')
        .exec();

      const total = await this.productModel.countDocuments(query);

      console.log('[ProductService][getExpiringProducts] Products fetched:', { total, page, limit });

      return {
        data: products,
        metadata: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          expiryWindow: `${days} days`,
        },
      };
    } catch (error) {
      console.error('[ProductService][getExpiringProducts] Error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch expiring products');
    }
  }

  async getLowStockProducts(
    ownerId: string,
    storeId: string,
    threshold: number = 5,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      console.log('[ProductService][getLowStockProducts] Fetching low stock products:', {
        ownerId,
        storeId,
        threshold,
        page,
        limit,
      });

      if (!Types.ObjectId.isValid(ownerId) || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][getLowStockProducts] Invalid input:', { ownerId, storeId });
        throw new BadRequestException('Invalid ownerId or storeId');
      }

      const query = {
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
        quantity: { $lte: threshold },
      };

      const skip = (page - 1) * limit;

      const products = await this.productModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('categoryId')
        .exec();

      const total = await this.productModel.countDocuments(query);

      console.log('[ProductService][getLowStockProducts] Products fetched:', { total, page, limit });

      return {
        data: products,
        metadata: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          stockThreshold: threshold,
        },
      };
    } catch (error) {
      console.error('[ProductService][getLowStockProducts] Error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch low stock products');
    }
  }

  async getTotalStock(ownerId: string, storeId: string): Promise<{ totalQuantity: number; products: ProductDocument[] }> {
    try {
      console.log('[ProductService][getTotalStock] Fetching total stock:', { ownerId, storeId });

      if (!Types.ObjectId.isValid(ownerId) || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][getTotalStock] Invalid input:', { ownerId, storeId });
        throw new BadRequestException('Invalid ownerId or storeId');
      }

      const query = {
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
      };

      const products = await this.productModel.find(query).exec();

      const totalQuantity = products.reduce((sum, product) => sum + (product.quantity || 0), 0);

      console.log('[ProductService][getTotalStock] Total stock fetched:', { totalQuantity, ownerId, storeId });

      return {
        totalQuantity,
        products,
      };
    } catch (error) {
      console.error('[ProductService][getTotalStock] Error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch total stock');
    }
  }

  async getInventorySummary(ownerId: string, storeId: string): Promise<{
    totalCost: number;
    totalSellingPrice: number;
    totalQuantity: number;
  }> {
    try {
      console.log('[ProductService][getInventorySummary] Fetching inventory summary:', { ownerId, storeId });

      if (!Types.ObjectId.isValid(ownerId) || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][getInventorySummary] Invalid input:', { ownerId, storeId });
        throw new BadRequestException('Invalid ownerId or storeId');
      }

      const products = await this.productModel
        .find({ createdBy: ownerId, store: storeId })
        .exec();

      let totalCost = 0;
      let totalSellingPrice = 0;
      let totalQuantity = 0;

      for (const product of products) {
        totalCost += (product.costPrice || product.price || 0) * (product.quantity || 0);
        totalSellingPrice += (product.price || 0) * (product.quantity || 0);
        totalQuantity += product.quantity || 0;
      }

      console.log('[ProductService][getInventorySummary] Summary fetched:', {
        totalCost,
        totalSellingPrice,
        totalQuantity,
      });

      return {
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalSellingPrice: parseFloat(totalSellingPrice.toFixed(2)),
        totalQuantity,
      };
    } catch (error) {
      console.error('[ProductService][getInventorySummary] Error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch inventory summary');
    }
  }

  async getExpiringAndLowStockProducts(
    ownerId: string,
    storeId: string,
    expiryDays: number = 30,
    stockThreshold: number = 5,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    expiringProducts: any;
    lowStockProducts: any;
    totalQuantity: number;
  }> {
    try {
      console.log('[ProductService][getExpiringAndLowStockProducts] Fetching expiring and low stock products:', {
        ownerId,
        storeId,
        expiryDays,
        stockThreshold,
        page,
        limit,
      });

      const expiring = await this.getExpiringProducts(ownerId, storeId, expiryDays, page, limit);
      const lowStock = await this.getLowStockProducts(ownerId, storeId, stockThreshold, page, limit);
      const totalStockResult = await this.getTotalStock(ownerId, storeId);

      console.log('[ProductService][getExpiringAndLowStockProducts] Data fetched:', {
        expiringCount: expiring.metadata.total,
        lowStockCount: lowStock.metadata.total,
        totalQuantity: totalStockResult.totalQuantity,
      });

      return {
        expiringProducts: expiring,
        lowStockProducts: lowStock,
        totalQuantity: totalStockResult.totalQuantity,
      };
    } catch (error) {
      console.error('[ProductService][getExpiringAndLowStockProducts] Error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch expiring and low stock products');
    }
  }
}