import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';

@Injectable()
export class InvoiceService {
  async generateInvoice(orderData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const filePath = `./invoices/Invoice_${orderData.orderId}.pdf`;
      const doc = new PDFDocument();

      // Create a write stream for the PDF
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add header
      doc.fontSize(20).text('Invoice', { align: 'center' });
      doc.moveDown();

      // Order details
      doc.fontSize(14).text(`Order ID: ${orderData.orderId}`);
      doc.text(`Customer: ${orderData.customerName}`);
      doc.text(`Payment Method: ${orderData.paymentMethod}`);
      doc.text(`Total Price: $${orderData.totalPrice}`);
      doc.text(`Delivery Address: ${orderData.deliveryAddress}`);
      doc.moveDown();

      // Add items
      doc.fontSize(16).text('Order Items:', { underline: true });
      doc.moveDown();

      orderData.items.forEach((item, index) => {
        doc
          .fontSize(14)
          .text(
            `${index + 1}. ${item.name} - ${item.quantity} x $${item.price}`,
          );
      });

      // Footer
      doc.moveDown();
      doc.fontSize(12).text('Thank you for your order!', { align: 'center' });

      // Finalize PDF
      doc.end();

      // Resolve promise once the PDF is written
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }
}
