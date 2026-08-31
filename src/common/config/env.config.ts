import * as dotenv from 'dotenv';
import * as envVar from 'env-var';

dotenv.config();

const env = {
  jwtSecret: envVar.get('JWT_SECRET').required().asString(),
  expiresIn: envVar.get('JWT_DURATION').asString() ?? '1 year',
  dbUrl: envVar.get('DB_URL').required().asString(),
  port: envVar.get('PORT').asInt() ?? 3000,
  dbLogging: envVar.get('DATABASE_LOGGING').asBool(),
  docsPassword: envVar.get('DOCS_PASSWORD').required().asString(),
  redisUrl: envVar.get('REDIS_URL').required().asString(),
  //mailgunApiKey: envVar.get("MAILGUN_API_KEY").required().asString(),
  // mailgunDomain: envVar.get("MAILGUN_DOMAIN").required().asString(),
  appName: envVar.get('APP_NAME').required().asString(),
  environment: envVar.get('NODE_ENV').required().asString(),
  paystack: {
    baseUrl: envVar.get('PAYSTACK_BASE_URL').asString(),
    productionApiKey: envVar.get('PAYSTACK_PRODUCTION_API_KEY').asString(),
    testApiKey: envVar.get('PAYSTACK_TEST_API_KEY').asString(),
    testSecretKey: envVar.get('PAYSTACK_LIVE_SECRET_KEY').asString(),
  },
  vtpass: {
    baseUrl: envVar.get('VTPASS_URL_DEV').asString(),
    apikey: envVar.get('VTPSS_SANDBOX_API_KEY').asString(),
    secreteKey: envVar.get('VTPSS_SANDBOX_SECRET_KEY').asString(),
    publicKey: envVar.get('VTPSS_SANDBOX_PUBLIC_KEY').asString(),
  },
};

export default env;
