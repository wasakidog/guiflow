'use strict';
const { app, dialog } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = process.env.GUIFLOW_APP_ROOT || path.resolve(__dirname, '..');
process.argv.push('--hidden');
let prompts = 0;
dialog.showMessageBox = async (_window, options) => {
    assert.equal(options.cancelId, 0);
    return { response: prompts++ === 0 ? 0 : 1 };
};
let timedOut = false;
const timeout = setTimeout(() => { timedOut = true; console.error('REGRESSION TIMEOUT'); app.exit(1); }, 20000);
app.on('browser-window-created', (_event, window) => {
    window.webContents.setBackgroundThrottling(false);
    window.webContents.once('did-finish-load', async () => {
        try {
            const code = await fs.readFile(path.join(__dirname, 'fixtures/reported-flow.txt'), 'utf8');
            const result = await window.webContents.executeJavaScript(`(async () => {
                const editor = ace.edit('text');
                const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
                const text = () => document.getElementById('diagram-1').textContent;
                const waitFor = async marker => {
                    for (let i = 0; i < 100; i++) {
                        if (text().includes(marker) && !document.getElementById('status').textContent) return;
                        await pause(50);
                    }
                    throw new Error('Preview did not update: ' + marker + ': ' + document.getElementById('status').textContent);
                };
                editor.setValue(${JSON.stringify(code)}, -1);
                await waitFor('aaaababab');
                editor.navigateFileEnd();
                editor.insert('\\nAPPENDED');
                await waitFor('APPENDED');
                editor.insert('123');
                await waitFor('APPENDED123');
                editor.insert('\\nNEXTLINE');
                await waitFor('NEXTLINE');
                editor.setValue('invalid text without a section', -1);
                await pause(300);
                if (!document.getElementById('status').textContent) throw new Error('Missing syntax error');
                editor.setValue(${JSON.stringify(code)} + '\\nRECOVERED', -1);
                await waitFor('RECOVERED');
                return { typing: true, newline: true, recovery: true, content: editor.getValue() };
            })()`);
            window.close();
            await new Promise(resolve => setTimeout(resolve, 200));
            assert.equal(prompts, 1);
            assert.equal(window.isDestroyed(), false);
            assert.equal(await window.webContents.executeJavaScript("ace.edit('text').getValue()"), result.content);
            window.once('closed', () => {
                clearTimeout(timeout);
                if (timedOut) return;
                console.log('REGRESSION PASS ' + JSON.stringify({ typing: true, newline: true, recovery: true, cancelClose: true, discardClose: true }));
            });
            window.close();
        } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
    });
});
require(path.join(root, 'index.js'));
