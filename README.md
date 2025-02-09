# WebRTC Dynamic Sender/Receiver Demo

This project demonstrates dynamic modification of WebRTC senders and receivers using a Go backend and vanilla JavaScript frontend.

## Project Structure

```
webrtc-dynamic/
├── frontend/
│   ├── index.html
│   └── main.js
├── backend/
│   ├── go.mod
│   └── main.go
└── tests/
    ├── test_webrtc.js
    ├── playwright.config.js
    └── package.json
```

## Prerequisites

- Go 1.16 or later
- Node.js 14 or later
- npm or yarn

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   go run main.go
   ```

2. Access the application:
   Open your browser and navigate to `http://localhost:8080`

## Running Tests

1. Install test dependencies:
   ```bash
   cd tests
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Run the tests:
   ```bash
   npm test
   ```

## Features

- WebRTC streaming with dynamic sender/receiver modification
- WebSocket signaling channel
- Automated testing with Playwright
- Support for adding video and audio tracks dynamically

## Implementation Details

- Frontend uses vanilla JavaScript and WebRTC APIs
- Backend uses Pion WebRTC for Go
- Signaling is handled through WebSocket connection
- Tests verify the connection establishment and dynamic track addition
