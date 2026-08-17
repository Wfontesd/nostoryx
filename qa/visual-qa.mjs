import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-chromium';

const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const OUTPUT_DIR = path.resolve(process.env.QA_OUTPUT_DIR ?? 'qa-artifacts');
const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 430, height: 932 };
const REQUIRED_ATLAS_FRAMES = [
  'hero_idle', 'hero_run_a', 'hero_run_b', 'hero_jump', 'hero_light', 'hero_heavy', 'hero_cast', 'hero_dash',
  'brute_idle', 'brute_walk', 'brute_windup', 'brute_hit', 'brute_down',
  'slime_idle', 'slime_jump', 'slime_attack', 'slime_hit',
  'wisp_idle', 'wisp_move', 'wisp_cast', 'wisp_hit',
  'skill_quick', 'skill_breaker', 'skill_arc', 'vfx_impact', 'vfx_crescent', 'vfx_heavy_arc',
  'vfx_lightning', 'vfx_sigil', 'vfx_ring', 'vfx_dash', 'vfx_dust', 'portal_arch', 'portal_sigil',
];

await mkdir(OUTPUT_DIR, { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  scenarios: [],
  failures: [],
};

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

async function waitForScene(page, expectedScene) {
  await page.waitForSelector('canvas', { state: 'visible', timeout: 30_000 });
  await page.waitForFunction((sceneKey) => {
    const game = globalThis.__NOSTORYX_DEV_GAME__;
    if (!game?.scene) return false;
    const scene = game.scene.getScene(sceneKey);
    return Boolean(scene?.sys?.isActive?.());
  }, expectedScene, { timeout: 30_000 });
  await page.waitForTimeout(900);
}

async function inspectRuntime(page, expectedScene) {
  return page.evaluate(({ expectedScene, requiredFrames }) => {
    const game = globalThis.__NOSTORYX_DEV_GAME__;
    const scene = game?.scene?.getScene(expectedScene);
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    const atlasExists = Boolean(game?.textures?.exists?.('generated-atlas'));
    const atlas = atlasExists ? game.textures.get('generated-atlas') : null;
    const missingFrames = requiredFrames.filter((frame) => !atlas?.has?.(frame));
    const activeScenes = game?.scene?.getScenes?.(true)?.map((item) => item.sys.settings.key) ?? [];
    const sceneState = scene ? {
      key: scene.sys.settings.key,
      debugVisible: Boolean(scene.debugVisible),
      developerOverlayVisible: Boolean(scene.devOverlay?.visible),
      player: scene.player ? {
        x: Number(scene.player.x.toFixed(1)),
        y: Number(scene.player.y.toFixed(1)),
        vx: Number((scene.player.body?.velocity?.x ?? 0).toFixed(1)),
        vy: Number((scene.player.body?.velocity?.y ?? 0).toFixed(1)),
      } : null,
      dummyHp: typeof scene.dummyHp === 'number' ? scene.dummyHp : null,
      dummyMaxHp: typeof scene.dummyMaxHp === 'number' ? scene.dummyMaxHp : null,
      combo: typeof scene.combo === 'number' ? scene.combo : null,
      monsterCount: Array.isArray(scene.monsters) ? scene.monsters.filter((monster) => monster?.active).length : null,
      playerHp: typeof scene.playerHp === 'number' ? scene.playerHp : null,
      inventoryOpen: typeof scene.inventoryOpen === 'boolean' ? scene.inventoryOpen : null,
      hp: typeof scene.hp === 'number' ? scene.hp : null,
      mp: typeof scene.mp === 'number' ? scene.mp : null,
      selectedIndex: typeof scene.selectedIndex === 'number' ? scene.selectedIndex : null,
      logs: Array.isArray(scene.logs) ? [...scene.logs] : null,
    } : null;

    return {
      activeScenes,
      expectedSceneActive: Boolean(scene?.sys?.isActive?.()),
      rendererType: game?.renderer?.type ?? null,
      atlasExists,
      missingFrames,
      bootHidden: document.querySelector('#boot-status')?.classList.contains('hidden') ?? false,
      canvas: rect ? {
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
        aspect: Number((rect.width / Math.max(1, rect.height)).toFixed(3)),
      } : null,
      sceneState,
    };
  }, { expectedScene, requiredFrames: REQUIRED_ATLAS_FRAMES });
}

async function captureCanvas(page, name) {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  const canvas = page.locator('canvas');
  await canvas.screenshot({ path: filePath, animations: 'allow' });
  const info = await stat(filePath);
  return { file: path.basename(filePath), bytes: info.size };
}

async function hold(page, key, milliseconds) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
}

const scenarios = [
  {
    name: 'hub-desktop', scene: 'LabHub', query: '', viewport: DESKTOP,
    run: async ({ page, captures }) => {
      captures.push(await captureCanvas(page, 'hub-desktop'));
    },
  },
  {
    name: 'movement-desktop', scene: 'MovementLab', query: '?lab=movement', viewport: DESKTOP,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await captureCanvas(page, 'movement-initial'));
      await hold(page, 'KeyD', 720);
      await page.keyboard.press('Space');
      await hold(page, 'KeyD', 620);
      await page.waitForTimeout(180);
      captures.push(await captureCanvas(page, 'movement-course'));
      const after = await inspectRuntime(page, 'MovementLab');
      assert((after.sceneState?.player?.x ?? 0) > (before.sceneState?.player?.x ?? 0) + 180, 'Movement Lab: player did not move far enough.', failures);
      return after;
    },
  },
  {
    name: 'combat-desktop', scene: 'CombatLab', query: '?lab=combat', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await captureCanvas(page, 'combat-initial'));
      await hold(page, 'KeyD', 1460);
      await page.keyboard.press('KeyJ');
      await page.waitForTimeout(90);
      captures.push(await captureCanvas(page, 'combat-light-impact'));
      await page.waitForTimeout(330);
      await page.keyboard.press('KeyK');
      await page.waitForTimeout(155);
      captures.push(await captureCanvas(page, 'combat-heavy-impact'));
      await page.waitForTimeout(760);
      await page.keyboard.press('KeyL');
      await page.waitForTimeout(245);
      captures.push(await captureCanvas(page, 'combat-arc-surge'));
      await page.waitForTimeout(420);
      const after = await inspectRuntime(page, 'CombatLab');
      assert(after.sceneState?.dummyHp < after.sceneState?.dummyMaxHp, 'Combat Lab: attacks did not damage the training target.', failures);
      assert((after.sceneState?.combo ?? 0) > 0, 'Combat Lab: combo counter never advanced.', failures);
      return after;
    },
  },
  {
    name: 'monsters-desktop', scene: 'MonsterLab', query: '?lab=monsters', viewport: DESKTOP,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await captureCanvas(page, 'monsters-initial'));
      await page.keyboard.press('KeyQ');
      await page.keyboard.press('KeyW');
      await page.keyboard.press('KeyE');
      await hold(page, 'KeyD', 1400);
      await page.waitForTimeout(1100);
      captures.push(await captureCanvas(page, 'monsters-ai-engaged'));
      const after = await inspectRuntime(page, 'MonsterLab');
      assert((after.sceneState?.monsterCount ?? 0) >= (before.sceneState?.monsterCount ?? 0) + 3, 'Monster Lab: spawn hotkeys did not add all three archetypes.', failures);
      return after;
    },
  },
  {
    name: 'vfx-desktop', scene: 'VfxLab', query: '?lab=vfx', viewport: DESKTOP,
    run: async ({ page, captures }) => {
      captures.push(await captureCanvas(page, 'vfx-initial'));
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(95);
      captures.push(await captureCanvas(page, 'vfx-slash'));
      await page.waitForTimeout(250);
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(135);
      captures.push(await captureCanvas(page, 'vfx-lightning'));
      await page.waitForTimeout(320);
      await page.keyboard.press('KeyT');
      await page.waitForTimeout(455);
      captures.push(await captureCanvas(page, 'vfx-meteor-impact'));
      return inspectRuntime(page, 'VfxLab');
    },
  },
  {
    name: 'craft-desktop', scene: 'CraftLab', query: '?lab=craft', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await captureCanvas(page, 'craft-initial'));
      await page.keyboard.press('KeyG');
      await page.waitForTimeout(120);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(180);
      captures.push(await captureCanvas(page, 'craft-success'));
      const afterCraft = await inspectRuntime(page, 'CraftLab');
      assert(afterCraft.sceneState?.logs?.some((line) => line.includes('accept')), 'Craft Lab: craft transaction was not accepted after granting resources.', failures);
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(150);
      captures.push(await captureCanvas(page, 'craft-salvage'));
      return inspectRuntime(page, 'CraftLab');
    },
  },
  {
    name: 'ui-desktop', scene: 'UiLab', query: '?lab=ui', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await captureCanvas(page, 'ui-initial'));
      await page.keyboard.press('Tab');
      await page.waitForTimeout(160);
      captures.push(await captureCanvas(page, 'ui-inventory'));
      for (let i = 0; i < 4; i += 1) await page.keyboard.press('KeyQ');
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(260);
      captures.push(await captureCanvas(page, 'ui-low-hp-level-up'));
      const after = await inspectRuntime(page, 'UiLab');
      assert(after.sceneState?.inventoryOpen === true, 'UI Lab: inventory overlay did not open.', failures);
      assert((after.sceneState?.hp ?? 100) < 40, 'UI Lab: low-HP state was not reached.', failures);
      return after;
    },
  },
  {
    name: 'hub-mobile', scene: 'LabHub', query: '', viewport: MOBILE,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await captureCanvas(page, 'hub-mobile'));
      assert(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `Mobile Hub: canvas is stretched (CSS aspect ${before.canvas?.aspect}).`, failures);
    },
  },
  {
    name: 'combat-mobile', scene: 'CombatLab', query: '?lab=combat', viewport: MOBILE,
    run: async ({ page, captures, before, failures }) => {
      captures.push(await captureCanvas(page, 'combat-mobile'));
      assert(before.canvas?.aspect > 1.70 && before.canvas?.aspect < 1.82, `Mobile Combat: canvas is stretched (CSS aspect ${before.canvas?.aspect}).`, failures);
    },
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
});

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const consoleWarnings = [];
    const pageErrors = [];
    const requestFailures = [];
    const badResponses = [];
    const failures = [];
    const captures = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
      if (message.type() === 'warning') consoleWarnings.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
    page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));
    page.on('response', (response) => {
      if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
    });

    try {
      const url = `${BASE_URL}/${scenario.query}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForScene(page, scenario.scene);
      const before = await inspectRuntime(page, scenario.scene);

      assert(before.expectedSceneActive, `${scenario.name}: expected scene ${scenario.scene} is not active.`, failures);
      assert(before.bootHidden, `${scenario.name}: boot overlay is still visible.`, failures);
      assert(before.atlasExists, `${scenario.name}: generated atlas is not registered.`, failures);
      assert(before.missingFrames.length === 0, `${scenario.name}: missing atlas frames: ${before.missingFrames.join(', ')}`, failures);
      assert((before.canvas?.width ?? 0) >= 300 && (before.canvas?.height ?? 0) >= 160, `${scenario.name}: canvas has an invalid rendered size.`, failures);
      assert(before.sceneState?.developerOverlayVisible !== true, `${scenario.name}: developer overlay is visible by default.`, failures);

      const after = await scenario.run({ page, captures, before, failures }) ?? await inspectRuntime(page, scenario.scene);

      assert(consoleErrors.length === 0, `${scenario.name}: console errors: ${consoleErrors.join(' | ')}`, failures);
      assert(pageErrors.length === 0, `${scenario.name}: uncaught page errors: ${pageErrors.join(' | ')}`, failures);
      assert(requestFailures.length === 0, `${scenario.name}: failed requests: ${requestFailures.join(' | ')}`, failures);
      assert(badResponses.length === 0, `${scenario.name}: HTTP errors: ${badResponses.join(' | ')}`, failures);
      assert(!consoleWarnings.some((warning) => warning.includes('Generated atlas unavailable')), `${scenario.name}: generated atlas fallback warning was emitted.`, failures);
      for (const capture of captures) assert(capture.bytes > 35_000, `${scenario.name}: ${capture.file} is suspiciously small (${capture.bytes} bytes).`, failures);

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
      for (const failure of failures) console.error(`  - ${failure}`);
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
