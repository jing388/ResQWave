const { defineConfig } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  retries: 0,
  workers: 1, // Run tests serially to avoid token expiration issues
  use: {
    baseURL: 'http://127.0.0.1:5000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'cross-env NODE_ENV=test node src/index.js',
    port: 5000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});