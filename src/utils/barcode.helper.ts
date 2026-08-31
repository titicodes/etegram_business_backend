import * as QRCode from 'qrcode';
import { Logger } from '@nestjs/common';

const logger = new Logger('BarcodeHelper');

export async function generateBarcode2D(text: string) {
  try {
    const generateQR = await QRCode.toDataURL(text);
    const url = await QRCode.toString(text, { type: 'png' });
    return {
      codeUrl: url,
      codeBase64: generateQR,
    };
  } catch (error) {
    logger.error(`Error generating barcode: ${error.message}`, error.stack);
    throw error;
  }
}
