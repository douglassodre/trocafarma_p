
import { test, expect } from '@playwright/test';

test('Preview Check', async ({ page }) => {
    console.log('Navigating to http://localhost:4173/ ...');
    await page.goto('http://localhost:4173/');

    // Check for title or root content
    const title = await page.title();
    console.log(`Page Title: ${title}`);

    const rootHtml = await page.locator('#root').innerHTML();
    if (!rootHtml.trim()) {
        throw new Error('Root is empty!');
    }
    console.log('Root has content.');
});
