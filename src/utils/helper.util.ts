import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ENVIRONMENT } from 'src/common/config/environment';

const encryptionKeyFromEnv = ENVIRONMENT.APP.ENCRYPTION_KEY;

export class BaseHelper {
  static generateRandomString(length = 6) {
    return randomBytes(length).toString('hex');
  }

  static async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 12);
  }


  static async compareHashedData(data: string, hashed: string): Promise<boolean> {
    try {
      const result = await bcrypt.compare(data, hashed);
      console.log("bcrypt compare result:", result);
      return result;
    } catch (error) {
      console.error("bcrypt compare error: ", error);
      return false;
    }
  }

  static generateOTP(): number {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  }

  static isValidFileNameAwsUpload = (fileName: string) => {
    const regex = /^[a-zA-Z0-9_\-/]+\/[a-zA-Z0-9_\-]+(?:\.(jpg|png|jpeg))$/;
    return regex.test(fileName);
  };

  static encryptData(
    data: string,
    encryptionKey: string = encryptionKeyFromEnv,
  ): string {
    const iv = randomBytes(16); // Generate a 16-byte IV
    const cipher = createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey),
      iv,
    );

    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    return iv.toString('hex') + ':' + encryptedData;
  }

  static decryptData(
    encryptedData: string,
    encryptionKey: string = encryptionKeyFromEnv,
  ): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey),
      iv,
    );
    let decryptedData = decipher.update(encryptedText, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
  }

  static generateEncryptionKey(): string {
    const keyBytes = randomBytes(16);
    const encryptionKey = keyBytes.toString('hex');
    return encryptionKey;
  }

  static generateFileName(folderName = 'uploads', mimetype: string) {
    const timeStampInMilliSeconds = Date.now();
    const randomString = crypto.randomUUID();
    return `${folderName}/${randomString}-${timeStampInMilliSeconds}.${mimetype.split('/')[1]}`;
  }

  static generateRandomStringForRef(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}
