'use strict';
window.addEventListener('DOMContentLoaded', async () => {
    const api = window.guiflow;
    const editor = window.createFlowEditor();
    const diagram = window.guiflowDiagram;
    const status = document.getElementById('status');
    let file;
    let savedText = '';
    let revision = 0;
    let timer;
    const report = error => { status.textContent = error.message || String(error); };
    const title = () => { document.title = 'guiflow -- ' + (file || 'Untitled') + (editor.getValue() === savedText ? '' : ' *'); };
    const confirmDiscard = () => editor.getValue() === savedText || window.confirm('Discard unsaved changes?');
    const load = data => {
        if (!data) return;
        file = data.file;
        savedText = data.text;
        editor.setValue(data.text, -1);
        title();
    };
    async function refresh(current) {
        try {
            const data = await api.compile(editor.getValue());
            if (current !== revision) return;
            diagram.refresh(data);
            editor.session.clearAnnotations();
            status.textContent = '';
        } catch (error) {
            if (current !== revision) return;
            report(error);
            editor.session.setAnnotations([{ row: 0, column: 0, type: 'error', text: error.message }]);
        }
    }
    editor.session.on('change', () => {
        title();
        clearTimeout(timer);
        const current = ++revision;
        timer = setTimeout(() => refresh(current), 250);
    });
    async function command(name) {
        try {
            switch (name) {
            case 'open': if (confirmDiscard()) load(await api.open()); break;
            case 'save':
            case 'saveAs': {
                const text = editor.getValue();
                const result = await api.save(text, name === 'saveAs');
                if (result) { file = result.file; savedText = text; title(); }
                break;
            }
            case 'copy': await api.copyText(editor.getCopyText()); break;
            case 'cut': await api.copyText(editor.getCopyText()); editor.session.remove(editor.getSelectionRange()); break;
            case 'paste': editor.insert(await api.pasteText()); break;
            case 'undo': editor.undo(); break;
            case 'redo': editor.redo(); break;
            case 'selectAll': editor.selectAll(); break;
            }
        } catch (error) { report(error); }
    }
    api.onCommand(command);
    window.addEventListener('beforeunload', event => { if (!confirmDiscard()) event.returnValue = false; });
    window.addEventListener('contextmenu', event => { event.preventDefault(); api.contextMenu().catch(report); });
    diagram.on('page-click', line => { editor.gotoLine(Number(line) + 1, 0, true); editor.focus(); });
    diagram.on('end-click', text => { editor.setValue(editor.getValue() + text, 1); editor.focus(); });
    document.getElementById('download').addEventListener('click', async () => {
        try {
            const { svg } = await api.compile(editor.getValue());
            const image = new Image();
            image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(image.naturalWidth * 2, 8192);
            canvas.height = Math.min(image.naturalHeight * 2, 8192);
            const context = canvas.getContext('2d');
            context.fillStyle = '#fff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            await api.copyImage(canvas.toDataURL('image/png'));
            status.textContent = 'Copied image to clipboard';
        } catch (error) { report(error); }
    });
    try { load(await api.ready()); } catch (error) { report(error); }
    refresh(revision);
    title();
    editor.focus();
});
