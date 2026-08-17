import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-chromium';
import { PNG } from 'pngjs';

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
  'portal_arch', 'portal_sigil', 'platform_arcane', 'foliage_cluster', 'ruin_pillar', 'arcane_lantern',
];

await mkdir(OUTPUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  runId: process.env.GITHUB_RUN_ID ?? null,
  sourceSha: process.env.GITHUB_SHA ?? null,
  scenarios: [],
  failures: [],
};

function check(value, message, failures) {
  if (!value) failures.push(message);
}

async function focusCanvas(page) {
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 16, y: 16 } });
  await page.evaluate(() => {
    const node = document.querySelector('canvas');
    if (node) {
      node.tabIndex = 0;
      node.focus({ preventScroll: true });
    }
  });
}

async function waitForScene(page, sceneKey) {
  await page.waitForSelector('canvas', { state: 'visible', timeout: 30_000 });
  await page.waitForFunction(
    (key) => Boolean(globalThis.__NOSTORYX_DEV_GAME__?.scene?.getScene(key)?.sys?.isActive?.()),
    sceneKey,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(850);
  await focusCanvas(page);
}

async function inspect(page, sceneKey) {
  return page.evaluate(({ sceneKey: key, requiredFrames }) => {
    const game = globalThis.__NOSTORYX_DEV_GAME__;
    const scene = game?.scene?.getScene(key);
    const rect = document.querySelector('canvas')?.getBoundingClientRect();
    const atlas = game?.textures?.exists?.('generated-atlas') ? game.textures.get('generated-atlas') : null;
    const art = scene?.heroArt?.() ?? scene?.actor ?? scene?.hero ?? null;
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
        dummyHp: Number.isFinite(scene.dummyHp) ? scene.dummyHp : null,
        dummyMaxHp: Number.isFinite(scene.dummyMaxHp) ? scene.dummyMaxHp : null,
        combo: Number.isFinite(scene.combo) ? scene.combo : null,
        monsterCount: Array.isArray(scene.monsters) ? scene.monsters.filter((monster) => monster?.active).length : null,
        selectedIndex: Number.isFinite(scene.selectedIndex) ? scene.selectedIndex : null,
        logs: Array.isArray(scene.logs) ? [...scene.logs] : null,
        inventoryOpen: typeof scene.inventoryOpen === 'boolean' ? scene.inventoryOpen : null,
        hp: Number.isFinite(scene.hp) ? scene.hp : null,
        level: Number.isFinite(scene.level) ? scene.level : null,
        artVisible: art ? Boolean(art.visible && art.alpha > 0 && art.displayWidth > 8 && art.displayHeight > 8) : null,
        targetVisible: target ? Boolean(target.visible && target.alpha > 0 && target.displayWidth > 8 && target.displayHeight > 8) : null,
        keyBindingsReady: Boolean(scene.keys || scene.attackKeys || scene.labKeys || scene.globalKeys),
      } : null,
    };
  }, { sceneKey, requiredFrames: REQUIRED_FRAMES });
}

function pixelMetrics(buffer) {
  const png = PNG.sync.read(buffer);
  let pureBlack = 0;
  let opaque = 0;
  for (let index = 0; index < png.data.length; index += 4) {
    const alpha = png.data[index + 3];
    if (alpha < 10) continue;
    opaque += 1;
    if (png.data[index] < 4 && png.data[index + 1] < 4 && png.data[index + 2] < 4) pureBlack += 1;
  }
  return { width: png.width, height: png.height, pureBlackRatio: opaque > 0 ? pureBlack / opaque : 1 };
}

async function shot(page, name) {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.locator('canvas').screenshot({ path: filePath, animations: 'allow' });
  const buffer = await readFile(filePath);
  const { size } = await stat(filePath);
  return { file: path.basename(filePath), bytes: size, ...pixelMetrics(buffer) };
}

async function differenceRatio(firstFile, secondFile) {
  const first = PNG.sync.read(await readFile(path.join(OUTPUT_DIR, firstFile)));
  const second = PNG.sync.read(await readFile(path.join(OUTPUT_DIR, secondFile)));
  if (first.width !== second.width || first.height !== second.height) return 1;
  let changed = 0;
  const pixels = first.width * first.height;
  for (let index = 0; index < first.data.length; index += 4) {
    const delta = Math.abs(first.data[index] - second.data[index])
      + Math.abs(first.data[index + 1] - second.data[index + 1])
      + Math.abs(first.data[index + 2] - second.data[index + 2]);
    if (delta > 24) changed += 1;
  }
  return changed / pixels;
}

async function press(page, key, holdMs = 90, settleMs = 140) {
  await focusCanvas(page);
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
  await page.waitForTimeout(settleMs);
}

async function setMovementRight(page, value) {
  await page.evaluate((isDown) => {
    const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('MovementLab');
    scene.controller.keys.right.isDown = isDown;
    scene.controller.cursors.right.isDown = isDown;
  }, value);
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
  await page.waitForTimeout(100);
}

const scenarios = [
  {
    name: 'hub-desktop', scene: 'LabHub', query: '', viewport: DESKTOP,
    run: async ({ page, captures }) => { captures.push(await shot(page, 'hub-desktop')); return 1; },
  },
  {
    name: 'movement-desktop', scene: 'MovementLab', query: '?lab=movement', viewport: DESKTOP,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await shot(page, 'movement-initial'));
      await setMovementRight(page, true);
      await page.waitForTimeout(330);
      await press(page, 'Space', 55, 0);
      await page.waitForTimeout(980);
      await setMovementRight(page, false);
      await page.waitForTimeout(160);
      captures.push(await shot(page, 'movement-course'));
      const after = await inspect(page, 'MovementLab');
      check((after.state?.playerX ?? 0) > (before.state?.playerX ?? 0) + 250, 'controller did not run and jump through the first platform', failures);
      return after;
    },
  },
  {
    name: 'combat-desktop', scene: 'CombatLab', query: '?lab=combat', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await shot(page, 'combat-initial'));
      let maxCombo = 0;
      await positionCombatant(page); await press(page, 'j', 80, 45); maxCombo = Math.max(maxCombo, (await inspect(page, 'CombatLab')).state?.combo ?? 0); captures.push(await shot(page, 'combat-light-impact'));
      await page.waitForTimeout(310);
      await positionCombatant(page); await press(page, 'k', 90, 120); maxCombo = Math.max(maxCombo, (await inspect(page, 'CombatLab')).state?.combo ?? 0); captures.push(await shot(page, 'combat-heavy-impact'));
      await page.waitForTimeout(730);
      await positionCombatant(page); await press(page, 'l', 90, 190); maxCombo = Math.max(maxCombo, (await inspect(page, 'CombatLab')).state?.combo ?? 0); captures.push(await shot(page, 'combat-arc-surge'));
      const after = await inspect(page, 'CombatLab');
      check(after.state?.dummyHp < after.state?.dummyMaxHp, 'keyboard attacks did not damage the target', failures);
      check(maxCombo > 0, 'combo state never advanced during an impact window', failures);
      check(await differenceRatio('combat-initial.png', 'combat-arc-surge.png') > 0.004, 'Arc Surge produced no meaningful visual delta', failures);
      return after;
    },
  },
  {
    name: 'monsters-desktop', scene: 'MonsterLab', query: '?lab=monsters', viewport: DESKTOP,
    run: async ({ page, before, captures, failures }) => {
      captures.push(await shot(page, 'monsters-initial'));
      await page.evaluate(() => {
        const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('MonsterLab');
        scene.spawnMonster('slime', 650);
        scene.spawnMonster('wisp', 785);
        scene.spawnMonster('brute', 1120);
        scene.player.setPosition(610, scene.player.y);
      });
      await page.waitForTimeout(1150);
      captures.push(await shot(page, 'monsters-ai-engaged'));
      const after = await inspect(page, 'MonsterLab');
      check((after.state?.monsterCount ?? 0) >= (before.state?.monsterCount ?? 0) + 3, 'monster factory did not create all archetypes', failures);
      return after;
    },
  },
  {
    name: 'vfx-desktop', scene: 'VfxLab', query: '?lab=vfx', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await shot(page, 'vfx-initial'));
      await page.evaluate(() => globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('VfxLab').playSlash());
      await page.waitForTimeout(90); captures.push(await shot(page, 'vfx-slash'));
      await page.waitForTimeout(250); await page.evaluate(() => globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('VfxLab').playLightning());
      await page.waitForTimeout(120); captures.push(await shot(page, 'vfx-lightning'));
      await page.waitForTimeout(300); await page.evaluate(() => globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('VfxLab').playMeteor());
      await page.waitForTimeout(430); captures.push(await shot(page, 'vfx-meteor-impact'));
      check(await differenceRatio('vfx-initial.png', 'vfx-meteor-impact.png') > 0.004, 'meteor produced no meaningful visual delta', failures);
      return inspect(page, 'VfxLab');
    },
  },
  {
    name: 'craft-desktop', scene: 'CraftLab', query: '?lab=craft', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await shot(page, 'craft-initial'));
      await page.evaluate(() => {
        const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('CraftLab');
        scene.grantResources();
        scene.craftSelected();
      });
      await page.waitForTimeout(220); captures.push(await shot(page, 'craft-success'));
      const crafted = await inspect(page, 'CraftLab');
      check(crafted.state?.logs?.some((line) => line.includes('accept')), 'craft transaction was not accepted after refill', failures);
      await page.evaluate(() => globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('CraftLab').dismantleSelected());
      await page.waitForTimeout(180); captures.push(await shot(page, 'craft-salvage'));
      return inspect(page, 'CraftLab');
    },
  },
  {
    name: 'ui-desktop', scene: 'UiLab', query: '?lab=ui', viewport: DESKTOP,
    run: async ({ page, captures, failures }) => {
      captures.push(await shot(page, 'ui-initial'));
      await page.evaluate(() => {
        const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('UiLab');
        scene.inventoryOpen = true;
        scene.inventory.setVisible(true);
        scene.renderHud();
      });
      await page.waitForTimeout(120); captures.push(await shot(page, 'ui-inventory'));
      await page.evaluate(() => {
        const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('UiLab');
        scene.inventoryOpen = false;
        scene.inventory.setVisible(false);
        for (let index = 0; index < 4; index += 1) scene.damagePulse();
        scene.levelUp();
      });
      await page.waitForTimeout(230); captures.push(await shot(page, 'ui-low-hp-level-up'));
      await page.evaluate(() => {
        const scene = globalThis.__NOSTORYX_DEV_GAME__.scene.getScene('UiLab');
        scene.inventoryOpen = true;
        scene.inventory.setVisible(true);
        scene.renderHud();
      });
      const after = await inspect(page, 'UiLab');
      check(after.state?.inventoryOpen === true, 'inventory overlay did not enter visible state', failures);
      check((after.state?.hp ?? 100) < 40, 'low-HP state was not reached', failures);
      check(await differenceRatio('ui-initial.png', 'ui-inventory.png') > 0.02, 'inventory overlay is not visually distinct', failures);
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
      check(before.active, `${scenario.scene} is not active`, failures);
      check(before.bootHidden, 'boot overlay remains visible', failures);
      check(before.atlasExists, 'generated atlas is absent', failures);
      check(before.missingFrames.length === 0, `missing atlas frames: ${before.missingFrames.join(', ')}`, failures);
      check(before.state?.devOverlayVisible !== true, 'developer overlay is visible by default', failures);
      check(before.state?.keyBindingsReady, 'scene input bindings are not initialized', failures);
      check(before.state?.artVisible !== false, 'primary generated art is invisible', failures);
      check(before.state?.targetVisible !== false, 'target generated art is invisible', failures);

      const after = await scenario.run({ page, before, captures, failures }) ?? await inspect(page, scenario.scene);
      check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`, failures);
      check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`, failures);
      check(requestFailures.length === 0, `failed requests: ${requestFailures.join(' | ')}`, failures);
      check(badResponses.length === 0, `HTTP errors: ${badResponses.join(' | ')}`, failures);
      check(!consoleWarnings.some((warning) => /Generated atlas unavailable|texImage2D|bad image data/i.test(warning)), `atlas/WebGL warning: ${consoleWarnings.join(' | ')}`, failures);
      for (const capture of captures) {
        check(capture.bytes > 90_000, `${capture.file} is suspiciously small (${capture.bytes} bytes)`, failures);
        check(capture.pureBlackRatio < 0.03, `${capture.file} contains ${(capture.pureBlackRatio * 100).toFixed(1)}% pure-black pixels`, failures);
      }

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
await writeFile(
  path.join(OUTPUT_DIR, 'summary.txt'),
  [
    `NOSTORYX visual QA: ${report.passed ? 'PASS' : 'FAIL'}`,
    `Scenarios: ${report.scenarios.length}`,
    `Failures: ${report.failures.length}`,
    ...report.failures.map((failure) => `- ${failure}`),
  ].join('\n'),
);

if (!report.passed) process.exitCode = 1;
