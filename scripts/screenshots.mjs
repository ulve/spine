/**
 * Playwright screenshot script for Spine.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 \
 *   SPINE_USER=admin \
 *   SPINE_PASS=yourpassword \
 *   node scripts/screenshots.mjs
 *
 * Defaults to http://localhost:3000.
 * Requires a running Spine instance with at least one book in the library.
 * Outputs PNG files to screenshots/.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'screenshots');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const USERNAME = process.env.SPINE_USER ?? 'screenshotter';
const PASSWORD = process.env.SPINE_PASS ?? 'screenshots123';

async function save(page, name) {
  const dest = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`  saved ${name}.png`);
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[placeholder="Username"]').fill(USERNAME);
  await page.locator('input[placeholder="Password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log(`Taking screenshots from ${BASE_URL} …`);

  // Login
  await login(page);

  // Library
  await page.waitForTimeout(800);
  await save(page, 'library');

  // Authors
  await page.goto(`${BASE_URL}/authors`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await save(page, 'authors');

  // Series
  await page.goto(`${BASE_URL}/series`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await save(page, 'series');

  // Tags
  await page.goto(`${BASE_URL}/tags`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await save(page, 'tags');

  // Upload page
  await page.goto(`${BASE_URL}/upload`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await save(page, 'upload');

  // Book detail modal — click the first book card
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  const firstCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
  await firstCard.click();
  await page.waitForTimeout(800);
  await save(page, 'book-detail');

  // Close the detail modal
  await page.locator('[data-testid="modal-close"], button:has(svg)').first().click().catch(() => {});
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // Metadata editor — hover the first card to reveal the edit button
  const firstCardEdit = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
  await firstCardEdit.hover({ force: true });
  await page.waitForTimeout(400);
  // Edit button is last button in the hover overlay
  await firstCardEdit.locator('button').last().click({ force: true });
  await page.waitForTimeout(700);
  await save(page, 'book-edit');

  await browser.close();
  console.log('Done. Screenshots saved to screenshots/');
})();
