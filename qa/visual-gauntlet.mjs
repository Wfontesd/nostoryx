import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-chromium';

const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const OUTPUT_DIR = path.resolve(process.env.QA_OUTPUT_DIR ?? 'qa-artifacts');
const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 430, height: 932 };
const REQUIRED_FRAMES = [
  'hero_idle', 'hero_run_a', 'hero_run_b', 'hero_jump', 'hero_light', 'hero_heavy', 'hero_cast', 'hero_dash',
  'brute_idle', 'brute_walk', 'brute_windup', 'brute_hit', 'brute_down',
  'slime_idle', 'slime_jump', 'slime_attack', 'slime_hit',
  'wisp_idle', 'wisp_move', 'wisp_cast', 'wisp_hit',
  'skill_quick', 'skill_breaker', 'skill_arc', 'skill_dash', 'skill_heal',
  'vfx_impact', 'vfx_crescent', 'vfx_heavy_arc', 'vfx_lightning', 'vfx_sigil', 'vfx_ring', 'vfx_dash', 'vfx_dust',
  'portal_arch', 'portal_sigil', 'platform_arcane',
];

await mkdir(OUTPUT_DIR, { recursive: true });

const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, scenarios: [], failures: [] };
const fail = (condition, message, failures) => { if (!condition) failures.push(message); };

async function waitForScene(page, sceneKey) {
  await page.waitForSelector('canvas', { state: 'visible', timeout: 30_000 });
  await page.waitForFunction((key) => {
    const game = globalThis.__NOSTORYX_DEV_GAME__;
    return Boolean(game?.scene?.getScene(key)?.sys?.isActive?.());
  }, sceneKey, { timeout: 30_000 });
  await page.waitForTimeout(750);
  await page.locator('canvas').click({ position: { x: 640, y: 360 } });
  await page.waitForTimeout(80);
}

async function inspect(page, sceneKey) {
  return page.evaluate(({ sceneKey, requiredFrames }) => {
    const game = globalThis.__NOSTORYX_DEV_GAME__;
    const scene = game?.scene?.getScene(sceneKey);
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    const atlas = game?.textures?.exists?.('generated-atlas') ? game.textures.get('generated-atlas') : null;
    const art = scene?.heroArt?.() ?? scene?.actor ?? null;
    const target = scene?.dummyArt ?? scene?.target ?? scene?.enemy ?? null;

    return {
      sceneActive: Boolean(scene?.sys?.isActive?.()),
      bootHidden: document.querySelector('#boot-status')?.classList.contains('hidden') ?? false,
      renderer: game?.renderer?.type ?? null,
      atlasExists: Boolean(atlas),
      missingFrames: requiredFrames.filter((frame) => !atlas?.has?.(frame)),
      canvas: rect ? { width: rect.width, height: rect.height, aspect: rect.width / Math.max(1, rect.height) } : null,
      state: scene ? {
        debugVisible: Boolean(scene.debugVisible),
        devOverlayVisible: Boolean(scene.devOverlay?.visible),
        playerX: scene.player?.x ?? null,
        playerY: scene.player?.y ?? null,
        playerVelocityX: scene.player?.body?.velocity?.x ?? null,
        dummyHp: typeof scene.dummyHp === 'number' ? scene.dummyHp : null,
        dummyMaxHp: typeof scene.dummyMaxHp === 'number' ? scene.dummyMaxHp : null,
        combo: typeof scene.combo === 'number' ? scene.combo : null,
        monsterCount: Array.isArray(scene.monsters) ? scene.monsters.filter((monster) => monster?.active).length : null,
        playerHp: typeof scene.playerHp === 'number' ? scene.playerHp : null,
        selectedIndex: typeof scene.selectedIndex === 'number' ? scene.selectedIndex : null,
        logs: Array.isArray(scene.logs) ? [...scene.logs] : null,
        inventoryOpen: typeof scene.inventoryOpen === 'boolean' ? scene.inventoryOpen : null,
        hp: typeof scene.hp === 'number' ? scene.hp : null,
        mp: typeof scene.mp === 'number' ? scene.mp : null,
        artVisible: art ? Boolean(art.visible && art.alpha > 0 && art.displayWidth > 2 && art.displayHeight > 2) : null,
        targetVisible: target ? Boolean(target.visible && target.alpha > 0 && target.displayWidth > 2 && target.displayHeight > 2) : null,
      } : null,
    };
  }, { sceneKey, requiredFrames: REQUIRED_FRAMES });
}

async function press(page, key, delay = 45) {
  await page.keyboard.down(key);
  await page.waitForTimeout(delay);
  await page.keyboard.up(key);
}

async function hold(page, key, milliseconds) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
}

async function screenshot(page, name) {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.locator('canvas').screenshot({ path: filePath, animations: 'allow' });
  const info = await stat(filePath);
  return { file: path.basename(filePath), bytes: info.size };
}

const scenarios = [
  {
    name: 'hub-desktop', scene: 'LabHub', query: '', viewport: DESKTOP,
    run: async ({ page, captures }) => captures.push(await screenshot(page, 'hub-desktop')),
  },
  {
    name: 'movement-desktop', scene: 'MovementLab', query: '?lab=movement', viewport: DESKTOP,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await screenshot(page, 'movement-initial'));
      await hold(page, 'd', 720);
      await press(page, 'Space');
      await hold(page, 'd', 700);
      captures.push(await screenshot(page, 'movement-course'));
      const after = await inspect(page, 'MovementLab');
      fail((after.state?.playerX ?? 0) > (before.state?.playerX ?? 0) + 220, 'player did not traverse the course', failures);
      return after;
    },
  },
  {
    name: 'combat-desktop', scene: 'CombatLab', query: '?lab=combat', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await screenshot(page, 'combat-initial'));
      await hold(page, 'd', 1480);
      await press(page, 'j');
      await page.waitForTimeout(58);
      captures.push(await screenshot(page, 'combat-light-impact'));
      await page.waitForTimeout(270);
      await press(page, 'k');
      await page.waitForTimeout(118);
      captures.push(await screenshot(page, 'combat-heavy-impact'));
      await page.waitForTimeout(690);
      await press(page, 'l');
      await page.waitForTimeout(190);
      captures.push(await screenshot(page, 'combat-arc-surge'));
      await page.waitForTimeout(300);
      const after = await inspect(page, 'CombatLab');
      fail(after.state?.dummyHp < after.state?.dummyMaxHp, 'attacks did not damage the target', failures);
      fail((after.state?.combo ?? 0) > 0, 'combo counter never advanced', failures);
      return after;
    },
  },
  {
    name: 'monsters-desktop', scene: 'MonsterLab', query: '?lab=monsters', viewport: DESKTOP,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await screenshot(page, 'monsters-initial'));
      await press(page, 'q');
      await press(page, 'w');
      await press(page, 'e');
      await hold(page, 'd', 1350);
      await page.waitForTimeout(750);
      captures.push(await screenshot(page, 'monsters-ai-engaged'));
      const after = await inspect(page, 'MonsterLab');
      fail((after.state?.monsterCount ?? 0) >= (before.state?.monsterCount ?? 0) + 3, 'spawn hotkeys did not add every archetype', failures);
      return after;
    },
  },
  {
    name: 'vfx-desktop', scene: 'VfxLab', query: '?lab=vfx', viewport: DESKTOP,
    run: async ({ page, captures }) => {
      captures.push(await screenshot(page, 'vfx-initial'));
      await press(page, 'q');
      await page.waitForTimeout(90);
      captures.push(await screenshot(page, 'vfx-slash'));
      await page.waitForTimeout(230);
      await press(page, 'e');
      await page.waitForTimeout(130);
      captures.push(await screenshot(page, 'vfx-lightning'));
      await page.waitForTimeout(310);
      await press(page, 't');
      await page.waitForTimeout(430);
      captures.push(await screenshot(page, 'vfx-meteor-impact'));
      return inspect(page, 'VfxLab');
    },
  },
  {
    name: 'craft-desktop', scene: 'CraftLab', query: '?lab=craft', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await screenshot(page, 'craft-initial'));
      await press(page, 'g');
      await press(page, 'Enter');
      await page.waitForTimeout(180);
      captures.push(await screenshot(page, 'craft-success'));
      const crafted = await inspect(page, 'CraftLab');
      fail(crafted.state?.logs?.some((line) => line.includes('accept')), 'craft transaction was not accepted after refill', failures);
      await press(page, 'd');
      await page.waitForTimeout(150);
      captures.push(await screenshot(page, 'craft-salvage'));
      return inspect(page, 'CraftLab');
    },
  },
  {
    name: 'ui-desktop', scene: 'UiLab', query: '?lab=ui', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await screenshot(page, 'ui-initial'));
      await press(page, 'Tab');
      await page.waitForTimeout(150);
      captures.push(await screenshot(page, 'ui-inventory'));
      for (let i = 0; i < 4; i += 1) await press(page, 'q', 35);
      await press(page, 'e');
      await page.waitForTimeout(220);
      captures.push(await screenshot(page, 'ui-low-hp-level-up'));
      const after = await inspect(page, 'UiLab');
      fail(after.state?.inventoryOpen === true, 'inventory overlay did not open', failures);
      fail((after.state?.hp ?? 100) < 40, 'low-HP state was not reached', failures);
      return after;
    },
  },
  {
    name: 'hub-mobile', scene: 'LabHub', query: '', viewport: MOBILE,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await screenshot(page, 'hub-mobile'));
      fail(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `canvas stretched to aspect ${before.canvas?.aspect}`, failures);
    },
  },
  {
    name: 'combat-mobile', scene: 'CombatLab', query: '?lab=combat', viewport: MOBILE,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await screenshot(page, 'combat-mobile'));
      fail(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `canvas stretched to aspect ${before.canvas?.aspect}`, failures);
    },
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
});

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: scenario.viewport, deviceScaleFactor: 1, colorScheme: 'dark' });
    const page = await context.newPage();
    const failures = [];
    const captures = [];
    const consoleErrors = [];
    const consoleWarnings = [];
    const pageErrors = [];
    const requestFailures = [];
    const badResponses = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
      if (message.type() === 'warning') consoleWarnings.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
    page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));
    page.on('response', (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });

    try {
      await page.goto(`${BASE_URL}/${scenario.query}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForScene(page, scenario.scene);
      const before = await inspect(page, scenario.scene);

      fail(before.sceneActive, `expected scene ${scenario.scene} is not active`, failures);
      fail(before.bootHidden, 'boot overlay is still visible', failures);
      fail(before.atlasExists, 'generated atlas is not registered', failures);
      fail(before.missingFrames.length === 0, `missing atlas frames: ${before.missingFrames.join(', ')}`, failures);
      fail((before.canvas?.width ?? 0) >= 300 && (before.canvas?.height ?? 0) >= 160, 'canvas has an invalid rendered size', failures);
      fail(before.state?.devOverlayVisible !== true, 'developer overlay is visible by default', failures);
      fail(before.state?.artVisible !== false, 'primary generated art is invisible', failures);
      fail(before.state?.targetVisible !== false, 'target generated art is invisible', failures);

      const after = await scenario.run({ page, before, captures, failures }) ?? await inspect(page, scenario.scene);

      fail(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`, failures);
      fail(pageErrors.length === 0, `uncaught page errors: ${pageErrors.join(' | ')}`, failures);
      fail(requestFailures.length === 0, `failed requests: ${requestFailures.join(' | ')}`, failures);
      fail(badResponses.length === 0, `HTTP errors: ${badResponses.join(' | ')}`, failures);
      fail(!consoleWarnings.some((warning) => warning.includes('Generated atlas unavailable')), 'generated atlas fallback warning emitted', failures);
      fail(!consoleWarnings.some((warning) => warning.includes('texImage2D') || warning.includes('bad image data')), `WebGL texture upload warning: ${consoleWarnings.join(' | ')}`, failures);
      for (const capture of captures) fail(capture.bytes > 35_000, `${capture.file} is suspiciously small (${capture.bytes} bytes)`, failures);

      const result = {
        name: scenario.name,
        scene: scenario.scene,
        viewport: scenario.viewport,
        before,
        after,
        captures,
        consoleErrors,
        consoleWarnings,
        pageErrors,
        requestFailures,
        badResponses,
        failures,
        passed: failures.length === 0,
      };
      report.scenarios.push(result);
      report.failures.push(...failures.map((message) => `${scenario.name}: ${message}`));
      console.log(`${result.passed ? 'PASS' : 'FAIL'} ${scenario.name}`);
      failures.forEach((message) => console.error(`  - ${message}`));
    } catch (error) {
      const message = error?.stack ?? String(error);
      report.scenarios.push({ name: scenario.name, scene: scenario.scene, viewport: scenario.viewport, failures: [message], passed: false });
      report.failures.push(`${scenario.name}: ${message}`);
      console.error(`FAIL ${scenario.name}\n${message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

report.passed = report.failures.length === 0;
await writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(OUTPUT_DIR, 'summary.txt'), [
  `NOSTORYX visual QA: ${report.passed ? 'PASS' : 'FAIL'}`,
  `Scenarios: ${report.scenarios.length}`,
  `Failures: ${report.failures.length}`,
  ...report.failures.map((failure) => `- ${failure}`),
].join('\n'));

if (!report.passed) process.exitCode = 1;
