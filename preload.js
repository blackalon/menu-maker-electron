const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (data, defaultPath, filters) => ipcRenderer.invoke('save-file', { data, defaultPath, filters }),
    openMenuWindow: (menuHtmlContent, selectedTemplate, appSettings) => ipcRenderer.invoke('open-menu-window', menuHtmlContent, selectedTemplate, appSettings),
    readLocalFile: (filePath) => ipcRenderer.invoke('read-local-file', filePath)
});