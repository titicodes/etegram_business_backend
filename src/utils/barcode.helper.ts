import * as QRCode from 'qrcode';

export async function generateBarcode2D(text: string) {
  try {
    const generateQR = await QRCode.toDataURL(text);
    const url = await QRCode.toString(text, { type: 'png' });
    return {
      codeUrl: url,
      codeBase64: generateQR,
    };
  } catch (error) {
    console.error(`Error generating barcode: ${error.message}`);
    throw error;
  }
}
