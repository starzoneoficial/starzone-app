const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const config = require("./package.json");

console.log('=== DEBUG MODE START ===');

let mainWindow;
let startupError = null;

try {
    // 1. Configuración Flash
    console.log('1. Configurando Flash...');
    let ppapi_flash_path;
    
    if (process.platform == 'win32') {
        if (process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) {
            ppapi_flash_path = path.join(app.getAppPath(), '../flash/pepflashplayer64.dll');
        } else {
            ppapi_flash_path = path.join(app.getAppPath(), '../flash/pepflashplayer32.dll');
        }
    }
    
    if (ppapi_flash_path) {
        console.log('Flash path:', ppapi_flash_path);
        app.commandLine.appendSwitch('ppapi-flash-path', ppapi_flash_path);
    }
    
    // 2. Deshabilitar Discord RPC temporalmente
    console.log('2. Deshabilitando Discord RPC...');
    
    // 3. Crear ventana SIMPLE
    app.on('ready', () => {
        console.log('3. App ready - creating window');
        
        try {
            mainWindow = new BrowserWindow({
                width: 1280,
                height: 720,
                show: true,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    webSecurity: false
                }
            });
            
            console.log('4. Window created');
            
            // Mostrar inmediatamente
            mainWindow.show();
            mainWindow.focus();
            console.log('5. Window shown and focused');
            
            // Abrir devtools para ver errores
            mainWindow.webContents.openDevTools();
            console.log('6. DevTools opened');
            
            // Intentar cargar tu HTML
            console.log('7. Loading index.html...');
            mainWindow.loadFile("index.html").then(() => {
                console.log('8. index.html loaded successfully');
            }).catch(err => {
                console.error('9. ERROR loading index.html:', err);
                // Cargar página de error
                mainWindow.loadURL('data:text/html,<h1>Error loading app</h1><pre>' + err.toString() + '</pre>');
            });
            
        } catch (windowError) {
            console.error('ERROR creating window:', windowError);
            startupError = windowError;
        }
    });
    
    app.on('window-all-closed', () => {
        console.log('All windows closed');
        if (process.platform !== 'darwin') app.quit();
    });
    
} catch (initError) {
    console.error('INIT ERROR:', initError);
    startupError = initError;
}

console.log('=== DEBUG MODE SETUP COMPLETE ===');
