const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // 指定测试文件的位置和模式
  testDir: './',
  testMatch: '**/*.spec.js',
  
  // 测试运行器配置
  workers: 1,  // 由于使用 WebRTC，限制为单个worker
  timeout: 30000,  // 30 秒超时
  
  // 浏览器配置
  use: {
    headless: false,  // 显示浏览器窗口
    viewport: { width: 1280, height: 720 },
    video: 'on-first-retry',
    permissions: ['camera', 'microphone'],  // 自动授予媒体权限
    actionTimeout: 10000,  // 动作超时时间
  },

  // 本地开发服务器配置
  webServer: {
    command: 'cd ../backend && go run main.go',
    port: 8080,  // 服务器端口
    reuseExistingServer: !process.env.CI,
    timeout: 5000,  // 服务器启动超时时间
  },

  // 报告配置
  reporter: [
    ['list'],  // 在控制台显示测试结果
    ['html', { open: 'never' }]  // 生成HTML报告但不自动打开
  ],
});
