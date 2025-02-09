const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    video: 'on-first-retry',
    permissions: ['camera', 'microphone'],
  },
  webServer: {
    command: 'cd ../backend && go run main.go',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
