'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, clipboard, nativeImage, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { compile } = require('./app/uiflow');
const documents = new Map();
const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
const smoke = process.argv.includes('--smoke-test');

function trusted(event) {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== page) throw new Error('Untrusted IPC sender');
    return window;
}
function handle(channel, action) {
    ipcMain.handle(channel, (event, ...args) => action(trusted(event), ...args));
}
function send(command) {
    BrowserWindow.getFocusedWindow()?.webContents.send('editor:command', command);
}
function createWindow() {
    const window = new BrowserWindow({
        width: 1100, height: 800, title: 'guiflow', show: !smoke,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, contextIsolation: true, sandbox: true,
        },
    });
    documents.set(window.id, null);
    window.on('closed', () => documents.delete(window.id));
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.loadFile(path.join(__dirname, 'index.html'));
    return window;
}

app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    handle('flow:compile', (_window, code) => compile(code));
    handle('document:open', async window => {
        const result = await dialog.showOpenDialog(window, {
            properties: ['openFile'], filters: [{ name: 'Documents', extensions: ['txt', 'md', 'text'] }],
        });
        if (result.canceled) return null;
        const file = result.filePaths[0];
        const text = await fs.readFile(file, 'utf8');
        documents.set(window.id, file);
        return { file, text };
    });
    handle('document:ready', async window => {
        const file = documents.get(window.id);
        return file ? { file, text: await fs.readFile(file, 'utf8') } : null;
    });
    handle('document:save', async (window, text, saveAs) => {
        if (typeof text !== 'string' || text.length > 1000000) throw new Error('Invalid document');
        let file = documents.get(window.id);
        if (!file || saveAs) {
            const result = await dialog.showSaveDialog(window, {
                defaultPath: file || 'Untitled.txt',
                filters: [{ name: 'Documents', extensions: ['txt', 'md', 'text'] }],
            });
            if (result.canceled) return null;
            file = result.filePath;
        }
        await fs.writeFile(file, text, 'utf8');
        documents.set(window.id, file);
        return { file, text };
    });
    handle('clipboard:write-text', (_window, text) => {
        if (typeof text !== 'string') throw new Error('Invalid clipboard text');
        clipboard.writeText(text);
    });
    handle('clipboard:read-text', () => clipboard.readText());
    handle('clipboard:write-image', (_window, data) => {
        if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,') || data.length > 40000000) throw new Error('Invalid clipboard image');
        const image = nativeImage.createFromDataURL(data);
        if (image.isEmpty()) throw new Error('Empty clipboard image');
        clipboard.writeImage(image);
    });
    const editItems = ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll'].map(command => ({
        label: command === 'selectAll' ? 'Select All' : command[0].toUpperCase() + command.slice(1),
        click: () => send(command),
    }));
    handle('menu:context', window => Menu.buildFromTemplate(editItems).popup({ window }));
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        { label: 'File', submenu: [
            { label: 'New', accelerator: 'CmdOrCtrl+N', click: createWindow },
            { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
            { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
            { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
            { type: 'separator' }, { role: 'quit' },
        ] },
        { label: 'Edit', submenu: editItems },
        { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'toggleDevTools' }] },
    ]));
    const window = createWindow();
    if (smoke) {
        const timer = setTimeout(() => { console.error('SMOKE TIMEOUT'); app.exit(1); }, 30000);
        window.webContents.on('did-finish-load', async () => {
            try {
                const smokeDir = process.env.GUIFLOW_SMOKE_DIR;
                if (!smokeDir || !path.isAbsolute(smokeDir)) throw new Error('GUIFLOW_SMOKE_DIR must be an absolute test output directory');
                await fs.mkdir(smokeDir, { recursive: true });
                documents.set(window.id, path.join(smokeDir, 'roundtrip.txt'));
                const result = await window.webContents.executeJavaScript(`(async () => {
                    if (typeof require !== 'undefined') throw new Error('Renderer Node exposed');
                    if (!window.guiflow || !window.ace) throw new Error('Missing preload or Ace');
                    const data = await window.guiflow.compile('[Start]\\nHello\\n---\\nNext\\n==> End\\n\\n[End]\\nDone');
                    window.guiflowDiagram.refresh(data);
                    if (!document.querySelector('#diagram-1 svg')) throw new Error('Missing SVG');
                    const editor = ace.edit('text');
                    editor.setValue('[Smoke]\\nFile round trip', -1);
                    const saved = await window.guiflow.save(editor.getValue(), false);
                    const opened = await window.guiflow.ready();
                    if (saved.text !== opened.text || opened.text !== editor.getValue()) throw new Error('File round trip failed');
                    editor.insert('!');
                    editor.undo();
                    if (editor.getValue() !== opened.text) throw new Error('Undo failed');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (document.getElementById('status').textContent) throw new Error(document.getElementById('status').textContent);
                    return { svg: true, isolated: true, fileRoundTrip: true, undo: true, title: document.title };
                })()`);
                await fs.writeFile(path.join(smokeDir, 'window.png'), (await window.webContents.capturePage()).toPNG());
                console.log('SMOKE PASS ' + JSON.stringify(result));
                clearTimeout(timer);
                app.exit(0);
            } catch (error) { console.error(error); clearTimeout(timer); app.exit(1); }
        });
    }
}).catch(error => { console.error(error); app.exit(1); });
app.on('window-all-closed', () => app.quit());
