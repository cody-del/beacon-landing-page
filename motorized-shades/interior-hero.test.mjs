import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const script = await readFile(new URL('./dist/interior-hero.js', import.meta.url), 'utf8');

function setup({mobile = true, reducedMotion = false, connection = {}, visible = true} = {}) {
  const listeners = new Map();
  const on = (target, event, fn) => listeners.set(`${target}:${event}`, fn);
  const motion = {matches: reducedMotion, addEventListener: (e, fn) => on('motion', e, fn)};
  const viewport = {matches: mobile};
  const network = {...connection, addEventListener: (e, fn) => on('network', e, fn)};
  const video = {
    dataset: {src: 'desktop.mp4', mobileSrc: 'mobile.mp4'}, paused: true, plays: 0,
    getAttribute: name => video[name],
    pause() { this.paused = true; },
    play() { this.paused = false; this.plays++; return Promise.resolve(); },
    addEventListener: (e, fn) => on('video', e, fn),
  };
  const button = {hidden: true, setAttribute() {}, addEventListener: (e, fn) => on('button', e, fn)};
  const hero = {
    querySelector: selector => selector === '.hero-video' ? video : button,
    getBoundingClientRect: () => ({bottom: visible ? 700 : -1}),
    classList: {add() {}, remove() {}},
  };
  const document = {hidden: false, readyState: 'loading', querySelector: () => hero,
    addEventListener: (e, fn) => on('document', e, fn)};
  let intersection;
  const frames = [];
  const context = {document, navigator: {connection: network},
    window: {matchMedia: query => query.includes('prefers') ? motion : viewport,
      addEventListener: (e, fn) => on('window', e, fn)},
    requestAnimationFrame: fn => frames.push(fn),
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
  };
  context.window.IntersectionObserver = context.IntersectionObserver;
  vm.runInNewContext(script, context);
  return {video, button, motion, network, document, viewport,
    load: () => listeners.get('window:load')(), frame: () => frames.shift()?.(),
    start: () => { listeners.get('window:load')(); frames.shift()?.(); frames.shift()?.(); },
    event: (target, event) => listeners.get(`${target}:${event}`)(),
    visible: value => intersection([{isIntersecting: value}])};
}

test('automatic media loading gives the initial hero a paint opportunity', () => {
  const h = setup();
  h.load();
  assert.equal(h.video.src, undefined);
  h.frame();
  assert.equal(h.video.src, undefined);
  h.frame();
  assert.equal(h.video.src, 'mobile.mp4');
  assert.equal(h.video.paused, false);
});

test('mobile starts the smaller video automatically after initial loading, even on 3G', () => {
  const h = setup({connection: {effectiveType: '3g', downlink: 0.5}});
  assert.equal(h.video.src, undefined);
  h.start();
  assert.equal(h.video.src, 'mobile.mp4');
  assert.equal(h.video.paused, false);
});

test('desktop keeps the original video and rotation does not trigger a second source download', () => {
  const h = setup({mobile: false});
  h.start();
  assert.equal(h.video.src, 'desktop.mp4');
  h.viewport.matches = true;
  h.visible(false); h.visible(true);
  assert.equal(h.video.src, 'desktop.mp4');
});

test('offscreen hero waits, starts when visible, and pauses offscreen or in a hidden tab', () => {
  const h = setup({visible: false});
  h.start();
  assert.equal(h.video.src, undefined);
  h.visible(true);
  assert.equal(h.video.paused, false);
  h.visible(false);
  assert.equal(h.video.paused, true);
  h.visible(true);
  h.document.hidden = true; h.event('document', 'visibilitychange');
  assert.equal(h.video.paused, true);
  h.document.hidden = false; h.event('document', 'visibilitychange');
  assert.equal(h.video.paused, false);
});

for (const [name, options] of [['reduced motion', {reducedMotion: true}], ['data saving', {connection: {saveData: true}}]]) {
  test(`${name} keeps the poster unless the visitor explicitly chooses Play`, () => {
    const h = setup(options);
    h.start();
    assert.equal(h.video.src, undefined);
    assert.equal(h.button.textContent, 'Play video');
    h.event('button', 'click');
    assert.equal(h.video.paused, false);
  });
}

test('a user pause survives connection changes and returning to the hero', () => {
  const h = setup();
  h.start(); h.event('button', 'click');
  h.network.effectiveType = '3g'; h.event('network', 'change');
  h.visible(false); h.visible(true);
  assert.equal(h.video.paused, true);
  assert.equal(h.button.textContent, 'Play video');
});

test('a new reduced-motion preference pauses automatic playback', () => {
  const h = setup();
  h.start(); h.motion.matches = true; h.event('motion', 'change');
  assert.equal(h.video.paused, true);
});
