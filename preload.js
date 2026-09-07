'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('guiflow', {
    compile: code => ipcRenderer.invoke('flow:compile', code),
    open: () => ipcRenderer.invoke('document:open'),
    save: (text, saveAs) => ipcRenderer.invoke('document:save', text, !!saveAs),
    ready: () => ipcRenderer.invoke('document:ready'),
    copyText: text => ipcRenderer.invoke('clipboard:write-text', text),
    pasteText: () => ipcRenderer.invoke('clipboard:read-text'),
    copyImage: data => ipcRenderer.invoke('clipboard:write-image', data),
    contextMenu: () => ipcRenderer.invoke('menu:context'),
    onCommand: callback => {
        const listener = (_event, command) => callback(command);
        ipcRenderer.on('editor:command', listener);
        return () => ipcRenderer.removeListener('editor:command', listener);
    },
});
