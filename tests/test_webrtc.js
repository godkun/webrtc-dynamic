const { test, expect } = require('@playwright/test');

test('WebRTC connection and dynamic track addition', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8080');
    
    // Grant permissions for media devices
    await page.context().grantPermissions(['camera', 'microphone']);
    
    // Click the start streaming button
    await page.click('#startBtn');
    
    // Wait for local video to appear
    const localVideo = await page.locator('#localVideo');
    await expect(localVideo).toBeVisible();
    
    // Test adding video track
    await page.click('#addVideoBtn');
    
    // Test adding audio track
    await page.click('#addAudioBtn');
    
    // Wait a bit to ensure tracks are added
    await page.waitForTimeout(2000);
});
