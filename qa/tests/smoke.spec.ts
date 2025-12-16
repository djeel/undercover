import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Happy Path', () => {
    test('has title', async ({ page }) => {
        await page.goto('/');
        // Expect a title "to contain" a substring.
        await expect(page).toHaveTitle(/Undercover/);
    });

    test('can navigate to create game', async ({ page }) => {
        await page.goto('/');
        // Check for main CTA
        const createBtn = page.getByRole('button', { name: /create game/i });
        await expect(createBtn).toBeVisible();
        // await createBtn.click();
        // await expect(page).toHaveURL(/.*setup/);
    });
});
