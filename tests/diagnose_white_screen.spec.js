
import { test, expect } from '@playwright/test';

test('Diagnose White Screen', async ({ page }) => {
    // 1. Capture all console messages
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`BROWSER CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
        }
    });

    // 2. Capture uncaught exceptions
    page.on('pageerror', exception => {
        console.log(`BROWSER UNCAUGHT EXCEPTION: ${exception}`);
    });

    // 3. Navigate to app
    console.log('Navigating to http://localhost:5173/ ...');
    try {
        await page.goto('http://localhost:5173/', { timeout: 10000 });
        console.log('Navigation completed.');
    } catch (e) {
        console.log(`Navigation failed: ${e.message}`);
    }

    // 4. Check actual HTML content
    const content = await page.content();
    console.log('PAGE CONTENT SNAPSHOT:');
    console.log(content.substring(0, 500)); // Print first 500 chars

    // 5. Check if #root is empty
    const root = page.locator('#root');
    const count = await root.count();
    if (count > 0) {
        const rootHtml = await root.innerHTML();
        console.log(`ROOT INNER HTML: ${rootHtml.substring(0, 200)}...`);
        if (!rootHtml.trim()) {
            console.log('CRITICAL: #root IS EMPTY (White Screen Confirmed)');
        }
    } else {
        console.log('CRITICAL: #root ELEMENT NOT FOUND');
    }

    // Keep open specifically for a moment to catch delayed hydration errors
    await page.waitForTimeout(2000);
});
