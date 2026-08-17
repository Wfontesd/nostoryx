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
  'slime_idle', 'slime_jump', 'slime_attack', 'slime_hit', 'wisp_idle', 'wisp_move', 'wisp_cast', 'wisp_hit',
  'skill_quick', 'skill_breaker', 'skill_arc', 'skill_dash', 'skill_heal', 'skill_sigils',
  'vfx_impact', 'vfx_crescent', 'vfx_heavy_arc', 'vfx_lightning', 'vfx_sigil', 'vfx_ring', 'vfx_dash', 'vfx_dust',
  'portal_arch', 'portal_sigil', 'platform_arcane',
];

await mkdir(OUTPUT_DIR, { recursive: true });
const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, scenarios: [], failures: [] };
const check = (value, message, failures) => { if (!value) failures.push(message); };

async function waitForScene(page, sceneKey) {
  await page.waitForSelector('canvas', { state: 'visible', timeout: 30_000 });
  await page.waitForFunction((key) => Boolean(globalThis.__NOSTORYX_DEV_GAME__?.scene?.getScene(key)?.sys?.isActive?.()), sceneKey, { timeout: 30_000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    canvas.tabIndex = 0;
    canvas.focus({ preventScroll: true });
    window.focus();
  });
  await page.waitForTimeout(100);
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
      active: Boolean(scene?.sys?.isActive?.()),
      bootHidden: document.querySelector('#boot-status')?.classList.contains('hidden') ?? false,
      atlasExists: Boolean(atlas),
      missingFrames: requiredFrames.filter((frame) => !atlas?.has?.(frame)),
      canvas: rect ? { width: rect.width, height: rect.height, aspect: rect.width / Math.max(1, rect.height) } : null,
      state: scene ? {
        devOverlayVisible: Boolean(scene.devOverlay?.visible),
        playerX: scene.player?.x ?? null,
        playerY: scene.player?.y ?? null,
        dummyHp: typeof scene.dummyHp === 'number' ? scene.dummyHp : null,
        dummyMaxHp: typeof scene.dummyMaxHp === 'number' ? scene.dummyMaxHp : null,
        combo: typeof scene.combo === 'number' ? scene.combo : null,
        monsterCount: Array.isArray(scene.monsters) ? scene.monsters.filter((monster) => monster?.active).length : null,
        selectedIndex: typeof scene.selectedIndex === 'number' ? scene.selectedIndex : null,
        logs: Array.isArray(scene.logs) ? [...scene.logs] : null,
        inventoryOpen: typeof scene.inventoryOpen === 'boolean' ? scene.inventoryOpen : null,
        hp: typeof scene.hp === 'number' ? scene.hp : null,
        artVisible: art ? Boolean(art.visible && art.alpha > 0 && art.displayWidth > 2 && art.displayHeight > 2) : null,
        targetVisible: target ? Boolean(target.visible && target.alpha > 0 && target.displayWidth > 2 && target.displayHeight > 2) : null,
      } : null,
    };
  }, { sceneKey, requiredFrames: REQUIRED_FRAMES });
}

async function press(page, key, delay = 110, settle = 140) {
  await page.keyboard.down(key);
  await page.waitForTimeout(delay);
  await page.keyboard.up(key);
  await page.waitForTimeout(settle);
}

async function hold(page, key, milliseconds) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
  await page.waitForTimeout(160);
}

async function shot(page, name) {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.locator('canvas').screenshot({ path: filePath, animations: 'allow' });
  const { size } = await stat(filePath);
  return { file: path.basename(filePath), bytes: size };
}

async function positionCombatant(page) {
  await page.evaluate(() => {
    const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('CombatLab');
    scene.player.setPosition(scene.dummy.x - 104, scene.dummy.y);
    scene.player.setVelocity(0, 0);
    scene.controller.facing = 1;
    scene.player.setFlipX(false);
    scene.syncHeroArt?.();
  });
  await page.waitForTimeout(120);
}

const scenarios = [
  { name: 'hub-desktop', scene: 'LabHub', query: '', viewport: DESKTOP, run: async ({ page, captures }) => captures.push(await shot(page, 'hub-desktop')) },
  {
    name: 'movement-desktop', scene: 'MovementLab', query: '?lab=movement', viewport: DESKTOP,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await shot(page, 'movement-initial'));
      await hold(page, 'd', 900);
      await press(page, 'Space', 90, 30);
      await hold(page, 'd', 650);
      captures.push(await shot(page, 'movement-course'));
      const after = await inspect(page, 'MovementLab');
      check((after.state?.playerX ?? 0) > (before.state?.playerX ?? 0) + 250, 'movement input did not traverse the scene', failures);
      return after;
    },
  },
  {
    name: 'combat-desktop', scene: 'CombatLab', query: '?lab=combat', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await shot(page, 'combat-initial'));
      await positionCombatant(page);
      await press(page, 'j', 100, 42);
      captures.push(await shot(page, 'combat-light-impact'));
      await page.waitForTimeout(300);
      await positionCombatant(page);
      await press(page, 'k', 100, 105);
      captures.push(await shot(page, 'combat-heavy-impact'));
      await page.waitForTimeout(760);
      await positionCombatant(page);
      await press(page, 'l', 100, 175);
      captures.push(await shot(page, 'combat-arc-surge'));
      await page.waitForTimeout(320);
      const after = await inspect(page, 'CombatLab');
      check(after.state?.dummyHp < after.state?.dummyMaxHp, 'keyboard attacks did not damage the target', failures);
      check((after.state?.combo ?? 0) > 0, 'combo counter never advanced', failures);
      return after;
    },
  },
  {
    name: 'monsters-desktop', scene: 'MonsterLab', query: '?lab=monsters', viewport: DESKTOP,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await shot(page, 'monsters-initial'));
      await press(page, 'q'); await press(page, 'w'); await press(page, 'e');
      await hold(page, 'd', 1350);
      await page.waitForTimeout(850);
      captures.push(await shot(page, 'monsters-ai-engaged'));
      const after = await inspect(page, 'MonsterLab');
      check((after.state?.monsterCount ?? 0) >= (before.state?.monsterCount ?? 0) + 3, 'spawn hotkeys did not add all archetypes', failures);
      return after;
    },
  },
  {
    name: 'vfx-desktop', scene: 'VfxLab', query: '?lab=vfx', viewport: DESKTOP,
    run: async ({ page, captures }) => {
      captures.push(await shot(page, 'vfx-initial'));
      await press(page, 'q', 90, 35); captures.push(await shot(page, 'vfx-slash'));
      await page.waitForTimeout(240); await press(page, 'e', 90, 90); captures.push(await shot(page, 'vfx-lightning'));
      await page.waitForTimeout(300); await press(page, 't', 90, 420); captures.push(await shot(page, 'vfx-meteor-impact'));
      return inspect(page, 'VfxLab');
    },
  },
  {
    name: 'craft-desktop', scene: 'CraftLab', query: '?lab=craft', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await shot(page, 'craft-initial'));
      await press(page, 'g'); await press(page, 'Enter', 110, 180);
      captures.push(await shot(page, 'craft-success'));
      const crafted = await inspect(page, 'CraftLab');
      check(crafted.state?.logs?.some((line) => line.includes('accept')), 'craft was not accepted after refill', failures);
      await press(page, 'd', 100, 170); captures.push(await shot(page, 'craft-salvage'));
      return inspect(page, 'CraftLab');
    },
  },
  {
    name: 'ui-desktop', scene: 'UiLab', query: '?lab=ui', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await shot(page, 'ui-initial'));
      await press(page, 'Tab'); captures.push(await shot(page, 'ui-inventory'));
      await press(page, 'Tab');
      for (let i = 0; i < 4; i += 1) await press(page, 'q', 80, 130);
      await press(page, 'e', 90, 210); captures.push(await shot(page, 'ui-low-hp-level-up'));
      await press(page, 'Tab');
      const after = await inspect(page, 'UiLab');
      check(after.state?.inventoryOpen === true, 'inventory overlay did not reopen', failures);
      check((after.state?.hp ?? 100) < 40, 'low-HP state was not reached', failures);
      return after;
    },
  },
  {
    name: 'hub-mobile', scene: 'LabHub', query: '', viewport: MOBILE,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await shot(page, 'hub-mobile'));
      check(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `canvas stretched to ${before.canvas?.aspect}`, failures);
    },
  },
  {
    name: 'combat-mobile', scene: 'CombatLab', query: '?lab=combat', viewport: MOBILE,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await shot(page, 'combat-mobile'));
      check(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `canvas stretched to ${before.canvas?.aspect}`, failures);
    },
  },
];

const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: scenario.viewport, deviceScaleFactor: 1, colorScheme: 'dark' });
    const page = await context.newPage();
    const failures = []; const captures = []; const consoleErrors = []; const consoleWarnings = []; const pageErrors = []; const requestFailures = []; const badResponses = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); if (message.type() === 'warning') consoleWarnings.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
    page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));
    page.on('response', (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });

    try {
      await page.goto(`${BASE_URL}/${scenario.query}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForScene(page, scenario.scene);
      const before = await inspect(page, scenario.scene);
      check(before.active, `${scenario.scene} is not active`, failures);
      check(before.bootHidden, 'boot overlay remains visible', failures);
      check(before.atlasExists, 'generated atlas is absent', failures);
      check(before.missingFrames.length === 0, `missing atlas frames: ${before.missingFrames.join(', ')}`, failures);
      check(before.state?.devOverlayVisible !== true, 'developer overlay is visible by default', failures);
      check(before.state?.artVisible !== false, 'primary generated art is invisible', failures);
      check(before.state?.targetVisible !== false, 'target generated art is invisible', failures);

      const after = await scenario.run({ page, before, captures, failures }) ?? await inspect(page, scenario.scene);
      check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`, failures);
      check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`, failures);
      check(requestFailures.length === 0, `failed requests: ${requestFailures.join(' | ')}`, failures);
      check(badResponses.length === 0, `HTTP errors: ${badResponses.join(' | ')}`, failures);
      check(!consoleWarnings.some((warning) => /Generated atlas unavailable|texImage2D|bad image data/i.test(warning)), `atlas/WebGL warning: ${consoleWarnings.join(' | ')}`, failures);
      for (const capture of captures) check(capture.bytes > 35_000, `${capture.file} is suspiciously small (${capture.bytes} bytes)`, failures);

      const result = { name: scenario.name, scene: scenario.scene, viewport: scenario.viewport, before, after, captures, consoleErrors, consoleWarnings, pageErrors, requestFailures, badResponses, failures, passed: failures.length === 0 };
      report.scenarios.push(result); report.failures.push(...failures.map((message) => `${scenario.name}: ${message}`));
      console.log(`${result.passed ? 'PASS' : 'FAIL'} ${scenario.name}`); failures.forEach((message) => console.error(`  - ${message}`));
    } catch (error) {
      const message = error?.stack ?? String(error);
      report.scenarios.push({ name: scenario.name, scene: scenario.scene, viewport: scenario.viewport, failures: [message], passed: false });
      report.failures.push(`${scenario.name}: ${message}`); console.error(`FAIL ${scenario.name}\n${message}`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }

report.passed = report.failures.length === 0;
await writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(OUTPUT_DIR, 'summary.txt'), [`NOSTORYX visual QA: ${report.passed ? 'PASS' : 'FAIL'}`, `Scenarios: ${report.scenarios.length}`, `Failures: ${report.failures.length}`, ...report.failures.map((failure) => `- ${failure}`)].join('\n'));
if (!report.passed) process.exitCode = 1;
