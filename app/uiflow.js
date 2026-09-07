'use strict';
const parser = require('uiflow/app/parser');
const dotwriter = require('uiflow/app/dotwriter');
let renderer;

async function compile(code) {
    if (typeof code !== 'string' || code.length > 1000000) {
        throw new Error('Document must be text, at most 1 MB.');
    }
    const meta = parser.parse(code, '<document>');
    if (!renderer) renderer = import('@viz-js/viz').then(viz => viz.instance());
    const viz = await renderer;
    const svg = viz.renderString(dotwriter.compile(meta), { format: 'svg' });
    return { svg, meta: JSON.stringify(meta) };
}
module.exports = { compile };
