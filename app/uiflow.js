'use strict';
const parser = require('uiflow/app/parser');
const dotwriter = require('uiflow/app/dotwriter');

function toDot(meta) {
    const drawing = structuredClone(meta);
    const names = new Set(Object.keys(meta));
    for (const node of Object.values(meta)) {
        for (const action of node.actions) if (action.direction) names.add(action.direction);
    }
    const transitions = [];
    let sequence = 0;
    for (const [name, node] of Object.entries(meta)) {
        node.actions.forEach((action, index) => {
            if (!action.edge || !action.direction) return;
            let labelId;
            do { labelId = '__guiflow_transition_' + sequence++; } while (names.has(labelId));
            names.add(labelId);
            drawing[name].actions[index].direction = null;
            const quote = JSON.stringify;
            transitions.push(
                `${quote(labelId)} [class="transition_label", shape=circle, label=${quote(action.edge)}, fontsize=9, width=0, height=0, margin="0.06", color="#777777"];`,
                `${quote(node.name)}:action${index} -> ${quote(labelId)} [arrowhead=none];`,
                `${quote(labelId)} -> ${quote(action.direction)};`
            );
        });
    }
    // Remove only the empty description field emitted after a node's title.
    const dot = dotwriter.compile(drawing).replace(
        /^(\s*label = "<title> .*?\\l )\|<see> \\l (?=\||")/gm,
        '$1'
    );
    return dot.replace(/\n}$/, '\n' + transitions.join('\n') + '\n}');
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
