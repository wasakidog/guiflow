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

test('transition labels are circular nodes connected on both sides', async () => {
    const { svg, meta } = await compile('[出発]\n---\n移動\n={キャラ移動}=>カケラショップ\n\n[カケラショップ]\n---\n購入');
    const circle = svg.match(/<g [^>]*class="node transition_label">([\s\S]*?)<\/g>/);
    assert.ok(circle);
    assert.match(circle[1], /キャラ移動/);
    const ellipse = circle[1].match(/<ellipse[^>]*rx="([\d.]+)" ry="([\d.]+)"/);
    assert.ok(ellipse);
    assert.equal(ellipse[1], ellipse[2]);
    assert.equal((svg.match(/class="edge"/g) || []).length, 2);
    const edgeGroups = [...svg.matchAll(/<g [^>]*class="edge">([\s\S]*?)<\/g>/g)];
    assert.equal(edgeGroups.filter(group => group[1].includes('<polygon')).length, 1);
    assert.equal(JSON.parse(meta)['出発'].actions[0].edge, 'キャラ移動');
    assert.deepEqual(Object.keys(JSON.parse(meta)), ['出発', 'カケラショップ']);
});

test('plain arrows have no transition circles', async () => {
    const { svg } = await compile('[Start]\n---\nGo\n==>End');
    assert.doesNotMatch(svg, /transition_label/);
    assert.equal((svg.match(/class="edge"/g) || []).length, 1);
});

test('repeated labels and user names cannot merge transition circles', async () => {
    const { svg } = await compile('[Start]\n---\nOne\n={Move}=>__guiflow_transition_0\nTwo\n={Move}=>__guiflow_transition_0');
    assert.equal((svg.match(/class="node transition_label"/g) || []).length, 2);
    assert.match(svg, /<title>__guiflow_transition_0<\/title>/);
    assert.equal((svg.match(/class="edge"/g) || []).length, 4);
});
