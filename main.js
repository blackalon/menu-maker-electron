const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const appIconPath = path.join(__dirname, 'assets', 'icons', 'icon-512x512.png'); // استخدم أيقونة PNG مؤقتاً للتطوير

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, // الأمان أولاً
            contextIsolation: true, // الأمان أولاً
            webSecurity: true // الأمان أولاً
        },
        icon: appIconPath
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools(); // لسهولة التصحيح، قم بإزالة هذا السطر في الإصدار النهائي
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Main Handlers ---
ipcMain.handle('save-file', async (event, { data, defaultPath, filters }) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            defaultPath: defaultPath,
            filters: filters || []
        });

        if (filePath) {
            fs.writeFileSync(filePath, data);
            return { success: true, filePath: filePath };
        }
        return { success: false, message: 'Save dialog cancelled.' };
    } catch (error) {
        console.error("Failed to save file:", error);
        return { success: false, message: error.message || 'An unknown error occurred during saving.' };
    }
});

ipcMain.handle('open-menu-window', async (event, menuHtmlContent, selectedTemplate, appSettings) => {
    const menuWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'menu-preload.js')
        }
    });

    global.menuDataForDisplay = { menuHtmlContent, selectedTemplate, appSettings };

    menuWindow.loadFile('menu.html');
    menuWindow.webContents.openDevTools(); // لسهولة التصحيح، قم بإزالة هذا السطر في الإصدار النهائي
});

ipcMain.handle('get-menu-data-for-display', async (event) => {
    const data = global.menuDataForDisplay;
    global.menuDataForDisplay = null;
    return data;
});

ipcMain.handle('read-local-file', async (event, relativePath) => {
    try {
        const fullPath = path.join(app.getAppPath(), relativePath);
        const data = await fs.promises.readFile(fullPath, 'utf8');
        return { success: true, data: data };
    } catch (error) {
        console.error(`Failed to read local file ${relativePath}:`, error);
        return { success: false, message: error.message || 'Error reading file.' };
    }
});