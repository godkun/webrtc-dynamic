# WebRTC 动态发送接收演示

本项目展示了如何使用 Go 后端和原生 JavaScript 前端实现 WebRTC 发送器和接收器的动态修改功能。

## 项目结构

```
webrtc-dynamic/
├── frontend/          # 前端代码
│   ├── index.html    # 页面布局
│   └── main.js       # WebRTC 实现
├── backend/          # 后端代码
│   ├── go.mod       # Go 依赖管理
│   └── main.go      # 服务器实现
└── tests/           # 测试代码
    ├── test_webrtc.js        # WebRTC 测试用例
    ├── playwright.config.js   # Playwright 配置
    └── package.json          # 测试依赖管理
```

## 环境要求

- Go 1.16 或更高版本
- Node.js 14 或更高版本
- npm 或 yarn

## 运行应用

1. 启动后端服务器：
   ```bash
   cd backend
   go run main.go
   ```

2. 访问应用：
   在浏览器中打开 `http://localhost:8080`

## 运行测试

1. 安装测试依赖：
   ```bash
   cd tests
   npm install
   ```

2. 安装 Playwright 浏览器：
   ```bash
   npx playwright install
   ```

3. 执行测试：
   ```bash
   npm test
   ```

## 功能特性

- WebRTC 流媒体传输，支持动态修改发送器和接收器
- 基于 WebSocket 的信令通道
- 使用 Playwright 实现自动化测试
- 支持动态添加视频和音频轨道

## 实现细节

- 前端使用原生 JavaScript 和 WebRTC API
- 后端使用 Pion WebRTC for Go
- 通过 WebSocket 连接处理信令
- 测试验证连接建立和动态轨道添加功能
