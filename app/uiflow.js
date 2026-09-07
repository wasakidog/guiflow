'use strict';
const parser = require('uiflow/app/parser');
const dotwriter = require('uiflow/app/dotwriter');

function toDot(meta) {
    // Remove only the empty description field emitted after a node's title.
    return dotwriter.compile(meta).replace(
        /^(\s*label = "<title> .*?\\l )\|<see> \\l (?=\||")/gm,
        '$1'
    );
}

async function compile(code) {
    if (typeof code !== 'string' || code.length > 1000000) {
        throw new Error('Document must be text, at most 1 MB.');
    }
    const meta = parser.parse(code, '<document>');
    // Graphviz can retain invalid WASM state between edits of record-shaped graphs.
    const { instance } = await import('@viz-js/viz');
    const viz = await instance();
    const svg = viz.renderString(toDot(meta), { format: 'svg' });
    return { svg, meta: JSON.stringify(meta) };
}
module.exports = { compile };
