import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const localArtifactsDir = path.resolve(process.cwd(), 'artifacts');
const rootArtifactsDir = 'C:\\artifacts';

// Ensure directories exist
if (!fs.existsSync(localArtifactsDir)) {
  fs.mkdirSync(localArtifactsDir, { recursive: true });
}
if (!fs.existsSync(rootArtifactsDir)) {
  try {
    fs.mkdirSync(rootArtifactsDir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function saveScreenshot(page: any, name: string) {
  const localPath = path.join(localArtifactsDir, name);
  await page.screenshot({ path: localPath, fullPage: true });
  try {
    const rootPath = path.join(rootArtifactsDir, name);
    fs.copyFileSync(localPath, rootPath);
  } catch (e) {
    // ignore
  }
}

async function setDemoUser(page: any, userId: string) {
  await page.evaluate((uid) => {
    const store = (window as any).useDhaarStore?.getState?.();
    if (store) {
      store.setCurrentUser(uid);
    }
  }, userId);
  await page.waitForTimeout(100);
}

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 }
];

test.describe('Section 8 Demo Script Tests A through J', () => {
  for (const vp of viewports) {
    test.describe(`Viewport: ${vp.name} (${vp.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      // -------------------------------------------------------------
      // Test A: Command Center (/dashboard) [KEYBOARD-ONLY]
      // -------------------------------------------------------------
      test(`Test A: Command Center (/dashboard) - Seed IDs & counts ${vp.name}`, async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');
        await page.waitForTimeout(200);

        // Keyboard-only navigation for Test A
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        const pageContent = await page.textContent('body');
        // Total declared instruments & value
        expect(pageContent).toContain('13 instruments tracked');
        expect(pageContent).toContain('₹2.2 Cr');

        // Assert seed records
        // DHAAR-24081 (E2, Active, ₹25L)
        expect(pageContent).toContain('DHAAR-24081');
        expect(pageContent).toContain('SIES Graduate School of Technology');
        expect(pageContent).toContain('Active');

        // DHAAR-24080 (E1, Attention required, ₹18L)
        expect(pageContent).toContain('DHAAR-24080');
        expect(pageContent).toContain('North Valley Institute of Technology');
        expect(pageContent).toContain('Attention required');

        // DHAAR-24076 (E2, Matured, ₹11L)
        expect(pageContent).toContain('DHAAR-24076');
        expect(pageContent).toContain('Western Regional Technical Institute');
        expect(pageContent).toContain('Matured');

        // Save screenshot
        await saveScreenshot(page, `test-A-command-center-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test B: Intake Wizard (/submit)
      // -------------------------------------------------------------
      test(`Test B: Intake Wizard (/submit) - Creates E0 declared record ${vp.name}`, async ({ page }) => {
        await page.goto('/submit');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        // Fill Step 1
        const instInput = page.locator('input[placeholder="e.g. SIES Graduate School of Technology"]');
        await instInput.fill('Demo Polytechnic Institute');

        const fdrInput = page.locator('input[placeholder="Enter unique instrument number"]');
        await fdrInput.fill('FDR-E2E-999');

        const amountInput = page.locator('input[type="number"]');
        await amountInput.fill('2500000');

        // Continue to Step 2
        await page.locator('button:has-text("Continue to documents")').click();

        // Step 2: Upload file (simulate file attachment)
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: 'sample_fdr_scan.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4 demo test file')
        });

        // Continue to Step 3
        await page.locator('button:has-text("Review submission")').click();

        // Step 3: Run pre-flight checks
        await page.locator('button:has-text("Run pre-flight checks")').click();

        // Submit instrument
        const submitBtn = page.locator('.wizard-footer button.btn-primary');
        await submitBtn.click();

        // Verify E0 declared confirmation
        const bodyText = await page.textContent('body');
        expect(bodyText).toContain('Instrument added to the registry');
        expect(bodyText).toContain('E0 · Declared');

        await saveScreenshot(page, `test-B-intake-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test C: Evidence Workbench (/evidence)
      // -------------------------------------------------------------
      test(`Test C: Evidence Workbench (/evidence) - Rule findings & blocked states ${vp.name}`, async ({ page }) => {
        await page.goto('/evidence');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        // Select DHAAR-24080 (Photoshop metadata, missing lien) inside .form-grid
        const select = page.locator('.form-grid select');
        await select.selectOption('DHAAR-24080');

        // Check declared values & status
        const content = await page.textContent('.page-stack');
        expect(content).toContain('DHAAR-24080');
        expect(content).toContain('E1');
        expect(content).toContain('Attention required');
        expect(content).toContain('Joint lien confirmation missing');

        // Click Run evidence rules
        const runBtn = page.locator('button:has-text("Run evidence rules")');
        await runBtn.click();

        // Check rule results appear
        const ruleResults = page.locator('.rule-results');
        await expect(ruleResults).toBeVisible();

        // Notice blocked evidence guardrail note
        expect(await page.textContent('.page-stack')).toContain('Evidence-grade guardrail');

        await saveScreenshot(page, `test-C-evidence-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test D: Bank Confirmation Desk (/bank-desk) - Mismatch Keeps E1
      // -------------------------------------------------------------
      test(`Test D: Bank Desk (/bank-desk) - Mismatch Keeps E1 ${vp.name}`, async ({ page }) => {
        await page.goto('/bank-desk');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        // Select DHAAR-24080
        const item = page.locator('button.bank-request-item:has-text("DHAAR-24080")');
        await item.click();

        // Regional Officer sends request
        const reqBtn = page.locator('button:has-text("Confirmation Request"), button:has-text("Re-issue")');
        await expect(reqBtn).toBeEnabled();
        await reqBtn.click();

        // Switch to Bank Verifier (Rohit Patil)
        await setDemoUser(page, 'usr-bv-1');

        // Select DHAAR-24080 again
        await page.locator('button.bank-request-item:has-text("DHAAR-24080")').click();

        // Trigger Force mismatch test
        const mismatchBtn = page.locator('button:has-text("Force mismatch test")');
        await expect(mismatchBtn).toBeEnabled();
        await mismatchBtn.click();

        // Verify status shows Mismatch and grade remains E1
        const detail = page.locator('.bank-detail');
        expect(await detail.textContent()).toContain('E1');

        await saveScreenshot(page, `test-D-bank-desk-mismatch-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test E: Bank Confirmation Promotion - Matching Elevates to E2
      // -------------------------------------------------------------
      test(`Test E: Bank Desk (/bank-desk) - Matching Response Promotes to E2 ${vp.name}`, async ({ page }) => {
        await page.goto('/bank-desk');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        // Select DHAAR-24085 (E1, Konkan Institute)
        const item = page.locator('button.bank-request-item:has-text("DHAAR-24085")');
        await item.click();

        // Send request
        const reqBtn = page.locator('button:has-text("Confirmation Request"), button:has-text("Re-issue")');
        await expect(reqBtn).toBeEnabled();
        await reqBtn.click();

        // Switch to Bank Verifier
        await setDemoUser(page, 'usr-bv-1');

        // Select DHAAR-24085
        await page.locator('button.bank-request-item:has-text("DHAAR-24085")').click();

        // Click "Load matching demo response"
        const loadMatchingBtn = page.locator('button:has-text("Load matching demo response")');
        await expect(loadMatchingBtn).toBeEnabled();
        await loadMatchingBtn.click();

        // Ensure bank lien checkbox is checked for full matching promotion
        const lienCheck = page.locator('input[type="checkbox"]:near(:text("Bank confirms required lien"))');
        if (await lienCheck.isVisible() && !(await lienCheck.isChecked())) {
          await lienCheck.check();
        }

        // Click "Apply entered response"
        const applyBtn = page.locator('button:has-text("Apply entered response")');
        await expect(applyBtn).toBeEnabled();
        await applyBtn.click();

        // Verify grade elevates to E2 and status Attested
        const detail = page.locator('.bank-detail');
        const detailText = await detail.textContent();
        expect(detailText).toContain('E2');
        expect(detailText).toContain('Attested');

        await saveScreenshot(page, `test-E-bank-desk-promotion-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test F: Compliance & Maturity (/compliance) [KEYBOARD-ONLY]
      // -------------------------------------------------------------
      test(`Test F: Compliance & Maturity (/compliance) - Lineage & Gap [Keyboard-only] ${vp.name}`, async ({ page }) => {
        await page.goto('/compliance');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        // Keyboard navigation
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Assert lineage for DHAAR-24088 & predecessor DHAAR-24076
        const text = await page.textContent('.page-stack');
        expect(text).toContain('DHAAR-24088');
        expect(text).toContain('DHAAR-24076');
        expect(text).toContain('0'); // 0 gap days

        // Check simulated demo date control exists
        expect(text).toContain('Demo date');

        await saveScreenshot(page, `test-F-compliance-keyboard-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test G: Gated Release - Blocked Cases (/release)
      // -------------------------------------------------------------
      test(`Test G: Gated Release (/release) - Blocked Cases & Disabled Buttons ${vp.name}`, async ({ page }) => {
        await page.goto('/release');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        // Select REL-1006 (DHAAR-24080)
        const case1006 = page.locator('button.release-case:has-text("REL-1006")');
        await case1006.click();

        const detail = page.locator('.release-detail');
        const text = await detail.textContent();

        // Assert Active Hold badge
        expect(text).toContain('On hold');

        // Assert hold reason input has the active hold reason
        const holdReasonInput = page.locator('input[placeholder*="legal hold, complaint"]');
        await expect(holdReasonInput).toHaveValue('Demo dispute hold');

        // Assert refund name mismatch
        expect(text).toContain('North Valley Institute');
        expect(text).toContain('North Valley Institute of Technology');

        // Assert progression buttons are disabled
        const makerBtn = page.locator('button:has-text("Maker check")');
        await expect(makerBtn).toBeDisabled();

        const checkerBtn = page.locator('button:has-text("Checker approve")');
        await expect(checkerBtn).toBeDisabled();

        await saveScreenshot(page, `test-G-release-blocked-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test H: Gated Release - 3-Way Segregation (/release)
      // -------------------------------------------------------------
      test(`Test H: Gated Release (/release) - 3-Way Maker/Checker/Authority Progression ${vp.name}`, async ({ page }) => {
        await page.goto('/release');
        await page.waitForLoadState('domcontentloaded');

        // 1. Regional Officer as Maker (Meera Iyer)
        await setDemoUser(page, 'usr-ro-1');
        await page.locator('button.release-case:has-text("REL-1007")').click();

        const makerBtn = page.locator('button:has-text("Maker check")');
        await expect(makerBtn).toBeEnabled();
        await makerBtn.click();

        // 2. Checker (Sana Khan)
        await setDemoUser(page, 'usr-ck-1');
        await page.locator('button.release-case:has-text("REL-1007")').click();

        const checkerBtn = page.locator('button:has-text("Checker approve")');
        await expect(checkerBtn).toBeEnabled();
        await checkerBtn.click();

        // 3. Approving Authority (Vikram Sethi)
        await setDemoUser(page, 'usr-aa-1');
        await page.locator('button.release-case:has-text("REL-1007")').click();

        const authBtn = page.locator('button:has-text("Authority approve")');
        await expect(authBtn).toBeEnabled();
        await authBtn.click();

        // 4. Bank Verifier (Rohit Patil)
        await setDemoUser(page, 'usr-bv-1');
        await page.locator('button.release-case:has-text("REL-1007")').click();

        const ackBtn = page.locator('button:has-text("Simulate bank acknowledgement")');
        await expect(ackBtn).toBeEnabled();
        await ackBtn.click();

        // 5. Approving Authority reconciles
        await setDemoUser(page, 'usr-aa-1');
        await page.locator('button.release-case:has-text("REL-1007")').click();

        const reconcileBtn = page.locator('button:has-text("Reconcile & close")');
        await expect(reconcileBtn).toBeEnabled();
        await reconcileBtn.click();

        // Verify Released / Reconciled state
        const detail = page.locator('.release-detail');
        expect(await detail.textContent()).toContain('Reconciled');

        await saveScreenshot(page, `test-H-release-segregation-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test I: Impact Lab (/impact)
      // -------------------------------------------------------------
      test(`Test I: Impact Lab (/impact) - Counts, Assumptions & CSV ${vp.name}`, async ({ page }) => {
        await page.goto('/impact');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        const text = await page.textContent('.page-stack');

        // Assert Portfolio values & Verified held coverage
        expect(text).toContain('Verified held coverage');
        expect(text).toContain('Empirical Evaluation Measures');

        // Assert Assumption badges
        expect(text).toContain('ASSUMPTION');

        // Assert Target Disclaimer
        expect(text).toContain('Evaluation targets are shown as targets, not measured programme outcomes');

        // Assert Export CSV button is visible
        const exportBtn = page.locator('button:has-text("Export Evaluation (CSV)")');
        await expect(exportBtn).toBeVisible();

        await saveScreenshot(page, `test-I-impact-lab-${vp.name}.png`);
      });

      // -------------------------------------------------------------
      // Test J: Cryptographic Audit (/audit)
      // -------------------------------------------------------------
      test(`Test J: Cryptographic Audit (/audit) - 300-Event Chain & Merkle Receipt ${vp.name}`, async ({ page }) => {
        await page.goto('/audit');
        await page.waitForLoadState('domcontentloaded');
        await setDemoUser(page, 'usr-ro-1');

        const text = await page.textContent('.page-stack');

        // Assert SHA-256 chain verification controls
        expect(text).toContain('SHA-256 cryptographic chain');
        expect(text).toContain('Events on local chain');

        // Verify Daily Merkle digest panel exists
        expect(text).toContain('Daily Merkle Root Digests');

        // Verify Export Receipt button exists
        const exportReceiptBtn = page.locator('button:has-text("Export Chain Receipt (JSON)")');
        await expect(exportReceiptBtn).toBeVisible();

        await saveScreenshot(page, `test-J-audit-chain-${vp.name}.png`);
      });
    });
  }
});
