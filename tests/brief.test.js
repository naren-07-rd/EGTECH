import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrief, makeEmailLink, isContactEmail } from '../src/brief.js';

test('project brief preserves user content and multiple services', () => {
  const data = new FormData();
  data.set('name', '  Alex Morgan  '); data.set('email', 'alex@example.com');
  data.append('service', 'Website'); data.append('service', 'Automation');
  data.set('idea', 'A & B\nA connected client portal.');
  const result = createBrief(data);
  assert.match(result, /Name: Alex Morgan/);
  assert.match(result, /Website, Automation/);
  assert.match(result, /A & B\nA connected client portal\./);
  assert.match(result, /Company: Not specified/);
});
test('empty service choice has a useful fallback', () => {
  assert.match(createBrief(new FormData()), /Let’s explore together/);
});
test('no invented or invalid inbox is linked', () => {
  for (const value of ['', undefined, 'not-an-email', 'a@b.com?bcc=other@b.com', 'a@b.com\n']) {
    assert.equal(isContactEmail(value), false);
    assert.equal(makeEmailLink(value, 'brief'), null);
  }
});
test('email body is encoded so project text cannot inject recipients or parameters', () => {
  const brief = 'Hello &bcc=other@example.com\n新项目 #1';
  const result = makeEmailLink('studio@example.com', brief);
  assert.ok(result.startsWith('mailto:studio@example.com?'));
  const params = new URLSearchParams(result.split('?')[1]);
  assert.equal(params.get('body'), brief);
  assert.equal(params.get('bcc'), null);
});
