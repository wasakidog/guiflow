'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { compile } = require('../app/uiflow');
test('compiles original Japanese sample to SVG and metadata', async () => {
    const code = await fs.readFile(path.join(__dirname, '../sample/test01.txt'), 'utf8');
    const result = await compile(code);
    assert.match(result.svg, /<svg/);
    assert.ok(Object.keys(JSON.parse(result.meta)).length >= 3);
});
test('rejects non-text and oversized documents', async () => {
    await assert.rejects(compile(null), /Document must be text/);
    await assert.rejects(compile('a'.repeat(1000001)), /Document must be text/);
});
test('compiles empty documents without hanging', async () => {
    assert.match((await compile('')).svg, /<svg/);
});

test('renders repeated edits and newlines in the reported shop graph', async () => {
    const initial = await fs.readFile(path.join(__dirname, 'fixtures/reported-flow.txt'), 'utf8');
    await compile('');
    assert.match((await compile(initial)).svg, /aaaababab/);
    for (let i = 0; i < 8; i++) {
        const marker = 'AddedLine' + i;
        const result = await compile(initial + '\n' + marker);
        assert.ok(result.svg.includes(marker));
    }
    await assert.rejects(compile('text without a section'));
    assert.ok((await compile(initial.replace('aaaababab', 'REPLACED'))).svg.includes('REPLACED'));
});

function firstNode(svg) {
    return svg.match(/<g id="node1" class="node">([\s\S]*?)<\/g>/)[1];
}

test('title followed by separator has no empty row before actions', async () => {
    const code = '[アイテムダイアログ]\n---\n購入\n==>カケラショップ\nキャンセル\n==>カケラショップ';
    const { svg, meta } = await compile(code);
    const node = firstNode(svg);
    assert.equal((node.match(/<polyline /g) || []).length, 2);
    assert.match(node, /購入/);
    assert.match(node, /キャンセル/);
    assert.equal((svg.match(/class="edge"/g) || []).length, 2);
    assert.deepEqual(JSON.parse(meta)['アイテムダイアログ'].see, []);
});

test('nonempty description remains between title and actions', async () => {
    const { svg } = await compile('[Dialog]\nDescription\n---\nBuy\n==>Shop\nCancel\n==>Shop');
    const node = firstNode(svg);
    assert.equal((node.match(/<polyline /g) || []).length, 3);
    assert.match(node, /Description/);
});

test('title with no description or actions has no empty compartment', async () => {
    const { svg } = await compile('[Title]\n---');
    assert.equal((firstNode(svg).match(/<polyline /g) || []).length, 0);
});
