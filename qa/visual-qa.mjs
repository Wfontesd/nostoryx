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
  'skill_quick', 'skill_breaker', 'skill_arc',
  'vfx_impact', 'vfx_crescent', 'vfx_heavy_arc', 'vfx_lightning', 'vfx_sigil', 'vfx_ring', 'vfx_dash', 'vfx_dust',
  'portal_arch', 'portal_sigil',
];

await mkdir(OUTPUT_DIR, { recursive: true });

const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, scenarios: [], failures: [] };
const fail = (condition, message, failures) => { if (!condition) failures.push(message); };

async function waitForScene(page, sceneKey) {
  await page.waitForSelector('canvas', { state: 'visible', timeout: 30_000 });
  await page.waitForFunction((key) => {
    const scene = globalThis.__NOSTORYX_DEV_GAME__?.scene?.getScene?.(key);
    return Boolean(scene?.sys?.isActive?.());
  }, sceneKey, { timeout: 30_000 });
  await page.waitForTimeout(700);
  await page.locator('canvas').click({ position: { x: 24, y: 24 } });
  await page.waitForTimeout(80);
}

async function inspect(page, sceneKey) {
  return page.evaluate(({ key, required }) => {
    const game = globalThis.__NOSTORYX_DEV_GAME__;
    const scene = game?.scene?.getScene?.(key);
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    const atlas = game?.textures?.exists?.('generated-atlas') ? game.textures.get('generated-atlas') : null;
    return {
      active: Boolean(scene?.sys?.isActive?.()),
      bootHidden: document.querySelector('#boot-status')?.classList.contains('hidden') ?? false,
      atlasExists: Boolean(atlas),
      missingFrames: required.filter((name) => !atlas?.has?.(name)),
      canvas: rect ? { width: rect.width, height: rect.height, aspect: rect.width / Math.max(1, rect.height) } : null,
      state: scene ? {
        debugVisible: Boolean(scene.debugVisible),
        developerOverlayVisible: Boolean(scene.devOverlay?.visible),
        playerX: scene.player?.x ?? null,
        playerY: scene.player?.y ?? null,
        dummyHp: typeof scene.dummyHp === 'number' ? scene.dummyHp : null,
        dummyMaxHp: typeof scene.dummyMaxHp === 'number' ? scene.dummyMaxHp : null,
        combo: typeof scene.combo === 'number' ? scene.combo : null,
        monsterCount: Array.isArray(scene.monsters) ? scene.monsters.filter((monster) => monster?.active).length : null,
        inventoryOpen: typeof scene.inventoryOpen === 'boolean' ? scene.inventoryOpen : null,
        hp: typeof scene.hp === 'number' ? scene.hp : null,
        logs: Array.isArray(scene.logs) ? [...scene.logs] : null,
      } : null,
    };
  }, { key: sceneKey, required: REQUIRED_FRAMES });
}

async function capture(page, name) {
  const file = path.join(OUTPUT_DIR, `${name}.png`);
  await page.locator('canvas').screenshot({ path: file, animations: 'allow' });
  return { file: path.basename(file), bytes: (await stat(file)).size };
}

async function hold(page, key, milliseconds) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
}

const scenarios = [
  {
    name: 'hub-desktop', scene: 'LabHub', query: '', viewport: DESKTOP,
    run: async ({ page, captures }) => captures.push(await capture(page, 'hub-desktop')),
  },
  {
    name: 'movement-desktop', scene: 'MovementLab', query: '?lab=movement', viewport: DESKTOP,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await capture(page, 'movement-initial'));
      await hold(page, 'ArrowRight', 420);
      await page.keyboard.press('Space');
      await hold(page, 'ArrowRight', 760);
      await page.waitForTimeout(200);
      captures.push(await capture(page, 'movement-course'));
      const after = await inspect(page, 'MovementLab');
      fail((after.state?.playerX ?? 0) > (before.state?.playerX ?? 0) + 80, 'Player did not move through the course.', failures);
      return after;
    },
  },
  {
    name: 'combat-desktop', scene: 'CombatLab', query: '?lab=combat', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await capture(page, 'combat-initial'));
      await hold(page, 'ArrowRight', 1450);
      await page.keyboard.press('j');
      await page.waitForTimeout(100);
      captures.push(await capture(page, 'combat-light-impact'));
      await page.waitForTimeout(360);
      await page.keyboard.press('k');
      await page.waitForTimeout(155);
      captures.push(await capture(page, 'combat-heavy-impact'));
      await page.waitForTimeout(760);
      await page.keyboard.press('l');
      await page.waitForTimeout(245);
      captures.push(await capture(page, 'combat-arc-surge'));
      await page.waitForTimeout(380);
      const after = await inspect(page, 'CombatLab');
      fail(after.state?.dummyHp < after.state?.dummyMaxHp, 'Attacks did not damage the training target.', failures);
      fail((after.state?.combo ?? 0) > 0, 'Combo counter never advanced.', failures);
      return after;
    },
  },
  {
    name: 'monsters-desktop', scene: 'MonsterLab', query: '?lab=monsters', viewport: DESKTOP,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await capture(page, 'monsters-initial'));
      await page.keyboard.press('q');
      await page.waitForTimeout(80);
      await page.keyboard.press('w');
      await page.waitForTimeout(80);
      await page.keyboard.press('e');
      await hold(page, 'ArrowRight', 900);
      await page.waitForTimeout(900);
      captures.push(await capture(page, 'monsters-ai-engaged'));
      const after = await inspect(page, 'MonsterLab');
      fail((after.state?.monsterCount ?? 0) >= (before.state?.monsterCount ?? 0) + 3, 'Spawn hotkeys did not add all archetypes.', failures);
      return after;
    },
  },
  {
    name: 'vfx-desktop', scene: 'VfxLab', query: '?lab=vfx', viewport: DESKTOP,
    run: async ({ page, captures }) => {
      captures.push(await capture(page, 'vfx-initial'));
      await page.keyboard.press('q');
      await page.waitForTimeout(95);
      captures.push(await capture(page, 'vfx-slash'));
      await page.waitForTimeout(260);
      await page.keyboard.press('e');
      await page.waitForTimeout(140);
      captures.push(await capture(page, 'vfx-lightning'));
      await page.waitForTimeout(330);
      await page.keyboard.press('t');
      await page.waitForTimeout(460);
      captures.push(await capture(page, 'vfx-meteor-impact'));
      return inspect(page, 'VfxLab');
    },
  },
  {
    name: 'craft-desktop', scene: 'CraftLab', query: '?lab=craft', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await capture(page, 'craft-initial'));
      await page.keyboard.press('g');
      await page.waitForTimeout(120);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(220);
      captures.push(await capture(page, 'craft-success'));
      const afterCraft = await inspect(page, 'CraftLab');
      fail(afterCraft.state?.logs?.some((line) => line.includes('accept')), 'Craft transaction was not accepted after resource grant.', failures);
      await page.keyboard.press('d');
      await page.waitForTimeout(180);
      captures.push(await capture(page, 'craft-salvage'));
      return inspect(page, 'CraftLab');
    },
  },
  {
    name: 'ui-desktop', scene: 'UiLab', query: '?lab=ui', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await capture(page, 'ui-initial'));
      await page.keyboard.press('Tab');
      await page.waitForTimeout(180);
      captures.push(await capture(page, 'ui-inventory'));
      for (let index = 0; index < 4; index += 1) {
        await page.keyboard.press('q');
        await page.waitForTimeout(55);
      }
      await page.keyboard.press('e');
      await page.waitForTimeout(280);
      captures.push(await capture(page, 'ui-low-hp-level-up'));
      const after = await inspect(page, 'UiLab');
      fail(after.state?.inventoryOpen === true, 'Inventory overlay did not open.', failures);
      fail((after.state?.hp ?? 100) < 40, 'Low-HP state was not reached.', failures);
      return after;
    },
  },
  {
    name: 'hub-mobile', scene: 'LabHub', query: '', viewport: MOBILE,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await capture(page, 'hub-mobile'));
      fail(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `Canvas is stretched (${before.canvas?.aspect?.toFixed?.(3)}).`, failures);
    },
  },
  {
    name: 'combat-mobile', scene: 'CombatLab', query: '?lab=combat', viewport: MOBILE,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await capture(page, 'combat-mobile'));
      fail(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `Canvas is stretched (${before.canvas?.aspect?.toFixed?.(3)}).`, failures);
    },
  },
];

const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: scenario.viewport, deviceScaleFactor: 1, colorScheme: 'dark' });
    const page = await context.newPage();
    const runtimeErrors = [];
    const warnings = [];
    const requestErrors = [];
    const failures = [];
    const captures = [];

    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
      if (message.type() === 'warning') warnings.push(message.text());
    });
    page.on('pageerror', (error) => runtimeErrors.push(error.stack ?? error.message));
    page.on('requestfailed', (request) => requestErrors.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));
    page.on('response', (response) => { if (response.status() >= 400) requestErrors.push(`${response.status()} ${response.url()}`); });

    try {
      await page.goto(`${BASE_URL}/${scenario.query}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForScene(page, scenario.scene);
      const before = await inspect(page, scenario.scene);

      fail(before.active, `${scenario.scene} is not active.`, failures);
      fail(before.bootHidden, 'Boot overlay is still visible.', failures);
      fail(before.atlasExists, 'Generated atlas is not registered.', failures);
      fail(before.missingFrames.length === 0, `Missing atlas frames: ${before.missingFrames.join(', ')}`, failures);
      fail((before.canvas?.width ?? 0) >= 300 && (before.canvas?.height ?? 0) >= 160, 'Canvas has an invalid rendered size.', failures);
      fail(before.state?.developerOverlayVisible !== true, 'Developer overlay is visible by default.', failures);

      const after = await scenario.run({ page, captures, before, failures }) ?? await inspect(page, scenario.scene);
      fail(runtimeErrors.length === 0, `Runtime errors: ${runtimeErrors.join(' | ')}`, failures);
      fail(requestErrors.length === 0, `Request errors: ${requestErrors.join(' | ')}`, failures);
      fail(!warnings.some((message) => /atlas failed|bad image data|Generated atlas unavailable/i.test(message)), `Atlas warning: ${warnings.join(' | ')}`, failures);
      for (const image of captures) fail(image.bytes > 25_000, `${image.file} is suspiciously small (${image.bytes} bytes).`, failures);

      const result = { ...scenario, before, after, captures, runtimeErrors, warnings, requestErrors, failures, passed: failures.length === 0 };
      delete result.run;
      report.scenarios.push(result);
      report.failures.push(...failures.map((message) => `${scenario.name}: ${message}`));
      console.log(`${result.passed ? 'PASS' : 'FAIL'} ${scenario.name}`);
      for (const message of failures) console.error(`  - ${message}`);
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

const summary = [
  `NOSTORYX visual QA: ${report.failures.length === 0 ? 'PASS' : 'FAIL'}`,
  `Scenarios: ${report.scenarios.length}`,
  `Failures: ${report.failures.length}`,
  ...report.failures.map((message) => `- ${message}`),
].join('\n');

await writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(OUTPUT_DIR, 'summary.txt'), `${summary}\n`);
console.log(summary);
if (report.failures.length > 0) process.exitCode = 1;
