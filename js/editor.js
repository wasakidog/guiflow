'use strict';
window.createFlowEditor = function() {
    const editor = ace.edit('text');
    editor.setTheme('ace/theme/monokai');
    editor.setOptions({ useWorker: false, fontSize: 14 });
    return editor;
};
