

import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schema/product.schema';
import { Store, StoreDocument } from '../store/schema/store.schema';
import { ProductCategoriesService } from '../product-category/product-category.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { UserRoleEnum } from 'src/common/enums/user.enum';
import { User } from '../user/schema/user.schema';
import { Deliveries, DeliveriesDocument } from '../deliveries/schema/deliveries.schema';
import { ProductHistory, ProductHistoryDocument } from './schema/product-history.schema';
import { imagekit } from 'src/common/config/imagekit.config';
import * as http from 'http';
import * as https from 'https';
import { isURL } from 'class-validator';

interface ProductHistoryInput {
  type: string;
  quantity: number;
  product: Types.ObjectId;
  store: Types.ObjectId;
  userId: Types.ObjectId;
  deliveryAgentId?: Types.ObjectId;
  notes?: string;
}

interface ProductMovementDto {
  productCode: string;
  quantity: number;
  deliveryAgentId?: string;
  notes?: string;
}

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductHistory.name) private readonly productHistoryModel: Model<ProductHistoryDocument>,
    @InjectModel(Store.name) private readonly storeModel: Model<StoreDocument>,
    @InjectModel(Deliveries.name) private readonly deliveriesModel: Model<DeliveriesDocument>,
    private readonly categoryService: ProductCategoriesService,
  ) { }

  async addProduct(
    createProductDto: CreateProductDto,
    ownerId: string,
    storeId: string,
    userRole: UserRoleEnum[],
    imageUrl?: string,
    file?: Express.Multer.File
  ): Promise<ProductDocument> {
    try {
      console.log('[ProductService][addProduct] Attempting to add product:', {
        storeId,
        ownerId,
        productName: createProductDto.name,
        userRole,
        imageUrl,
        hasFile: !!file,
      });

      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        throw new UnauthorizedException('Only store owners or admins can add products');
      }

      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][addProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }

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

      if (!createProductDto.name || createProductDto.price < 0 || createProductDto.quantity < 0) {
        console.error('[ProductService][addProduct] Invalid product data:', { createProductDto });
        throw new BadRequestException('Invalid product data: name, price, and quantity are required and must be valid');
      }

      if (!createProductDto.code) {
        console.error('[ProductService][addProduct] Product code is required');
        throw new BadRequestException('Product code is required');
      }

      const existingProduct = await this.productModel.findOne({ code: createProductDto.code, store: storeId }).exec();
      if (existingProduct) {
        console.error('[ProductService][addProduct] Product code already exists:', { code: createProductDto.code });
        throw new ConflictException(`Product with code ${createProductDto.code} already exists`);
      }

      let categoryId: Types.ObjectId | undefined;
      if (createProductDto.category) {
        const categoryEntity = await this.categoryService.findOrCreate(createProductDto.category);
        categoryId = categoryEntity._id as Types.ObjectId;
      }

      let finalImageUrl: string | undefined;
      if (file) {
        const uploadResponse = await imagekit.upload({
          file: file.buffer,
          fileName: `product_${createProductDto.code}_${Date.now()}.${file.mimetype.split('/')[1]}`,
          folder: '/product_images',
        });
        finalImageUrl = uploadResponse.url;
      } else if (imageUrl) {
        if (!isURL(imageUrl)) {
          console.error('[ProductService][addProduct] Invalid image URL:', { imageUrl });
          throw new BadRequestException('Invalid image URL');
        }
        try {
          const imageBuffer = await this.downloadImage(imageUrl);
          const uploadResponse = await imagekit.upload({
            file: imageBuffer,
            fileName: `product_${createProductDto.code}_${Date.now()}.jpg`,
            folder: '/product_images',
          });
          finalImageUrl = uploadResponse.url;
        } catch (error) {
          console.error('[ProductService][addProduct] Failed to upload external image:', error);
          // Proceed without image if download fails
        }
      }

      const newProduct = new this.productModel({
        ...createProductDto,
        categoryId,
        store: store._id,
        owner: new Types.ObjectId(ownerId),
        createdBy: new Types.ObjectId(ownerId),
        createdAt: new Date(),
        updatedAt: new Date(),
        imageUrl: finalImageUrl,
      });

      await newProduct.save();

      await this.storeModel.updateOne({ _id: store._id }, { $push: { products: newProduct._id } }).exec();

      await this.createProductHistory({
        type: 'restock',
        quantity: newProduct.quantity,
        product: new Types.ObjectId(newProduct._id.toString()),
        store: new Types.ObjectId(storeId),
        userId: new Types.ObjectId(ownerId),
        notes: 'Initial product creation',
      });

      console.log('[ProductService][addProduct] Product added successfully:', {
        productId: newProduct._id,
        storeId,
        ownerId,
        imageUrl: finalImageUrl,
      });

      return newProduct;
    } catch (error) {
      console.error('[ProductService][addProduct] Error:', error);
      throw error instanceof ConflictException || error instanceof UnauthorizedException
        ? error
        : new BadRequestException(error.message || 'Failed to add product');
    }
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const protocol = url.startsWith('https') ? https : http;
    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', (error) => reject(error));
      }).on('error', (error) => reject(error));
    });
  }



  async createProductHistory(history: ProductHistoryInput): Promise<ProductHistoryDocument> {
    try {
      console.log('[ProductService][createProductHistory] Creating product history:', { history });

      const newHistory = new this.productHistoryModel({
        ...history,
        createdAt: new Date(),
      });

      await newHistory.save();
      console.log('[ProductService][createProductHistory] History created:', { historyId: newHistory._id });
      return newHistory;
    } catch (error) {
      console.error('[ProductService][createProductHistory] Error:', error);
      throw new BadRequestException(error.message || 'Failed to create product history');
    }
  }

  async getProductHistory(
    productId: string,
    ownerId: string,
    storeId: string,
    userRole: UserRoleEnum[],
    page: number = 1,
    limit: number = 10,
  ): Promise<{ history: any[], total: number }> {
    try {
      console.log('[ProductService][getProductHistory] Fetching product history:', {
        productId,
        ownerId,
        storeId,
        userRole,
        page,
        limit,
      });

      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][getProductHistory] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can view product history');
      }

      if (!Types.ObjectId.isValid(productId)) {
        console.error('[ProductService][getProductHistory] Invalid product ID:', { productId });
        throw new BadRequestException('Invalid product ID');
      }
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][getProductHistory] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }
      if (!Types.ObjectId.isValid(ownerId)) {
        console.error('[ProductService][getProductHistory] Invalid owner ID:', { ownerId });
        throw new BadRequestException('Invalid owner ID');
      }

      const store = await this.storeModel
        .findOne({ _id: new Types.ObjectId(storeId) })
        .exec();
      console.log('[ProductService][getProductHistory] Store lookup result:', {
        store: store ? store : null,
      });

      if (!store) {
        console.error('[ProductService][getProductHistory] Store not found:', { storeId });
        throw new NotFoundException('Store not found');
      }

      const productDebug = await this.productModel
        .findOne({ _id: new Types.ObjectId(productId) })
        .exec();
      console.log('[ProductService][getProductHistory] Debug product lookup:', {
        productDebug: productDebug ? productDebug : null,
      });

      const product = await this.productModel
        .findOne({
          _id: new Types.ObjectId(productId),
          store: new Types.ObjectId(storeId),
        })
        .exec();
      console.log('[ProductService][getProductHistory] Product lookup result:', {
        product: product ? product : null,
      });

      if (!product) {
        console.error('[ProductService][getProductHistory] Product not found:', {
          productId,
          storeId,
        });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      const history = [
        {
          productId: product._id,
          action: 'UPDATED',
          quantity: product.quantity,
          stock: product.stock,
          price: product.price,
          timestamp: product.updatedAt,
        },
        {
          productId: product._id,
          action: 'CREATED',
          quantity: product.quantity,
          stock: product.stock,
          price: product.price,
          timestamp: product.createdAt,
        },
      ];

      const skip = (page - 1) * limit;
      const paginatedHistory = history.slice(skip, skip + limit);
      const total = history.length;

      console.log('[ProductService][getProductHistory] Product history fetched:', {
        productId,
        historyCount: paginatedHistory.length,
        total,
      });

      return { history: paginatedHistory, total };
    } catch (error) {
      console.error('[ProductService][getProductHistory] Error:', error);
      throw error;
    }
  }

  async getFilteredProducts(
    filterProductDto: FilterProductDto,
    ownerId: string,
    storeId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
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

    if (category) {
      if (Types.ObjectId.isValid(category)) {
        query.categoryId = new Types.ObjectId(category);
      } else {
        try {
          const categoryEntity = await this.categoryService.findOneByName(category);
          if (categoryEntity) {
            query.categoryId = categoryEntity._id;
          } else {
            console.warn(`[ProductService][getFilteredProducts] Category name '${category}' not found. No category filter applied.`);
          }
        } catch (error) {
          console.error('[ProductService][getFilteredProducts] Error looking up category by name:', error);
          throw new BadRequestException('Failed to process category filter due to an internal error.');
        }
      }
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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, ownerId: string, storeId: string): Promise<ProductDocument> {
    try {
      console.log('[ProductService][findOne] Fetching product:', { id, ownerId, storeId });

      if (!Types.ObjectId.isValid(id)) {
        console.error('[ProductService][findOne] Invalid product ID format:', { id });
        throw new BadRequestException(`Invalid product ID format: ${id}`);
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
      console.error('[ProductService][findOne] Error:', { id, error: error.message });
      throw new BadRequestException(error.message || `Failed to fetch product with ID: ${id}`);
    }
  }

  async searchProductByCode(code: string, ownerId: string, storeId: string): Promise<ProductDocument | null> {
    try {
      console.log('[ProductService][searchProductByCode] Searching product:', { code, ownerId, storeId });

      if (!code || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][searchProductByCode] Invalid input:', { code, storeId });
        throw new BadRequestException('Invalid code or storeId');
      }

      const product = await this.productModel
        .findOne({
          code,
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
      console.log('[ProductService][updateProduct] Attempting to update product:', { id, ownerId, storeId, userRole, updateProductDto });

      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][updateProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can update products');
      }

      if (!Types.ObjectId.isValid(id)) {
        console.error('[ProductService][updateProduct] Invalid product ID:', { id });
        throw new BadRequestException('Invalid product ID');
      }
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][updateProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }
      if (!Types.ObjectId.isValid(ownerId)) {
        console.error('[ProductService][updateProduct] Invalid owner ID:', { ownerId });
        throw new BadRequestException('Invalid owner ID');
      }

      const productDebug = await this.productModel.findOne({ _id: new Types.ObjectId(id) }).exec();
      console.log('[ProductService][updateProduct] Debug product lookup:', {
        productDebug: productDebug ? productDebug.toObject() : null,
      });

      const store = await this.storeModel.findOne({ _id: new Types.ObjectId(storeId) }).exec();
      console.log('[ProductService][updateProduct] Store lookup:', {
        store: store ? store.toObject() : null,
      });

      const existingProduct = await this.productModel
        .findOne({ _id: new Types.ObjectId(id), createdBy: new Types.ObjectId(ownerId), store: new Types.ObjectId(storeId) })
        .exec();
      if (!existingProduct) {
        console.error('[ProductService][updateProduct] Product not found:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      if (updateProductDto.category) {
        const categoryEntity = await this.categoryService.findOrCreate(updateProductDto.category);
        existingProduct.categoryId = categoryEntity._id as Types.ObjectId;
        existingProduct.category = updateProductDto.category;
      }

      if (updateProductDto.quantity !== undefined && updateProductDto.quantity !== existingProduct.quantity) {
        await this.createProductHistory({
          type: 'adjustment',
          quantity: updateProductDto.quantity - existingProduct.quantity,
          product: new Types.ObjectId(existingProduct._id.toString()),
          store: new Types.ObjectId(storeId),
          userId: new Types.ObjectId(ownerId),
          notes: 'Quantity updated via product edit',
        });
      }

      Object.assign(existingProduct, updateProductDto);
      existingProduct.updatedAt = new Date();
      await existingProduct.save();

      console.log('[ProductService][updateProduct] Product updated:', { productId: id });
      return existingProduct;
    } catch (error) {
      console.error('[ProductService][updateProduct] Error:', error);
      throw error;
    }
  }

  async deleteProduct(id: string, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<{ deleted: boolean }> {
    try {
      console.log('[ProductService][deleteProduct] Attempting to delete product:', { id, ownerId, storeId, userRole });

      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][deleteProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can delete products');
      }

      if (!Types.ObjectId.isValid(id)) {
        console.error('[ProductService][deleteProduct] Invalid product ID:', { id });
        throw new BadRequestException('Invalid product ID');
      }

      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][deleteProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }

      if (!Types.ObjectId.isValid(ownerId)) {
        console.error('[ProductService][deleteProduct] Invalid owner ID:', { ownerId });
        throw new BadRequestException('Invalid owner ID');
      }

      const product = await this.productModel.findOne({
        _id: new Types.ObjectId(id),
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
      }).exec();
      console.log('[ProductService][deleteProduct] Product lookup result:', { product: product ? product : null });

      const result = await this.productModel.deleteOne({
        _id: new Types.ObjectId(id),
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
      }).exec();

      if (result.deletedCount === 0) {
        console.error('[ProductService][deleteProduct] Product not found:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      await this.storeModel.updateOne(
        { _id: new Types.ObjectId(storeId) },
        { $pull: { products: new Types.ObjectId(id) } }
      ).exec();

      await this.productHistoryModel.deleteMany({
        product: new Types.ObjectId(id),
        store: new Types.ObjectId(storeId),
      }).exec();

      console.log('[ProductService][deleteProduct] Product deleted:', { productId: id });
      return { deleted: true };
    } catch (error) {
      console.error('[ProductService][deleteProduct] Error:', error);
      throw error;
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

      await this.createProductHistory({
        type: 'restock',
        quantity: additionalQuantity,
        product: new Types.ObjectId(product._id.toString()),
        store: new Types.ObjectId(storeId),
        userId: new Types.ObjectId(ownerId),
        notes: 'Product restocked',
      });

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
    imageUrl?: string,
    file?: Express.Multer.File
  ): Promise<ProductDocument> {
    try {
      console.log('[ProductService][scanAndAddProduct] Attempting to scan and add product:', {
        storeId,
        ownerId,
        productName: createProductDto.name,
        code: createProductDto.code,
        userRole,
        imageUrl,
        hasFile: !!file,
      });

      if (!createProductDto.code) {
        console.error('[ProductService][scanAndAddProduct] Product code is required');
        throw new BadRequestException('Product code is required for scanning');
      }

      const existingProduct = await this.productModel
        .findOne({ code: createProductDto.code, store: storeId })
        .exec();
      if (existingProduct) {
        console.error('[ProductService][scanAndAddProduct] Product code already exists:', {
          code: createProductDto.code,
          productId: existingProduct._id,
        });
        throw new ConflictException(`Product with code ${createProductDto.code} already exists`);
      }

      return await this.addProduct(createProductDto, ownerId, storeId, userRole, imageUrl, file);
    } catch (error) {
      console.error('[ProductService][scanAndAddProduct] Error:', error);
      throw error instanceof ConflictException
        ? error
        : new BadRequestException(error.message || 'Failed to scan and add product');
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

      if (!code || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][checkProductExistenceByCode] Invalid input:', { code, storeId });
        throw new BadRequestException('Invalid code or storeId');
      }

      const product = await this.productModel
        .findOne({ code, store: storeId })
        .exec();

      console.log('[ProductService][checkProductExistenceByCode] Result:', {
        exists: !!product,
        code,
        productId: product?._id,
        createdBy: product?.createdBy,
        store: product?.store,
      });

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
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        expiryWindow: `${days} days`,
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
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stockThreshold: threshold,
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
        expiringCount: expiring.total,
        lowStockCount: lowStock.total,
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

  async getProductByCode(code: string, storeId: string, user: User): Promise<Product> {
    if (!Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    const product = await this.productModel.findOne({ code, store: storeId, createdBy: user._id }).exec();
    if (!product) {
      throw new NotFoundException(`Product with code ${code} not found in store ${storeId}`);
    }

    return product;
  }

  async sendOutProduct(dto: ProductMovementDto, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<ProductDocument> {
    try {
      console.log('[ProductService][sendOutProduct] Attempting to send out product:', {
        productCode: dto.productCode,
        ownerId,
        storeId,
        quantity: dto.quantity,
        userRole,
      });

      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][sendOutProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can send out products');
      }

      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][sendOutProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }

      if (!dto.productCode || dto.quantity <= 0) {
        console.error('[ProductService][sendOutProduct] Invalid input:', { productCode: dto.productCode, quantity: dto.quantity });
        throw new BadRequestException('Product code and positive quantity are required');
      }

      const store = await this.storeModel.findOne({ _id: new Types.ObjectId(storeId) }).exec();
      if (!store) {
        console.error('[ProductService][sendOutProduct] Store not found:', { storeId });
        throw new NotFoundException('Store not found');
      }

      const product = await this.productModel
        .findOne({ code: dto.productCode, store: new Types.ObjectId(storeId) })
        .exec();
      if (!product) {
        console.error('[ProductService][sendOutProduct] Product not found:', { productCode: dto.productCode, storeId });
        throw new NotFoundException(`Product with code ${dto.productCode} not found in store`);
      }

      if (product.quantity < dto.quantity) {
        console.error('[ProductService][sendOutProduct] Insufficient quantity:', {
          productCode: dto.productCode,
          available: product.quantity,
          requested: dto.quantity,
        });
        throw new BadRequestException(`Insufficient quantity for product ${dto.productCode}`);
      }

      if (dto.deliveryAgentId && !Types.ObjectId.isValid(dto.deliveryAgentId)) {
        console.error('[ProductService][sendOutProduct] Invalid delivery agent ID:', { deliveryAgentId: dto.deliveryAgentId });
        throw new BadRequestException('Invalid delivery agent ID');
      }

      if (dto.deliveryAgentId) {
        const deliveryAgent = await this.deliveriesModel
          .findOne({ _id: new Types.ObjectId(dto.deliveryAgentId), store: new Types.ObjectId(storeId) })
          .exec();
        if (!deliveryAgent) {
          console.error('[ProductService][sendOutProduct] Delivery agent not found:', { deliveryAgentId: dto.deliveryAgentId });
          throw new NotFoundException('Delivery agent not found or not associated with this store');
        }
      }

      const session = await this.productModel.db.startSession();
      try {
        const result = await session.withTransaction(async () => {
          product.quantity -= dto.quantity;
          product.updatedAt = new Date();
          await product.save({ session });

          await this.createProductHistory({
            type: 'sent_out',
            quantity: dto.quantity,
            product: new Types.ObjectId(product._id.toString()),
            store: new Types.ObjectId(storeId),
            userId: new Types.ObjectId(ownerId),
            deliveryAgentId: dto.deliveryAgentId ? new Types.ObjectId(dto.deliveryAgentId) : undefined,
            notes: dto.notes || 'Product sent out of store',
          });

          return product;
        });

        console.log('[ProductService][sendOutProduct] Product sent out successfully:', {
          productId: product._id,
          newQuantity: product.quantity,
        });
        return result;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('[ProductService][sendOutProduct] Error:', error);
      throw error instanceof NotFoundException || error instanceof UnauthorizedException
        ? error
        : new BadRequestException(error.message || 'Failed to send out product');
    }
  }

  async receiveProduct(dto: ProductMovementDto, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<ProductDocument> {
    try {
      console.log('[ProductService][receiveProduct] Attempting to receive product:', {
        productCode: dto.productCode,
        ownerId,
        storeId,
        quantity: dto.quantity,
        userRole,
      });

      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][receiveProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can receive products');
      }

      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][receiveProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }

      if (!dto.productCode || dto.quantity <= 0) {
        console.error('[ProductService][receiveProduct] Invalid input:', { productCode: dto.productCode, quantity: dto.quantity });
        throw new BadRequestException('Product code and positive quantity are required');
      }

      const store = await this.storeModel.findOne({ _id: new Types.ObjectId(storeId) }).exec();
      if (!store) {
        console.error('[ProductService][receiveProduct] Store not found:', { storeId });
        throw new NotFoundException('Store not found');
      }

      const product = await this.productModel
        .findOne({ code: dto.productCode, store: new Types.ObjectId(storeId) })
        .exec();
      if (!product) {
        console.error('[ProductService][receiveProduct] Product not found:', { productCode: dto.productCode, storeId });
        throw new NotFoundException(`Product with code ${dto.productCode} not found in store`);
      }

      if (dto.deliveryAgentId && !Types.ObjectId.isValid(dto.deliveryAgentId)) {
        console.error('[ProductService][receiveProduct] Invalid delivery agent ID:', { deliveryAgentId: dto.deliveryAgentId });
        throw new BadRequestException('Invalid delivery agent ID');
      }

      if (dto.deliveryAgentId) {
        const deliveryAgent = await this.deliveriesModel
          .findOne({ _id: new Types.ObjectId(dto.deliveryAgentId), store: new Types.ObjectId(storeId) })
          .exec();
        if (!deliveryAgent) {
          console.error('[ProductService][receiveProduct] Delivery agent not found:', { deliveryAgentId: dto.deliveryAgentId });
          throw new NotFoundException('Delivery agent not found or not associated with this store');
        }
      }

      const session = await this.productModel.db.startSession();
      try {
        const result = await session.withTransaction(async () => {
          product.quantity += dto.quantity;
          product.updatedAt = new Date();
          await product.save({ session });

          await this.createProductHistory({
            type: 'received',
            quantity: dto.quantity,
            product: new Types.ObjectId(product._id.toString()),
            store: new Types.ObjectId(storeId),
            userId: new Types.ObjectId(ownerId),
            deliveryAgentId: dto.deliveryAgentId ? new Types.ObjectId(dto.deliveryAgentId) : undefined,
            notes: dto.notes || 'Product received into store',
          });

          return product;
        });

        console.log('[ProductService][receiveProduct] Product received successfully:', {
          productId: product._id,
          newQuantity: product.quantity,
        });
        return result;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('[ProductService][receiveProduct] Error:', error);
      throw error instanceof NotFoundException || error instanceof UnauthorizedException
        ? error
        : new BadRequestException(error.message || 'Failed to receive product');
    }
  }

  async uploadProductImage(productId: string, storeId: string, ownerId: string, file: Express.Multer.File): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(storeId) || !Types.ObjectId.isValid(ownerId)) {
      console.error('[ProductService][uploadProductImage] Invalid input:', { productId, storeId, ownerId });
      throw new BadRequestException('Invalid product ID, store ID, or owner ID');
    }

    if (!file) {
      console.error('[ProductService][uploadProductImage] No file provided:', { productId });
      throw new BadRequestException('No image file provided');
    }

    try {
      const product = await this.productModel
        .findOne({ _id: productId, store: storeId, createdBy: ownerId })
        .exec();
      if (!product) {
        console.error('[ProductService][uploadProductImage] Product not found:', { productId, storeId, ownerId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      const uploadResponse = await imagekit.upload({
        file: file.buffer,
        fileName: `product_${productId}_${Date.now()}.${file.mimetype.split('/')[1]}`,
        folder: '/product_images',
      });

      product.imageUrl = uploadResponse.url;
      await product.save();

      console.log('[ProductService][uploadProductImage] Product image uploaded:', { productId, imageUrl: uploadResponse.url });
      return product;
    } catch (error) {
      console.error('[ProductService][uploadProductImage] Error:', error);
      throw new BadRequestException('Failed to upload product image');
    }
  }
}