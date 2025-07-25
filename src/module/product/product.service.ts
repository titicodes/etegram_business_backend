

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
    const session = await this.productModel.db.startSession();
    try {
      console.log('[ProductService][addProduct] Attempting to add product:', {
        storeId,
        ownerId,
        productName: createProductDto.name,
        userRole,
        imageUrl,
        hasFile: !!file,
      });

      // Authorization check
      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        throw new UnauthorizedException('Only store owners or admins can add products');
      }

      // Validate store ID
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][addProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }

      let store: StoreDocument | null;
      if (userRole.includes(UserRoleEnum.ADMIN)) {
        store = await this.storeModel.findById(storeId).session(session).exec();
      } else {
        store = await this.storeModel
          .findOne({ _id: storeId, owner: ownerId })
          .session(session)
          .exec();
      }

      if (!store) {
        console.error('[ProductService][addProduct] Store not found or unauthorized:', { storeId, ownerId });
        throw new BadRequestException('Store not found or you do not have permission');
      }

      // Validate product data
      // Adjusted quantity validation based on frontend suggestion (quantity > 0 for new product)
      if (!createProductDto.name || createProductDto.price <= 0 || createProductDto.quantity < 1) {
        console.error('[ProductService][addProduct] Invalid product data: name, price (must be positive), and quantity (must be at least 1) are required and must be valid', { createProductDto });
        throw new BadRequestException('Invalid product data: name, price (must be positive), and quantity (must be at least 1) are required and must be valid');
      }

      if (!createProductDto.code) {
        console.error('[ProductService][addProduct] Product code is required');
        throw new BadRequestException('Product code is required');
      }

      // Check for duplicate product code within the store
      const existingProduct = await this.productModel
        .findOne({ code: createProductDto.code, store: storeId })
        .session(session)
        .exec();
      if (existingProduct) {
        console.error('[ProductService][addProduct] Product code already exists:', { code: createProductDto.code, storeId });
        throw new ConflictException(`Product with code ${createProductDto.code} already exists in this store`);
      }

      // Handle category
      let categoryId: Types.ObjectId | undefined;
      if (createProductDto.category) {
        const categoryEntity = await this.categoryService.findOrCreate(createProductDto.category, session);
        categoryId = categoryEntity._id as Types.ObjectId;
      }

      // Handle image (optional) - Logic remains to log error and proceed without image if upload fails
      let finalImageUrl: string | undefined;
      if (file) {
        this.validateImageFile(file); // Validate file type and size
        try {
          const uploadResponse = await imagekit.upload({
            file: file.buffer,
            fileName: `product_${createProductDto.code}_${Date.now()}.${file.mimetype.split('/')[1]}`,
            folder: '/product_images',
          });
          finalImageUrl = uploadResponse.url;
        } catch (error) {
          console.error('[ProductService][addProduct] Failed to upload file to ImageKit. Proceeding without image URL if not critical:', error);
          // Log the error but proceed without setting imageUrl if image is optional
        }
      } else if (imageUrl) {
        if (!isURL(imageUrl)) {
          console.error('[ProductService][addProduct] Invalid image URL format:', { imageUrl });
          throw new BadRequestException('Invalid image URL format');
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
          console.error('[ProductService][addProduct] Failed to download or upload external image to ImageKit. Proceeding without image URL if not critical:', error);
          // Log the error but proceed without setting imageUrl if image is optional
        }
      }

      // Start transaction
      const result = await session.withTransaction(async () => {
        // Create new product
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

        await newProduct.save({ session });

        // Update store with product reference
        await this.storeModel
          .updateOne({ _id: store._id }, { $push: { products: newProduct._id } })
          .session(session)
          .exec();

        // Create product history for initial creation
        await this.createProductHistory(
          {
            type: 'restock',
            quantity: newProduct.quantity,
            product: new Types.ObjectId(newProduct._id.toString()),
            store: new Types.ObjectId(storeId),
            userId: new Types.ObjectId(ownerId),
            notes: 'Initial product creation/restock',
          },
          session
        );

        return newProduct;
      });

      console.log('[ProductService][addProduct] Product added successfully:', {
        productId: result._id,
        storeId,
        ownerId,
        finalImageUrl,
      });

      return result;
    } catch (error) {
      console.error('[ProductService][addProduct] Error adding product:', error);
      // Ensure specific exceptions are re-thrown, otherwise wrap in BadRequestException
      if (error instanceof ConflictException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to add product');
    } finally {
      session.endSession();
    }
  }


  private async downloadImage(url: string): Promise<Buffer> {
    const protocol = url.startsWith('https') ? https : http;
    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image from ${url}: Status ${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', (error) => reject(error));
      }).on('error', (error) => reject(error));
    });
  }

  private validateImageFile(file: Express.Multer.File): void {
    // Add more allowed MIME types based on your Flutter `ImageUtils`
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp', // Note: BMP images can be very large, consider if you truly want to support them
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      console.error('[ProductService][validateImageFile] Invalid file type:', { mimetype: file.mimetype });
      // Update the error message to reflect the new allowed types
      throw new BadRequestException('Only JPEG, PNG, GIF, WebP, or BMP images are allowed');
    }

    if (file.size > maxSize) {
      console.error('[ProductService][validateImageFile] File too large:', { size: file.size });
      throw new BadRequestException('Image size must not exceed 5MB');
    }
  }

  async createProductHistory(history: ProductHistoryInput, session?: any): Promise<ProductHistoryDocument> {
    try {
      console.log('[ProductService][createProductHistory] Creating product history:', { history });

      const newHistory = new this.productHistoryModel({
        ...history,
        createdAt: new Date(),
      });

      await newHistory.save({ session });
      console.log('[ProductService][createProductHistory] History created:', { historyId: newHistory._id });
      return newHistory;
    } catch (error) {
      console.error('[ProductService][createProductHistory] Error creating product history:', error);
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
  ): Promise<{ history: ProductHistoryDocument[], total: number }> {
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
      // ownerId validation is important if you later decide to filter history by owner (e.g., if multiple admins exist)
      // if (!Types.ObjectId.isValid(ownerId)) {
      //   console.error('[ProductService][getProductHistory] Invalid owner ID:', { ownerId });
      //   throw new BadRequestException('Invalid owner ID');
      // }

      // Validate that the product exists and belongs to the store
      const product = await this.productModel
        .findOne({
          _id: new Types.ObjectId(productId),
          store: new Types.ObjectId(storeId),
        })
        .exec();

      if (!product) {
        console.error('[ProductService][getProductHistory] Product not found in store:', { productId, storeId });
        throw new NotFoundException('Product not found or you do not have permission for this store');
      }

      // --- FIX: Query the actual ProductHistory model ---
      const historyQuery: any = {
        product: new Types.ObjectId(productId),
        store: new Types.ObjectId(storeId),
        // Optionally, add userId filter if history should only be viewable by the user who made the change
        // userId: new Types.ObjectId(ownerId),
      };

      const skip = (page - 1) * limit;

      const [history, total] = await Promise.all([
        this.productHistoryModel
          .find(historyQuery)
          .sort({ createdAt: -1 }) // Sort by most recent first
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productHistoryModel.countDocuments(historyQuery),
      ]);

      console.log('[ProductService][getProductHistory] Product history fetched:', {
        productId,
        historyCount: history.length,
        total,
      });

      return { history, total };
    } catch (error) {
      console.error('[ProductService][getProductHistory] Error fetching product history:', error);
      // Re-throw specific exceptions
      if (error instanceof UnauthorizedException || error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to fetch product history');
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
    // Filtering by createdBy (ownerId) and store is correct for tenancy
    const query: any = { createdBy: new Types.ObjectId(ownerId), store: new Types.ObjectId(storeId) };

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
            // If category doesn't exist, it implies no products match, but don't throw an error for a non-existent filter
            // Consider throwing if a category filter is mandatory and not found: throw new NotFoundException(`Category '${category}' not found.`);
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
      if (!Types.ObjectId.isValid(ownerId)) {
        console.error('[ProductService][findOne] Invalid owner ID format:', { ownerId });
        throw new BadRequestException(`Invalid owner ID format: ${ownerId}`);
      }
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][findOne] Invalid store ID format:', { storeId });
        throw new BadRequestException(`Invalid store ID format: ${storeId}`);
      }

      const product = await this.productModel
        .findOne({ _id: new Types.ObjectId(id), createdBy: new Types.ObjectId(ownerId), store: new Types.ObjectId(storeId) })
        .populate('categoryId')
        .exec();
      if (!product) {
        console.error('[ProductService][findOne] Product not found:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      console.log('[ProductService][findOne] Product fetched:', { productId: id });
      return product;
    } catch (error) {
      console.error('[ProductService][findOne] Error fetching product:', { id, error: error.message });
      // Re-throw specific exceptions
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || `Failed to fetch product with ID: ${id}`);
    }
  }


  async searchProductByCode(code: string, ownerId: string, storeId: string): Promise<ProductDocument | null> {
    try {
      console.log('[ProductService][searchProductByCode] Searching product:', { code, ownerId, storeId });

      if (!code) {
        console.error('[ProductService][searchProductByCode] Product code is required');
        throw new BadRequestException('Product code is required');
      }
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][searchProductByCode] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }
      // Decided to keep this method NOT filtered by ownerId in the query itself, aligning with checkProductExistenceByCode
      // If it should be strictly within an owner's products, uncomment ownerId filter below.
      // if (!Types.ObjectId.isValid(ownerId)) {
      //   console.error('[ProductService][searchProductByCode] Invalid owner ID:', { ownerId });
      //   throw new BadRequestException('Invalid owner ID');
      // }

      const product = await this.productModel
        .findOne({
          code,
          store: new Types.ObjectId(storeId),
          // createdBy: new Types.ObjectId(ownerId), // Uncomment if you want owner-specific search
        })
        .populate('categoryId')
        .exec();

      console.log('[ProductService][searchProductByCode] Search result:', { found: !!product, code, storeId });
      return product;
    } catch (error) {
      console.error('[ProductService][searchProductByCode] Error searching product:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to search product');
    }
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
    ownerId: string,
    storeId: string,
    userRole: UserRoleEnum[],
    file?: Express.Multer.File,
    imageUrl?: string,
  ): Promise<ProductDocument> {
    const session = await this.productModel.db.startSession();
    try {
      console.log('[ProductService][updateProduct] Attempting to update product:', { id, ownerId, storeId, userRole, updateProductDto, hasFile: !!file });

      // Authorization check
      if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
        console.error('[ProductService][updateProduct] Unauthorized access:', { ownerId, userRole });
        throw new UnauthorizedException('Only store owners or admins can update products');
      }

      // Validate IDs
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

      // Find existing product (ensuring ownership)
      const existingProduct = await this.productModel
        .findOne({ _id: new Types.ObjectId(id), createdBy: new Types.ObjectId(ownerId), store: new Types.ObjectId(storeId) })
        .session(session)
        .exec();
      if (!existingProduct) {
        console.error('[ProductService][updateProduct] Product not found for update or unauthorized:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      // Store old image URL for potential deletion AFTER successful update and new upload
      const oldImageUrl = existingProduct.imageUrl;
      let oldImageFileId: string | null = null;
      if (oldImageUrl) {
        oldImageFileId = this.getImageKitFileId(oldImageUrl);
      }


      // Handle image update
      let finalImageUrl: string | undefined = existingProduct.imageUrl; // Default to existing
      if (file) {
        this.validateImageFile(file); // Validate file type and size
        try {
          const uploadResponse = await imagekit.upload({
            file: file.buffer,
            fileName: `product_${id}_${Date.now()}.${file.mimetype.split('/')[1]}`,
            folder: '/product_images',
          });
          finalImageUrl = uploadResponse.url;
        } catch (error) {
          console.error('[ProductService][updateProduct] Failed to upload new file to ImageKit. Keeping existing image or no image if current is null:', error);
          // Log the error but proceed without updating the image if upload failed
        }
      } else if (updateProductDto.imageUrl) {
        // Only attempt to download/reupload if it's a new URL or different from existing
        if (updateProductDto.imageUrl !== existingProduct.imageUrl) {
          if (!isURL(updateProductDto.imageUrl)) {
            console.error('[ProductService][updateProduct] Invalid image URL provided in DTO:', { imageUrl: updateProductDto.imageUrl });
            throw new BadRequestException('Invalid image URL');
          }
          try {
            const imageBuffer = await this.downloadImage(updateProductDto.imageUrl);
            const uploadResponse = await imagekit.upload({
              file: imageBuffer,
              fileName: `product_${id}_${Date.now()}.jpg`,
              folder: '/product_images',
            });
            finalImageUrl = uploadResponse.url;
          } catch (error) {
            console.error('[ProductService][updateProduct] Failed to download or upload external image via URL. Keeping existing image or no image if current is null:', error);
            // Log the error but proceed without updating the image
          }
        }
      } else if (updateProductDto.imageUrl === null) { // Explicitly handle case where frontend sends null to remove image
        finalImageUrl = undefined; // Set to undefined to clear it
      }


      // Start transaction
      const updatedProduct = await session.withTransaction(async () => {
        // Handle category update
        if (updateProductDto.category) {
          const categoryEntity = await this.categoryService.findOrCreate(updateProductDto.category, session);
          existingProduct.categoryId = categoryEntity._id as Types.ObjectId;
          existingProduct.category = updateProductDto.category;
        } else if (updateProductDto.category === null) { // Allow clearing category
          existingProduct.categoryId = undefined;
          existingProduct.category = undefined;
        }

        // Record quantity change in history BEFORE updating quantity on product
        if (updateProductDto.quantity !== undefined && updateProductDto.quantity !== existingProduct.quantity) {
          const quantityChange = updateProductDto.quantity - existingProduct.quantity;
          await this.createProductHistory(
            {
             type: quantityChange > 0 ? 'restock' : 'sale_adjustment',
              quantity: quantityChange, // Store the difference
              product: new Types.ObjectId(existingProduct._id.toString()),
              store: new Types.ObjectId(storeId),
              userId: new Types.ObjectId(ownerId),
              notes: `Quantity changed from ${existingProduct.quantity} to ${updateProductDto.quantity} via product edit`,
            },
            session
          );
        }

        // Update product fields from DTO (excluding properties handled separately like imageUrl, category, quantity)
        // Ensure that `quantity` is updated on the `existingProduct` object after recording history
        Object.assign(existingProduct, updateProductDto);
        existingProduct.imageUrl = finalImageUrl;
        existingProduct.updatedAt = new Date(); // Update timestamp

        await existingProduct.save({ session });
        return existingProduct;
      });

      // Delete old image if a new one was successfully uploaded or image was explicitly removed
      // This is done outside the transaction, as ImageKit is an external service.
      if (oldImageFileId && finalImageUrl !== oldImageUrl) {
        try {
          await imagekit.deleteFile(oldImageFileId);
          console.log('[ProductService][updateProduct] Old image deleted:', { oldImageFileId });
        } catch (error) {
          console.error('[ProductService][updateProduct] Failed to delete old image from ImageKit:', { oldImageFileId, error });
          // Log the error but do not throw, as the product update is complete
        }
      }

      console.log('[ProductService][updateProduct] Product updated successfully:', { productId: id });
      return updatedProduct;
    } catch (error) {
      console.error('[ProductService][updateProduct] Error updating product:', error);
      // Re-throw specific exceptions
      if (error instanceof UnauthorizedException || error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update product');
    } finally {
      session.endSession();
    }
  }

  private getImageKitFileId(imageUrl?: string): string | null {
    if (!imageUrl) return null;
    try {
      const url = new URL(imageUrl);
      // ImageKit's deleteFile API often expects the path name relative to the root folder,
      // which is typically what's in the URL's pathname after the domain.
      const path = url.pathname;
      // Remove leading slash if present, as ImageKit path might not expect it
      return path.startsWith('/') ? path.slice(1) : path;
    } catch (error) {
      console.error('[ProductService][getImageKitFileId] Invalid image URL to extract file ID:', { imageUrl, error });
      return null;
    }
  }


  async deleteProduct(id: string, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<{ deleted: boolean }> {
    const session = await this.productModel.db.startSession();
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

      // Find the product first to get its image URL before deletion
      const productToDelete = await this.productModel.findOne({
        _id: new Types.ObjectId(id),
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
      }).session(session).exec();

      if (!productToDelete) {
        console.error('[ProductService][deleteProduct] Product not found for deletion or unauthorized:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      const oldImageFileId = this.getImageKitFileId(productToDelete.imageUrl);

      const result = await session.withTransaction(async () => {
        // Delete the product itself
        const deleteProductResult = await this.productModel.deleteOne({
          _id: new Types.ObjectId(id),
          createdBy: new Types.ObjectId(ownerId),
          store: new Types.ObjectId(storeId),
        }).session(session).exec();

        if (deleteProductResult.deletedCount === 0) {
          // This case should ideally be caught by the productToDelete check above, but for robustness
          throw new NotFoundException('Product not found for deletion or you do not have permission');
        }

        // Remove product reference from the store
        await this.storeModel.updateOne(
          { _id: new Types.ObjectId(storeId) },
          { $pull: { products: new Types.ObjectId(id) } }
        ).session(session).exec();

        // Delete associated product history records
        await this.productHistoryModel.deleteMany({
          product: new Types.ObjectId(id),
          store: new Types.ObjectId(storeId),
        }).session(session).exec();

        return deleteProductResult;
      });


      // --- NEW: Delete associated image from ImageKit (outside transaction) ---
      if (oldImageFileId) {
        try {
          await imagekit.deleteFile(oldImageFileId);
          console.log('[ProductService][deleteProduct] Associated ImageKit image deleted:', { oldImageFileId });
        } catch (imageDeleteError) {
          console.error('[ProductService][deleteProduct] Failed to delete associated ImageKit image:', { oldImageFileId, imageDeleteError });
          // Log the error but do not throw, as the database operations are complete
        }
      }

      console.log('[ProductService][deleteProduct] Product and associated data deleted successfully:', { productId: id });
      return { deleted: true };
    } catch (error) {
      console.error('[ProductService][deleteProduct] Error deleting product:', error);
      // Re-throw specific exceptions
      if (error instanceof UnauthorizedException || error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to delete product');
    } finally {
      session.endSession();
    }
  }

  async supplyProduct(id: string, additionalQuantity: number, ownerId: string, storeId: string, userRole: UserRoleEnum[]): Promise<ProductDocument> {
    const session = await this.productModel.db.startSession();
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

      if (!Types.ObjectId.isValid(id)) {
        console.error('[ProductService][supplyProduct] Invalid product ID:', { id });
        throw new BadRequestException('Invalid product ID');
      }
      if (!Types.ObjectId.isValid(ownerId)) {
        console.error('[ProductService][supplyProduct] Invalid owner ID:', { ownerId });
        throw new BadRequestException('Invalid owner ID');
      }
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][supplyProduct] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }

      const product = await this.productModel
        .findOne({ _id: new Types.ObjectId(id), createdBy: new Types.ObjectId(ownerId), store: new Types.ObjectId(storeId) })
        .session(session)
        .exec();

      if (!product) {
        console.error('[ProductService][supplyProduct] Product not found for supply or unauthorized:', { id, ownerId, storeId });
        throw new NotFoundException('Product not found or you do not have permission');
      }

      if (additionalQuantity <= 0) { // Changed to <= 0, as 0 additional quantity doesn't make sense for 'supply'
        console.error('[ProductService][supplyProduct] Additional quantity must be positive for supply:', { additionalQuantity });
        throw new BadRequestException('Additional quantity must be positive');
      }

      const updatedProduct = await session.withTransaction(async () => {
        product.quantity += additionalQuantity;
        product.updatedAt = new Date();
        await product.save({ session });

        await this.createProductHistory({
          type: 'restock',
          quantity: additionalQuantity,
          product: new Types.ObjectId(product._id.toString()),
          store: new Types.ObjectId(storeId),
          userId: new Types.ObjectId(ownerId),
          notes: 'Product restocked via supply operation',
        }, session);
        return product;
      });


      console.log('[ProductService][supplyProduct] Product supplied successfully:', { productId: id, newQuantity: updatedProduct.quantity });
      return updatedProduct;
    } catch (error) {
      console.error('[ProductService][supplyProduct] Error supplying product:', error);
      if (error instanceof UnauthorizedException || error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to supply product');
    } finally {
      session.endSession();
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

      // Check if product with this code already exists in this store
      const existingProduct = await this.productModel
        .findOne({ code: createProductDto.code, store: storeId })
        .exec();
      if (existingProduct) {
        console.error('[ProductService][scanAndAddProduct] Product code already exists, cannot add new:', {
          code: createProductDto.code,
          productId: existingProduct._id,
        });
        throw new ConflictException(`Product with code ${createProductDto.code} already exists`);
      }

      // If not existing, proceed with standard addProduct logic
      return await this.addProduct(createProductDto, ownerId, storeId, userRole, imageUrl, file);
    } catch (error) {
      console.error('[ProductService][scanAndAddProduct] Error in scan and add product:', error);
      if (error instanceof ConflictException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to scan and add product');
    }
  }



  async checkProductExistenceByCode(
    code: string,
    ownerId: string, // Kept ownerId for validation, but not used in query for broader check
    storeId: string,
  ): Promise<{ exists: boolean; product?: ProductDocument }> {
    try {
      console.log('[ProductService][checkProductExistenceByCode] Checking product existence:', {
        code,
        ownerId,
        storeId,
      });

      if (!code) {
        console.error('[ProductService][checkProductExistenceByCode] Product code is required');
        throw new BadRequestException('Product code is required');
      }
      if (!Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][checkProductExistenceByCode] Invalid store ID:', { storeId });
        throw new BadRequestException('Invalid store ID');
      }
      // Assuming this check is meant to be able to find any product by code within a given store,
      // not necessarily owned by `ownerId`. If it should be owner-specific, add `createdBy: new Types.ObjectId(ownerId)`
      // to the findOne query.
      const product = await this.productModel
        .findOne({ code, store: new Types.ObjectId(storeId) })
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
      console.error('[ProductService][checkProductExistenceByCode] Error checking product existence:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
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
      if (days < 0) {
        console.error('[ProductService][getExpiringProducts] Days cannot be negative:', { days });
        throw new BadRequestException('Days for expiry window cannot be negative');
      }

      const today = new Date();
      // Set to start of day to cover full day
      today.setHours(0, 0, 0, 0);

      const expiryThreshold = new Date();
      expiryThreshold.setDate(today.getDate() + days);
      // Set to end of day to include products expiring throughout the last day
      expiryThreshold.setHours(23, 59, 59, 999);


      const query = {
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
        expiryDate: { $gte: today, $lte: expiryThreshold }, // Products expiring from today up to 'days' from now
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
      console.error('[ProductService][getExpiringProducts] Error fetching expiring products:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
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
      if (threshold < 0) {
        console.error('[ProductService][getLowStockProducts] Threshold cannot be negative:', { threshold });
        throw new BadRequestException('Stock threshold cannot be negative');
      }

      const query = {
        createdBy: new Types.ObjectId(ownerId),
        store: new Types.ObjectId(storeId),
        quantity: { $lte: threshold, $gt: 0 }, // Products with quantity less than or equal to threshold, but greater than 0
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
      console.error('[ProductService][getLowStockProducts] Error fetching low stock products:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to fetch low stock products');
    }
  }

  async getTotalStock(ownerId: string, storeId: string): Promise<{ totalQuantity: number; totalValue: number }> {
    try {
      console.log('[ProductService][getTotalStock] Calculating total stock and value:', { ownerId, storeId });

      if (!Types.ObjectId.isValid(ownerId) || !Types.ObjectId.isValid(storeId)) {
        console.error('[ProductService][getTotalStock] Invalid input:', { ownerId, storeId });
        throw new BadRequestException('Invalid ownerId or storeId');
      }

      // Aggregate to sum quantities and calculate total value
      const aggregationResult = await this.productModel.aggregate([
        {
          $match: {
            createdBy: new Types.ObjectId(ownerId),
            store: new Types.ObjectId(storeId),
            quantity: { $gt: 0 } // Only count products currently in stock
          }
        },
        {
          $group: {
            _id: null, // Group all matching documents into a single group
            totalQuantity: { $sum: '$quantity' },
            // Assuming `price` is the selling price and `costPrice` is the cost.
            // Using `price` for total value calculation for sales/inventory valuation.
            totalValue: { $sum: { $multiply: ['$quantity', '$price'] } }
          }
        }
      ]).exec();

      // Extract results, default to 0 if no products found
      const totalQuantity = aggregationResult.length > 0 ? aggregationResult[0].totalQuantity : 0;
      const totalValue = aggregationResult.length > 0 ? aggregationResult[0].totalValue : 0;

      console.log('[ProductService][getTotalStock] Total stock calculated:', { totalQuantity, totalValue });

      // The frontend's `connect().get('products/total-stock/$storeId')` that expects `response.data['data']`
      // implies that the controller might wrap this service's return in a `data` field.
      // So, the service should return the raw object, and the controller handles the wrapping.
      return { totalQuantity, totalValue };
    } catch (error) {
      console.error('[ProductService][getTotalStock] Error calculating total stock:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to calculate total stock.');
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

      // --- FIX: Use aggregation for efficiency and accuracy ---
      const aggregationResult = await this.productModel.aggregate([
        {
          $match: {
            createdBy: new Types.ObjectId(ownerId),
            store: new Types.ObjectId(storeId),
            quantity: { $gt: 0 } // Only consider products currently in stock
          }
        },
        {
          $group: {
            _id: null, // Group all matching documents into a single result
            totalQuantity: { $sum: '$quantity' },
            // Sum of quantity * selling price
            totalSellingPrice: { $sum: { $multiply: ['$quantity', '$price'] } },
            // Sum of quantity * cost price. Use $ifNull to handle cases where costPrice might be undefined/null.
            totalCost: { $sum: { $multiply: ['$quantity', { $ifNull: ['$costPrice', 0] }] } }
          }
        }
      ]).exec();

      // Extract results, default to 0 if no products found or aggregation returns empty array
      const summary = aggregationResult.length > 0 ? aggregationResult[0] : { totalQuantity: 0, totalSellingPrice: 0, totalCost: 0 };

      // Ensure fixed decimal places for monetary values for consistency
      // Note: For critical financial data, consider storing/calculating as integers (e.g., cents)
      // or using a dedicated library like 'decimal.js' to avoid floating-point issues.
      const totalCost = parseFloat(summary.totalCost.toFixed(2));
      const totalSellingPrice = parseFloat(summary.totalSellingPrice.toFixed(2));
      const totalQuantity = summary.totalQuantity;

      console.log('[ProductService][getInventorySummary] Summary fetched:', {
        totalCost,
        totalSellingPrice,
        totalQuantity,
      });

      return {
        totalCost,
        totalSellingPrice,
        totalQuantity,
      };
    } catch (error) {
      console.error('[ProductService][getInventorySummary] Error fetching inventory summary:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
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
    totalQuantity: number; // This comes from getTotalStock
    totalSellingPrice?: number; // Add these fields to align with total inventory overview
    totalCost?: number; // Add these fields to align with total inventory overview
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

      // Fetch all three concurrently for efficiency
      const [expiring, lowStock, inventorySummary] = await Promise.all([
        this.getExpiringProducts(ownerId, storeId, expiryDays, page, limit),
        this.getLowStockProducts(ownerId, storeId, stockThreshold, page, limit),
        this.getInventorySummary(ownerId, storeId) // Use the improved getInventorySummary
      ]);

      console.log('[ProductService][getExpiringAndLowStockProducts] Data fetched:', {
        expiringCount: expiring.total,
        lowStockCount: lowStock.total,
        totalQuantity: inventorySummary.totalQuantity,
        totalSellingPrice: inventorySummary.totalSellingPrice,
        totalCost: inventorySummary.totalCost,
      });

      return {
        expiringProducts: expiring,
        lowStockProducts: lowStock,
        totalQuantity: inventorySummary.totalQuantity,
        totalSellingPrice: inventorySummary.totalSellingPrice,
        totalCost: inventorySummary.totalCost,
      };
    } catch (error) {
      console.error('[ProductService][getExpiringAndLowStockProducts] Error fetching expiring and low stock products:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to fetch expiring and low stock products');
    }
  }

  async getProductByCode(code: string, storeId: string, user: User): Promise<Product> {
    if (!Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    // This method is intentionally scoped to products created by the specific user in the given store.
    const product = await this.productModel.findOne({ code, store: storeId, createdBy: user._id }).exec();
    if (!product) {
      throw new NotFoundException(`Product with code ${code} not found in store ${storeId} for this user`);
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
        console.error('[ProductService][sendOutProduct] Invalid input: Product code and positive quantity are required', { productCode: dto.productCode, quantity: dto.quantity });
        throw new BadRequestException('Product code and positive quantity are required');
      }

      // Check if the store exists and if the owner has permission for it.
      // For general product movement, finding just the store is enough.
      // Owner-store relationship might be implicitly handled by permissions at controller level.
      const store = await this.storeModel.findOne({ _id: new Types.ObjectId(storeId) }).exec();
      if (!store) {
        console.error('[ProductService][sendOutProduct] Store not found:', { storeId });
        throw new NotFoundException('Store not found');
      }

      // Find product within the specific store, no owner filter here for flexibility if product can be sent out by anyone with store access
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
        throw new BadRequestException(`Insufficient quantity for product ${dto.productCode}. Available: ${product.quantity}`);
      }

      if (dto.deliveryAgentId) {
        if (!Types.ObjectId.isValid(dto.deliveryAgentId)) {
          console.error('[ProductService][sendOutProduct] Invalid delivery agent ID format:', { deliveryAgentId: dto.deliveryAgentId });
          throw new BadRequestException('Invalid delivery agent ID format');
        }
        // Assuming deliveriesModel is for Delivery Agents and they are linked to a store
        const deliveryAgent = await this.deliveriesModel
          .findOne({ _id: new Types.ObjectId(dto.deliveryAgentId), store: new Types.ObjectId(storeId) })
          .exec();
        if (!deliveryAgent) {
          console.error('[ProductService][sendOutProduct] Delivery agent not found or not associated with this store:', { deliveryAgentId: dto.deliveryAgentId, storeId });
          throw new NotFoundException('Delivery agent not found or not associated with this store');
        }
      }

      const session = await this.productModel.db.startSession();
      try {
        const result = await session.withTransaction(async () => {
          product.quantity -= dto.quantity;
          product.updatedAt = new Date();
          await product.save({ session });

          // History is created using the service's internal method
          await this.createProductHistory({
            type: 'sent_out',
            quantity: dto.quantity,
            product: new Types.ObjectId(product._id.toString()),
            store: new Types.ObjectId(storeId),
            userId: new Types.ObjectId(ownerId), // userId is the user performing the action
            deliveryAgentId: dto.deliveryAgentId ? new Types.ObjectId(dto.deliveryAgentId) : undefined,
            notes: dto.notes || 'Product sent out of store',
          }, session); // Pass session to history creation

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
      console.error('[ProductService][sendOutProduct] Error sending out product:', error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error; // Re-throw specific exceptions as they are
      }
      throw new BadRequestException(error.message || 'Failed to send out product');
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
        console.error('[ProductService][receiveProduct] Invalid input: Product code and positive quantity are required', { productCode: dto.productCode, quantity: dto.quantity });
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

      if (dto.deliveryAgentId) {
        if (!Types.ObjectId.isValid(dto.deliveryAgentId)) {
          console.error('[ProductService][receiveProduct] Invalid delivery agent ID format:', { deliveryAgentId: dto.deliveryAgentId });
          throw new BadRequestException('Invalid delivery agent ID format');
        }
        const deliveryAgent = await this.deliveriesModel
          .findOne({ _id: new Types.ObjectId(dto.deliveryAgentId), store: new Types.ObjectId(storeId) })
          .exec();
        if (!deliveryAgent) {
          console.error('[ProductService][receiveProduct] Delivery agent not found or not associated with this store:', { deliveryAgentId: dto.deliveryAgentId, storeId });
          throw new NotFoundException('Delivery agent not found or not associated with this store');
        }
      }

      const session = await this.productModel.db.startSession();
      try {
        const result = await session.withTransaction(async () => {
          product.quantity += dto.quantity;
          product.updatedAt = new Date();
          await product.save({ session });

          // History is created using the service's internal method
          await this.createProductHistory({
            type: 'received',
            quantity: dto.quantity,
            product: new Types.ObjectId(product._id.toString()),
            store: new Types.ObjectId(storeId),
            userId: new Types.ObjectId(ownerId), // userId is the user performing the action
            deliveryAgentId: dto.deliveryAgentId ? new Types.ObjectId(dto.deliveryAgentId) : undefined,
            notes: dto.notes || 'Product received into store',
          }, session); // Pass session to history creation

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
      console.error('[ProductService][receiveProduct] Error receiving product:', error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to receive product');
    }
  }

  async uploadProductImage(
    productId: string,
    storeId: string,
    ownerId: string,
    file?: Express.Multer.File,
    imageUrl?: string
  ): Promise<ProductDocument> {
    console.log('[ProductService][uploadProductImage] Attempting to upload/update product image:', { productId, storeId, ownerId, hasFile: !!file, hasImageUrl: !!imageUrl });

    if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(storeId) || !Types.ObjectId.isValid(ownerId)) {
      console.error('[ProductService][uploadProductImage] Invalid input: Invalid product ID, store ID, or owner ID');
      throw new BadRequestException('Invalid product ID, store ID, or owner ID');
    }

    if (!file && !imageUrl) {
      console.error('[ProductService][uploadProductImage] No file or URL provided for image upload');
      throw new BadRequestException('Either an image file or URL must be provided');
    }

    const session = await this.productModel.db.startSession();
    try {
      const product = await this.productModel
        .findOne({ _id: productId, store: storeId, createdBy: ownerId })
        .session(session)
        .exec();
      if (!product) {
        console.error('[ProductService][uploadProductImage] Product not found or unauthorized for image upload');
        throw new NotFoundException('Product not found or you do not have permission');
      }

      // --- FIX: Store old image URL before any modification ---
      const oldImageUrl = product.imageUrl;
      const oldImageFileId = this.getImageKitFileId(oldImageUrl);

      let finalImageUrl: string | undefined;
      if (file) {
        this.validateImageFile(file); // Validate file type and size
        try {
          const uploadResponse = await imagekit.upload({
            file: file.buffer,
            fileName: `product_${productId}_${Date.now()}.${file.mimetype.split('/')[1]}`,
            folder: '/product_images',
          });
          finalImageUrl = uploadResponse.url;
          console.log('[ProductService][uploadProductImage] New file uploaded:', { newUrl: finalImageUrl });
        } catch (uploadError) {
          console.error('[ProductService][uploadProductImage] Failed to upload new file to ImageKit. Proceeding without new image:', uploadError);
          finalImageUrl = oldImageUrl; // Keep old image if new upload fails
        }
      } else if (imageUrl) {
        if (!isURL(imageUrl)) {
          console.error('[ProductService][uploadProductImage] Invalid image URL provided:', { imageUrl });
          throw new BadRequestException('Invalid image URL');
        }
        // Only re-upload if the provided URL is different from the existing one
        if (imageUrl !== oldImageUrl) {
          try {
            const imageBuffer = await this.downloadImage(imageUrl);
            const uploadResponse = await imagekit.upload({
              file: imageBuffer,
              fileName: `product_${productId}_${Date.now()}.jpg`,
              folder: '/product_images',
            });
            finalImageUrl = uploadResponse.url;
            console.log('[ProductService][uploadProductImage] External URL image uploaded:', { newUrl: finalImageUrl });
          } catch (downloadOrUploadError) {
            console.error('[ProductService][uploadProductImage] Failed to download or upload external image. Proceeding without new image:', downloadOrUploadError);
            finalImageUrl = oldImageUrl; // Keep old image if new upload fails
          }
        } else {
          finalImageUrl = oldImageUrl; // URL is the same, no change needed
        }
      } else { // Case where both file and imageUrl are null/undefined, and image needs to be removed
        finalImageUrl = undefined;
        console.log('[ProductService][uploadProductImage] Image explicitly set to be removed.');
      }


      // Start transaction to update product in DB
      const result = await session.withTransaction(async () => {
        product.imageUrl = finalImageUrl;
        product.updatedAt = new Date(); // Update timestamp
        await product.save({ session });
        return product;
      });

      // --- FIX: Delete old image if a new one was successfully applied and it's different ---
      // This logic applies if `oldImageFileId` exists AND the `finalImageUrl` is genuinely different from the `oldImageUrl`.
      // It also covers the case where `finalImageUrl` becomes `undefined` (image removed).
      if (oldImageFileId && finalImageUrl !== oldImageUrl) {
        try {
          await imagekit.deleteFile(oldImageFileId);
          console.log('[ProductService][uploadProductImage] Old image deleted from ImageKit:', { oldImageFileId });
        } catch (deleteError) {
          console.error('[ProductService][uploadProductImage] Failed to delete old image from ImageKit:', { oldImageFileId, deleteError });
          // Log the error but do not throw, as the product update is complete
        }
      }

      console.log('[ProductService][uploadProductImage] Product image operation completed:', { productId, finalImageUrl });
      return result;
    } catch (error) {
      console.error('[ProductService][uploadProductImage] Error during product image operation:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to upload product image');
    } finally {
      session.endSession();
    }
  }
}