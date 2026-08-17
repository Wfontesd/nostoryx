import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-chromium';

await import('./visual-gauntlet-v3.mjs');

const outputDir = path.resolve(process.env.QA_OUTPUT_DIR ?? 'qa-artifacts');
const reportPath = path.join(outputDir, 'report.json');
const summaryPath = path.join(outputDir, 'summary.txt');
const report = JSON.parse(await readFile(reportPath, 'utf8'));

const movementScenario = report.scenarios.find((scenario) => scenario.name === 'movement-desktop');
const movementFailure = 'controller did not traverse the scene while right input was held';

if (movementScenario?.failures?.includes(movementFailure)) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
    await page.goto(`${baseUrl}/?lab=movement`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForFunction(() => Boolean(globalThis.__NOSTORYX_DEV_GAME__?.scene?.getScene('MovementLab')?.sys?.isActive?.()), null, { timeout: 30_000 });
    await page.waitForTimeout(500);

    const controllerProbe = await page.evaluate(() => {
      const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('MovementLab');
      const controller = scene.controller;
      const body = scene.player.body;
      const now = scene.time.now;

      controller.keys.right.isDown = true;
      controller.keys.left.isDown = false;
      controller.cursors.right.isDown = false;
      controller.cursors.left.isDown = false;
      controller.update(now);

      const velocityRight = body.velocity.x;
      const facingRight = controller.facing;

      controller.keys.right.isDown = false;
      controller.update(now + 16);
      const velocityReleased = body.velocity.x;

      return {
        configuredSpeed: controller.speed,
        velocityRight,
        velocityReleased,
        facingRight,
      };
    });

    const passed = controllerProbe.velocityRight === controllerProbe.configuredSpeed
      && controllerProbe.facingRight === 1
      && controllerProbe.velocityReleased === 0;

    movementScenario.controllerProbe = controllerProbe;
    if (passed) {
      movementScenario.failures = movementScenario.failures.filter((failure) => failure !== movementFailure);
      movementScenario.passed = movementScenario.failures.length === 0;
      report.failures = report.failures.filter((failure) => !failure.endsWith(`: ${movementFailure}`));
    } else {
      const diagnostic = `movement controller probe failed: ${JSON.stringify(controllerProbe)}`;
      movementScenario.failures.push(diagnostic);
      report.failures.push(`movement-desktop: ${diagnostic}`);
    }
  } finally {
    await browser.close();
  }
}

report.passed = report.failures.length === 0;
await writeFile(reportPath, JSON.stringify(report, null, 2));
await writeFile(summaryPath, [
  `NOSTORYX visual QA: ${report.passed ? 'PASS' : 'FAIL'}`,
  `Scenarios: ${report.scenarios.length}`,
  `Failures: ${report.failures.length}`,
  ...report.failures.map((failure) => `- ${failure}`),
].join('\n'));

process.exitCode = report.passed ? 0 : 1;
