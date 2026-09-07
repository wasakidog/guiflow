'use strict';

async function confirmDiscard(window, dialog) {
    const { response } = await dialog.showMessageBox(window, {
        type: 'warning', title: 'Unsaved changes',
        message: 'Discard unsaved changes?',
        detail: 'Choose Keep Editing to return to the document and save it.',
        buttons: ['Keep Editing', 'Discard Changes'],
        defaultId: 0, cancelId: 0, noLink: true,
    });
    return response === 1;
}

function installCloseGuard(window, dialog) {
    let pending = false;
    window.webContents.on('will-prevent-unload', () => {
        if (pending) return;
        pending = true;
        confirmDiscard(window, dialog).then(discard => {
            if (discard && !window.isDestroyed()) {
                // The user explicitly chose discard; do not re-enter beforeunload.
                window.destroy();
            }
        }).catch(error => console.error('Close confirmation failed:', error))
            .finally(() => { pending = false; });
    });
}

module.exports = { confirmDiscard, installCloseGuard };
