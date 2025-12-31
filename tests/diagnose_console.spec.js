
import { test } from '@playwright/test';
import fs from 'fs';

test('Diagnose Console Errors', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' || text.includes('Uncaught') || text.includes('Error')) {
            logs.push(`[${msg.type().toUpperCase()}] ${text}`);
            // If location is available, log it
            const location = msg.location();
            if (location && location.url) {
                logs.push(`   at ${location.url}:${location.lineNumber}:${location.columnNumber}`);
            }
        }
    });

    page.on('pageerror', exception => {
        logs.push(`[PAGE CRASH] ${exception.message}`);
        logs.push(`   Stack: ${exception.stack}`);
    });

    try {
        console.log('Navigating to http://localhost:3333/');
        // Wait for network idle to ensure scripts load
        await page.goto('http://localhost:3333/', { waitUntil: 'load', timeout: 15000 });

        // Wait a bit for React to hydrate/crash
        await page.waitForTimeout(3000);
    } catch (e) {
        logs.push(`[NAVIGATION ERROR] ${e.message}`);
    }

    const html = await page.content();
    logs.push('\n--- HTML SNAPSHOT (First 500 chars) ---');
    logs.push(html.substring(0, 500));

    console.log('Writing logs to console_diagnosis.txt');
    fs.writeFileSync('console_diagnosis.txt', logs.join('\n'));
});
