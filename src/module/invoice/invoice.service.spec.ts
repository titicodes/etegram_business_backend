import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { storage } from '../../firebase/firebase.config';
import { v4 as uuidv4 } from 'uuid';
import * as stream from 'stream';

@Injectable()
export class InvoiceService {
  async generateInvoice(orderData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileName = `invoices/Invoice_${orderData.orderId}.pdf`;
      const fileRef = storage.file(fileName);

      const bufferStream = new stream.PassThrough();
      const doc = new PDFDocument();

      // Pipe PDF to buffer stream
      doc.pipe(bufferStream);
      doc.fontSize(20).text('Invoice', { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text(`Order ID: ${orderData.orderId}`);
      doc.text(`Customer: ${orderData.customerName}`);
      doc.text(`Payment Method: ${orderData.paymentMethod}`);
      doc.text(`Total Price: $${orderData.totalPrice}`);
      doc.text(`Delivery Address: ${orderData.deliveryAddress}`);
      doc.moveDown();

      doc.fontSize(16).text('Order Items:', { underline: true });
      doc.moveDown();

      orderData.items.forEach((item, index) => {
        doc
          .fontSize(14)
          .text(
            `${index + 1}. ${item.name} - ${item.quantity} x $${item.price}`,
          );
      });

      doc.moveDown();
      doc.fontSize(12).text('Thank you for your order!', { align: 'center' });

      doc.end();

      // Upload to Firebase
      const uploadStream = fileRef.createWriteStream({
        metadata: {
          contentType: 'application/pdf',
        },
      });

      bufferStream.pipe(uploadStream);

      uploadStream.on('finish', async () => {
        // Generate public URL
        const publicUrl = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-01-2030', // Set an appropriate expiration date
        });

        resolve(publicUrl[0]);
      });

      uploadStream.on('error', reject);
    });
  }
}
