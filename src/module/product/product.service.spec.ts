import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './schema/product.schema';
import { ProductHistory } from './schema/product-history.schema';
import { Store } from '../store/schema/store.schema';
import { Deliveries } from '../deliveries/schema/deliveries.schema';
import { ProductCategoriesService } from '../product-category/product-category.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UserRoleEnum } from 'src/common/enums/user.enum';

function chainableQuery(resolvedValue: any) {
  return {
    session: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
  };
}

function createModelMock() {
  const model: any = jest.fn().mockImplementation(function (
    this: any,
    data: any,
  ) {
    Object.assign(this, data);
    this._id = new Types.ObjectId();
    this.save = jest.fn().mockResolvedValue(this);
  });
  model.findOne = jest.fn();
  model.findById = jest.fn();
  model.updateOne = jest.fn();
  model.db = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: jest.fn(async (fn: () => Promise<any>) => fn()),
      endSession: jest.fn(),
    }),
  };
  return model;
}

describe('ProductService', () => {
  let service: ProductService;
  let productModel: ReturnType<typeof createModelMock>;
  let productHistoryModel: ReturnType<typeof createModelMock>;
  let storeModel: any;
  let categoryService: { findOrCreate: jest.Mock };

  const ownerId = new Types.ObjectId().toString();
  const storeId = new Types.ObjectId().toString();

  const baseDto: CreateProductDto = {
    name: 'Bag of Rice',
    price: 100,
    quantity: 5,
    code: 'RICE-001',
  } as CreateProductDto;

  beforeEach(async () => {
    productModel = createModelMock();
    productHistoryModel = createModelMock();
    storeModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
    };
    categoryService = { findOrCreate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getModelToken(Product.name), useValue: productModel },
        {
          provide: getModelToken(ProductHistory.name),
          useValue: productHistoryModel,
        },
        { provide: getModelToken(Store.name), useValue: storeModel },
        { provide: getModelToken(Deliveries.name), useValue: {} },
        { provide: ProductCategoriesService, useValue: categoryService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addProduct', () => {
    it('throws BadRequestException for an invalid store id', async () => {
      await expect(
        service.addProduct(baseDto, ownerId, 'not-a-valid-id', [
          UserRoleEnum.STORE_OWNER,
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(storeModel.findOne).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the product code already exists in the store', async () => {
      storeModel.findOne.mockReturnValue(
        chainableQuery({ _id: storeId, owner: ownerId }),
      );
      productModel.findOne.mockReturnValue(
        chainableQuery({ _id: new Types.ObjectId(), code: baseDto.code }),
      );

      await expect(
        service.addProduct(baseDto, ownerId, storeId, [
          UserRoleEnum.STORE_OWNER,
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the product and its initial history entry on success', async () => {
      storeModel.findOne.mockReturnValue(
        chainableQuery({ _id: storeId, owner: ownerId }),
      );
      storeModel.updateOne.mockReturnValue(
        chainableQuery({ acknowledged: true }),
      );
      productModel.findOne.mockReturnValue(chainableQuery(null));

      const result = await service.addProduct(baseDto, ownerId, storeId, [
        UserRoleEnum.STORE_OWNER,
      ]);

      expect(result).toBeDefined();
      expect(result.name).toBe(baseDto.name);
      expect(productModel).toHaveBeenCalledTimes(1);
      expect(productHistoryModel).toHaveBeenCalledTimes(1);
      expect(storeModel.updateOne).toHaveBeenCalledWith(
        { _id: storeId },
        { $push: { products: result._id } },
      );
    });
  });
});
