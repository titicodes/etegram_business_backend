import * as dotenv from 'dotenv';
import env from './env.config';
dotenv.config();

export interface IEnvironment {
  APP: {
    NAME: string;
    PORT: number | string;
    ENV: string;
    ENCRYPTION_KEY: string;
  };
  DB: {
    URL: string;
  };
  JWT: {
    SECRET: string;
  };
  MAILER: {
    SMTP: string;
    HOST: string;
    PORT: string;
    EMAIL: string;
    PASSWORD: string;
  };
  REDIS: {
    URL: string;
  };
  AWS: {
    ACCOUNT_ID: string;
    REGION: string;
    ACCESS_KEY: string;
    SECRET: string;
    BUCKET_NAME: string;
    BUCKET_URL: string;
  };
}

export const ENVIRONMENT: IEnvironment = {
  APP: {
    NAME: process.env.APP_NAME,
    PORT: process.env.PORT,
    ENV: process.env.ENV,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  },
  DB: {
    URL: process.env.DB_URL,
  },
  JWT: {
    SECRET: process.env.JWT_SECRET,
  },
  MAILER: {
    SMTP: process.env.SMTP,
    HOST: process.env.HOST,
    PORT: process.env.PORT,
    EMAIL: process.env.EMAIL,
    PASSWORD: process.env.PASSWORD,
  },
  REDIS: {
    URL: process.env.REDIS_URL,
  },
  AWS: {
    ACCOUNT_ID: process.env.AWS_ACCOUNT_ID,
    REGION: process.env.AWS_REGION,
    ACCESS_KEY: process.env.AWS_ACCESS_KEY,
    SECRET: process.env.AWS_SECRET,
    BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    BUCKET_URL: process.env.AWS_BUCKET_URL,
  },
};

/**
 * @returns true if the current process is running in a test environment.
 */
export const isTest = (): boolean => {
  return env.environment === 'test';
};
