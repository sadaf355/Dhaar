import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

const routes = [
  '/',
  '/welcome',
  '/dashboard',
  '/registry',
  '/institutions',
  '/submit',
  '/verification',
  '/evidence',
  '/bank-desk',
  '/compliance',
  '/alerts',
  '/release',
  '/reports',
  '/parameters',
  '/impact',
  '/demo-qa',
  '/audit',
  '/settings'
];

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 }
];

const themes = ['light', 'dark'];

test.describe('Axe-Core Accessibility Audits across all routes', () => {
  for (const route of routes) {
    for (const theme of themes) {
      for (const vp of viewports) {
        test(`axe audit: ${route} [${theme}] (${vp.name})`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(route);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(200);

          // Set theme
          if (theme === 'dark') {
            await page.evaluate(() => {
              const state = JSON.parse(localStorage.getItem('dhaar-demo-v6') || '{}');
              state.state = state.state || {};
              state.state.theme = 'dark';
              localStorage.setItem('dhaar-demo-v6', JSON.stringify(state));
              document.querySelector('.app')?.classList.add('dark');
            });
          } else {
            await page.evaluate(() => {
              const state = JSON.parse(localStorage.getItem('dhaar-demo-v6') || '{}');
              state.state = state.state || {};
              state.state.theme = 'light';
              localStorage.setItem('dhaar-demo-v6', JSON.stringify(state));
              document.querySelector('.app')?.classList.remove('dark');
            });
          }

          // Run axe-core
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

          const severeOrCritical = results.violations.filter(
            v => v.impact === 'serious' || v.impact === 'critical'
          );

          if (severeOrCritical.length > 0) {
            console.log(`[AXE VIOLATIONS] ${route} ${theme} ${vp.name}:`);
            severeOrCritical.forEach(v => {
              console.log(` - [${v.impact}] ${v.id}: ${v.description} (nodes: ${v.nodes.length})`);
              v.nodes.slice(0, 3).forEach(n => console.log(`    Target: ${n.target.join(' ')} | ${n.failureSummary}`));
            });
          }

          expect(severeOrCritical).toEqual([]);
        });
      }
    }
  }
});
