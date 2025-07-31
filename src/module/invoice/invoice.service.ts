// import { Injectable, Logger } from '@nestjs/common';
// import * as PDFDocument from 'pdfkit';
// import * as fs from 'fs';
// import * as path from 'path';

// @Injectable()
// export class InvoiceService {
//   private readonly logger = new Logger(InvoiceService.name);

//   async generateInvoice(orderData: any): Promise<string> {
//     return new Promise((resolve, reject) => {
//       if (!orderData || !orderData.orderId) {
//         this.logger.error('Order ID is undefined in orderData:', orderData);
//         return reject(new Error('Order ID is undefined.'));
//       }

//       const filePath = `./invoices/Invoice_${orderData.orderId}.pdf`;
//       const absoluteFilePath = path.resolve(filePath);
//       const directoryPath = path.dirname(absoluteFilePath);

//       // Create the directory if it doesn't exist
//       if (!fs.existsSync(directoryPath)) {
//         fs.mkdirSync(directoryPath, { recursive: true });
//         this.logger.log(`Created directory: ${directoryPath}`);
//       }

//       const doc = new PDFDocument();

//       const stream = fs.createWriteStream(filePath);
//       doc.pipe(stream);

//       // Add header
//       doc.fontSize(20).text('Invoice', { align: 'center' });
//       doc.moveDown();

//       // Order details
//       doc.fontSize(14).text(`Order ID: ${orderData.orderId}`);
//       doc.text(`Customer: ${orderData.customerName}`);
//       doc.text(`Payment Method: ${orderData.paymentMethod}`);
//       doc.text(`Total Price: $${orderData.totalPrice}`);
//       doc.text(`Delivery Address: ${orderData.deliveryAddress}`);
//       doc.moveDown();

//       // Add items
//       if (orderData.items && Array.isArray(orderData.items)) {
//         doc.fontSize(16).text('Order Items:', { underline: true });
//         doc.moveDown();

//         orderData.items.forEach((item, index) => {
//           doc
//             .fontSize(14)
//             .text(
//               `${index + 1}. ${item.name} - ${item.quantity} x $${item.price}`,
//             );
//         });
//       } else {
//         this.logger.error('Items array is undefined or not an array:', orderData);
//         doc.fontSize(14).text('No items found for this order.');
//       }

//       // Footer
//       doc.moveDown();
//       doc.fontSize(12).text('Thank you for your order!', { align: 'center' });

//       // Finalize PDF
//       doc.end();

//       // Resolve promise once the PDF is written
//       stream.on('finish', () => resolve(filePath));
//       stream.on('error', reject);
//     });
//   }
// }

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  async generateInvoice(orderData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!orderData || !orderData.orderId) {
        this.logger.error('Order ID is undefined in orderData:', orderData);
        return reject(new BadRequestException('Order ID is undefined.'));
      }

      if (typeof orderData.totalPrice !== 'number') {
        this.logger.error('totalPrice is not a number:', orderData.totalPrice);
        return reject(new BadRequestException('totalPrice must be a number.'));
      }

      const filePath = `./invoices/Invoice_${orderData.orderId}.pdf`;
      const absoluteFilePath = path.resolve(filePath);
      const directoryPath = path.dirname(absoluteFilePath);

      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        this.logger.log(`Created directory: ${directoryPath}`);
      }

      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(20).text('Invoice', { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text(`Order ID: ${orderData.orderId}`);
      doc.text(`Customer: ${orderData.customerName || 'Unknown'}`);
      doc.text(`Payment Method: ${orderData.paymentMethod || 'Not provided'}`);
      doc.text(`Total Price: ₦${orderData.totalPrice.toFixed(2)}`);
      doc.text(`Delivery Address: ${orderData.deliveryAddress || 'Not provided'}`);
      doc.moveDown();

      if (orderData.items && Array.isArray(orderData.items)) {
        doc.fontSize(16).text('Order Items:', { underline: true });
        doc.moveDown();

        orderData.items.forEach((item, index) => {
          if (typeof item.price !== 'number') {
            this.logger.error(`Item price is not a number for item ${item.name}:`, item.price);
            return reject(new BadRequestException(`Price for item ${item.name} must be a number.`));
          }
          doc.fontSize(14).text(`${index + 1}. ${item.name} - ${item.quantity} x ₦${item.price.toFixed(2)}`);
        });
      } else {
        this.logger.error('Items array is undefined or not an array:', orderData);
        doc.fontSize(14).text('No items found for this order.');
      }

      doc.moveDown();
      doc.fontSize(12).text('Thank you for your order!', { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }
}