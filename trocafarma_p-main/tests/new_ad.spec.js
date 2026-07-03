
import { test, expect } from '@playwright/test';

test.describe('New Ad Creation Flow', () => {

    test('should load page, perform smart search, and create ad', async ({ page }) => {
        // 1. Mock External APIs
        await page.route('https://openbula.vercel.app/api/pesquisar?nome=Dipirona', async route => {
            const json = {
                content: [{ nomeProduto: 'Dipirona Sódica 500mg' }]
            };
            await route.fulfill({ json });
        });

        // 2. Login
        await page.goto('/signin');
        await page.fill('input[name="email"]', 'teste@example.com');
        await page.fill('input[name="password"]', 'password123'); // Assuming these credentials work or we might need to register first if DB is empty
        await page.click('button:has-text("Entrar")');

        // Wait for redirection to Home
        await expect(page).toHaveURL('/');

        // 3. Navigate to New Ad
        await page.click('button:has-text("Novo Anúncio")');
        await expect(page).toHaveURL('/novo-anuncio');
        await expect(page.locator('h2')).toHaveText('Novo Anúncio');

        // 4. Smart Search Interaction
        await page.fill('input[name="itemCode"]', 'Dipirona');
        await page.locator('input[name="itemCode"]').blur();

        // Verify loading/feedback
        // await expect(page.getByText('Buscando...')).toBeVisible(); 

        // Verify Auto-fill
        await expect(page.locator('input[name="description"]')).toHaveValue('Dipirona Sódica 500mg', { timeout: 10000 });
        await expect(page.getByText('Item encontrado na base oficial')).toBeVisible();

        // 5. Fill remaining fields
        await page.fill('input[name="batch"]', 'Lote123');

        // Future date for expiration
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const dateString = futureDate.toISOString().split('T')[0];
        await page.fill('input[name="expirationDate"]', dateString);

        await page.selectOption('select[name="type"]', 'DOACAO');

        await page.fill('input[name="photos"]', 'http://example.com/photo.jpg');

        // 6. Submit
        // Mock Supabase calls? 
        // We are running against the real dev server which uses real Supabase client. 
        // If we want to avoid DB pollution we'd mock it, but for E2E verification of the "Allow" logic, real is okay for now or we expect success.

        // Setup dialog listener for the "alert"
        page.on('dialog', dialog => dialog.accept());

        await page.click('button[type="submit"]');

        // 7. Success & Redirect
        // Expect redirect back to home
        await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('should block access if not logged in', async ({ page }) => {
        await page.goto('/novo-anuncio');
        await expect(page).toHaveURL('/signin');
    });

});
