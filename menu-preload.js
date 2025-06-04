const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('menuData', {
    get: () => ipcRenderer.invoke('get-menu-data-for-display')
});