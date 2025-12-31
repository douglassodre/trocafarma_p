
import { test, expect } from '@playwright/test';

test('Hello World Check', async ({ page }) => {
    await page.goto('http://localhost:3333/');
    await expect(page.locator('h1')).toHaveText('PURE JS WORKS', { timeout: 10000 });
});
