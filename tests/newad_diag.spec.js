
import { test, expect } from '@playwright/test';

test('New Ad Page Load', async ({ page }) => {
    // Listen for console logs and errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log(`PAGE ERROR: "${exception}"`));

    // 1. Sign In first
    await page.goto('/signin');
    await page.locator('input[type="email"]').fill('teste@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // 2. Navigate to New Ad
    await page.goto('/novo-anuncio');

    // 3. Check for specific content
    // Expect "Novo Anúncio" heading
    await expect(page.locator('h2', { hasText: 'Novo Anúncio' })).toBeVisible({ timeout: 5000 });
});
