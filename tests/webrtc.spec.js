const { test, expect } = require('@playwright/test');

// 测试套件
// 测试 WebRTC 连接和动态轨道添加功能
test.describe('WebRTC 动态发送接收测试', () => {
    // 每个测试用例前的设置
    test.beforeEach(async ({ page }) => {
        // 访问应用
        await page.goto('http://localhost:8080');
        // 授予媒体权限
        await page.context().grantPermissions(['camera', 'microphone']);
    });

    // 测试初始化和基本连接
    test('初始化和基本连接测试', async ({ page }) => {
        // 点击开始流媒体按钮
        await page.click('#startBtn');
        
        // 等待本地视频显示
        const localVideo = await page.locator('#localVideo');
        await expect(localVideo).toBeVisible();
        
        // 检查视频元素是否在播放
        const isPlaying = await page.evaluate(() => {
            const video = document.querySelector('#localVideo');
            return !!(video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2);
        });
        expect(isPlaying).toBeTruthy();
    });

    // 测试动态添加轨道
    test('动态添加视频和音频轨道', async ({ page }) => {
        // 先启动基本连接
        await page.click('#startBtn');
        await page.waitForTimeout(1000);

        // 测试添加视频轨道
        await page.click('#addVideoBtn');
        await page.waitForTimeout(1000);

        // 检查视频轨道数量
        const videoTracksCount = await page.evaluate(() => {
            const stream = document.querySelector('#localVideo').srcObject;
            return stream.getVideoTracks().length;
        });
        expect(videoTracksCount).toBeGreaterThan(0);

        // 测试添加音频轨道
        await page.click('#addAudioBtn');
        await page.waitForTimeout(1000);

        // 检查音频轨道数量
        const audioTracksCount = await page.evaluate(() => {
            const stream = document.querySelector('#localVideo').srcObject;
            return stream.getAudioTracks().length;
        });
        expect(audioTracksCount).toBeGreaterThan(0);
    });

    // 测试 WebSocket 连接
    test('WebSocket 连接状态测试', async ({ page }) => {
        // 点击开始按钮后检查 WebSocket 连接状态
        await page.click('#startBtn');
        
        // 检查 WebSocket 连接状态
        const wsConnected = await page.evaluate(() => {
            return window.ws && window.ws.readyState === WebSocket.OPEN;
        });
        expect(wsConnected).toBeTruthy();
    });
});

