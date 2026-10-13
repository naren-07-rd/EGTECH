import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('all in-page navigation targets exist and section IDs are unique', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'duplicate DOM IDs');
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(target), `missing target #${target}`);
  }
});

test('the seven requested narratives occur in the specified order', () => {
  const anchors = ['services', 'work', 'visibility', 'process', 'about', 'feedback', 'philosophy'];
  let previous = -1;
  for (const anchor of anchors) {
    const position = html.indexOf(`id="${anchor}"`);
    assert.ok(position > previous, `section #${anchor} missing or out of order`);
    previous = position;
  }
});

test('the removed sculpture cannot load through markup or the entry script', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html + main, /sculpture\.png|scene\.js|hero-canvas|journey-canvas/);
});

test('organization metadata is valid and contains no invented ratings', () => {
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data.name, 'EG TECH');
  assert.equal(data['@type'], 'Organization');
  assert.equal(data.aggregateRating, undefined);
});
