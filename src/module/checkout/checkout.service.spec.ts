import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Product } from '../product/schema/product.schema';
import { Checkout } from './schema/checkout.schema';
import { NotificationService } from '../notification/notification.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/user.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UserRoleEnum } from 'src/common/enums/user.enum';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

function chainableQuery(resolvedValue: any) {
  return {
    session: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
  };
}

describe('CheckoutService', () => {
  let service: CheckoutService;
  let productModel: any;
  let checkoutModel: any;
  let storeModel: any;
  let firebaseService: {
    updateProductStock: jest.Mock;
    trackOrderStatus: jest.Mock;
    sendNotification: jest.Mock;
  };
  let invoiceService: { generateInvoice: jest.Mock };
  let emailService: { sendInvoice: jest.Mock };
  let notificationService: { sendOrderNotification: jest.Mock };

  const storeId = new Types.ObjectId().toString();
  const user: any = {
    _id: new Types.ObjectId(),
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role: [UserRoleEnum.STORE_OWNER],
  };

  const baseDto: CreateCheckoutDto = {
    cart: [{ code: 'RICE-001', quantity: 2 }],
    paymentMethod: 'CASH' as any,
    storeId,
  } as CreateCheckoutDto;

  beforeEach(async () => {
    storeModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    productModel = {
      findOne: jest.fn(),
      db: {
        model: jest.fn().mockReturnValue(storeModel),
      },
    };

    checkoutModel = {
      create: jest.fn(),
      db: {
        startSession: jest.fn().mockResolvedValue({
          withTransaction: jest.fn(async (fn: () => Promise<any>) => fn()),
          endSession: jest.fn(),
        }),
      },
    };

    firebaseService = {
      updateProductStock: jest.fn().mockResolvedValue(undefined),
      trackOrderStatus: jest.fn().mockResolvedValue(undefined),
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };
    invoiceService = {
      generateInvoice: jest.fn().mockResolvedValue('/invoices/test.pdf'),
    };
    emailService = { sendInvoice: jest.fn().mockResolvedValue(undefined) };
    notificationService = {
      sendOrderNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: getModelToken(Checkout.name), useValue: checkoutModel },
        { provide: NotificationService, useValue: notificationService },
        { provide: InvoiceService, useValue: invoiceService },
        { provide: EmailService, useValue: emailService },
        { provide: FirebaseService, useValue: firebaseService },
        { provide: UserService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckout', () => {
    it('throws BadRequestException for an empty cart', async () => {
      await expect(
        service.createCheckout({ ...baseDto, cart: [] }, user),
      ).rejects.toThrow(BadRequestException);

      expect(checkoutModel.db.startSession).not.toHaveBeenCalled();
    });

    it('creates the checkout with mocked productModel and checkoutModel', async () => {
      storeModel.findOne.mockReturnValue(
        chainableQuery({ _id: storeId, owner: user._id.toString() }),
      );

      const product = {
        code: 'RICE-001',
        price: 100,
        quantity: 10,
        name: 'Bag of Rice',
        toObject() {
          return this;
        },
        save: jest.fn().mockResolvedValue(undefined),
      };
      productModel.findOne.mockReturnValue(chainableQuery(product));

      const createdCheckout = {
        _id: new Types.ObjectId(),
        cartItems: [{ code: 'RICE-001', quantity: 2, subtotal: 200, product }],
        totalPrice: 200,
        totalPriceWithTax: 200,
        customerName: 'Ada Lovelace',
        paymentMethod: 'CASH',
        deliveryAddress: 'Not provided',
      };
      checkoutModel.create.mockResolvedValue([createdCheckout]);

      const result = await service.createCheckout(baseDto, user);

      expect(result.checkout).toBe(createdCheckout);
      expect(checkoutModel.create).toHaveBeenCalledTimes(1);
      expect(notificationService.sendOrderNotification).toHaveBeenCalledWith(
        user._id.toString(),
        createdCheckout,
      );
    });
  });
});
