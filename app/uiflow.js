'use strict';
const parser = require('uiflow/app/parser');
const dotwriter = require('uiflow/app/dotwriter');

async function compile(code) {
    if (typeof code !== 'string' || code.length > 1000000) {
        throw new Error('Document must be text, at most 1 MB.');
    }
    const meta = parser.parse(code, '<document>');
    // Graphviz can retain invalid WASM state between edits of record-shaped graphs.
    const { instance } = await import('@viz-js/viz');
    const viz = await instance();
    const svg = viz.renderString(dotwriter.compile(meta), { format: 'svg' });
    return { svg, meta: JSON.stringify(meta) };
}
module.exports = { compile };
