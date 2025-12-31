
import { test, expect } from '@playwright/test';

test('SignUp Flow - Valid CPF/CNPJ and Registration', async ({ page }) => {
    // Mock API responses to avoid hitting real external services limits/costs
    await page.route('*/**/api.cpfcnpj.com.br/**', async route => {
        const url = route.request().url();

        if (url.includes('00000000000')) { // Mock CPF
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ nome: 'Teste Usuario Silva', status: 1 }),
            });
        } else if (url.includes('00000000000000')) { // Mock CNPJ
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    razao_social: 'Hospital Exemplo LTDA',
                    nome_fantasia: 'Hospital Exemplo',
                    municipio: 'São Paulo',
                    status: 1
                }),
            });
        } else {
            await route.continue();
        }
    });

    await page.goto('/signup');

    // Fill CPF
    const cpfInput = page.locator('input[name="cpf"]');
    await cpfInput.fill('000.000.000-00');
    await cpfInput.blur();

    // Verify Name Auto-fill
    await expect(page.locator('input[name="name"]')).toHaveValue('Teste Usuario Silva');

    // Fill CNPJ
    const cnpjInput = page.locator('input[name="cnpj"]');
    await cnpjInput.fill('00.000.000/0000-00');
    await cnpjInput.blur();

    // Verify Institution Name Auto-fill (Readonly input)
    // Need to wait for it to appear
    await expect(page.locator('input[value="Hospital Exemplo"]')).toBeVisible();

    // Fill Rest
    await page.locator('input[name="email"]').fill('teste@example.com');
    await page.locator('input[name="password"]').fill('password123');

    // Submit (We won't actually click submit to avoid polluting the DB in this demo, 
    // or we can mock Supabase too. For now let's stop here as per user request to automate *test* of API filling).
    // If we want to test full flow, we'd need to mock Supabase calls or use a test DB.

    // Checking that the submit button is enabled/ready
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
});
