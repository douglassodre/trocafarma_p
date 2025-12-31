
import { test } from '@playwright/test';
import fs from 'fs';

test('Dump HTML and Errors', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(`CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => logs.push(`PAGE ERROR: ${err.message}`));

    try {
        await page.goto('http://localhost:5173/');
        await page.waitForTimeout(2000);
    } catch (e) {
        logs.push(`NAVIGATION ERROR: ${e.message}`);
    }

    const html = await page.content();
    logs.push('\n--- HTML CONTENT ---\n');
    logs.push(html);

    fs.writeFileSync('debug_dump.txt', logs.join('\n'));
});
