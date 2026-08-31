import * as dotenv from 'dotenv';
import * as path from 'path';

// Populates process.env with dummy values before any module (including
// src/common/config/env.config.ts, which reads required env vars at
// import time) is loaded, so unit tests can run without a real .env file.
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
