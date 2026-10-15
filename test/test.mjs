// Loads cmdv into Chromium, serves test/page.html as linkedin.com and pastes for real (the clipboard, cmd+V).
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const root = join(import.meta.dirname, '..');
const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cmdv-')), {
  channel: 'chromium',
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  permissions: ['clipboard-read', 'clipboard-write'],
});
await context.route('https://www.linkedin.com/**', (route) =>
  route.fulfill({ contentType: 'text/html', body: readFileSync(join(import.meta.dirname, 'page.html')) }),
);
const page = await context.newPage();
await page.goto('https://www.linkedin.com/feed/');

const PASTE = process.platform === 'darwin' ? 'Meta+V' : 'Control+V';

/** Puts `items` ({ type: content }) on the clipboard, pastes into `#box`'s editor, returns what the box got. */
async function paste(box, items) {
  await page.evaluate(async (items) => {
    const blobs = {};
    for (const [type, content] of Object.entries(items)) {
      blobs[type] =
        type === 'image/png'
          ? await new Promise((done) => {
              const c = document.createElement('canvas');
              c.width = c.height = 4;
              c.toBlob(done, 'image/png');
            })
          : new Blob([content], { type });
    }
    await navigator.clipboard.write([new ClipboardItem(blobs)]);
  }, items);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('output, [contenteditable]')) el.textContent = '';
  });
  await page.click(`#${box} [contenteditable]`);
  await page.keyboard.press(PASTE);
  await page.waitForTimeout(500);
  return page.evaluate((box) => ({
    got: document.querySelector(`#${box} output`)?.textContent ?? '',
    text: document.querySelector(`#${box} [contenteditable]`).textContent,
  }), box);
}

const IMAGE = { 'image/png': '' };
const got = async (box, items) => (await paste(box, items)).got;

assert.match(await got('post', IMAGE), /^image\.png:image\/png$/, 'post box: a file input outside the page');
assert.match(await got('comment', IMAGE), /:image\/png$/, 'comment box: a hidden file input');
assert.match(await got('editor', IMAGE), /:image\/png$/, 'media editor: a file input in its dialog');
assert.equal(await got('comment', { 'text/plain': 'hi' }), '', 'text is left alone');
assert.equal((await paste('comment', { 'text/plain': 'hi' })).text.includes('hi'), true, 'text still pastes');
assert.equal(
  await got('post', { ...IMAGE, 'text/html': '<p>a table from Word</p>' }),
  '',
  'rich text with a picture of itself stays text',
);
assert.equal((await paste('plain', IMAGE)).got, '', 'no photo button: nothing taken');

await context.close();
console.log('cmdv: all pastes behave');
