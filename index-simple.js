const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('=== INICIANDO PRUEBA ===');

let mainWindow;

app.on('ready', () => {
    console.log('App ready - creando ventana');
    
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    console.log('Ventana creada');
    mainWindow.show();
    mainWindow.focus();
    
    // Cargar HTML simple
    mainWindow.loadURL('data:text/html,<h1 style="color: green; text-align: center; margin-top: 200px;">¡Ventana funciona!</h1>');
    
    console.log('HTML cargado');
    
    // Abrir devtools para ver errores
    mainWindow.webContents.openDevTools();
});

app.on('window-all-closed', () => {
    console.log('Todas las ventanas cerradas');
    if (process.platform !== 'darwin') app.quit();
});

console.log('Setup completado');
