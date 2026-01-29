const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const Menu = require('electron').Menu;
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const path = require('path');
const Credentials = require("./credentials/credentials");
const settings = require("electron-settings");
const defaultSettings = require("./defaultSettings.json");
const config = require("./package.json");
const https = require('https');
const axios = require('axios');

let mainWindow;
const playTime = Date.now();

settings.configure({
    atomicSave: true,
    fileName: 'settings.json',
    prettify: true
});

// DISCORD RPC SIMPLIFICADO
const RPC = require('discord-rpc');
const clientId = '889089795698081823';
let rpc = null;

// Función MUY SIMPLE para Discord RPC
function setupDiscordRPC() {
    if (!settings.getSync().privacy) {
        console.log('Discord RPC desactivado por configuración de privacidad');
        return;
    }
    
    try {
        rpc = new RPC.Client({ transport: 'ipc' });
        
        rpc.on('ready', () => {
            console.log('Discord RPC listo');
            updateDiscordPresence();
            
            // Actualizar cada 30 segundos
            setInterval(updateDiscordPresence, 30000);
        });
        
        rpc.login({ clientId: clientId }).catch(console.error);
        
    } catch (error) {
        console.log('No se pudo conectar a Discord RPC:', error.message);
    }
}

// Función para actualizar presencia
function updateDiscordPresence() {
    if (!rpc || !settings.getSync().privacy) return;
    
    // Datos por defecto (no logueado)
    let activity = {
        state: "🗺️ In StarZone Client",
        startTimestamp: playTime,
        largeImageKey: "logo_default",
        largeImageText: "StarZone - Space MMORPG",
        buttons: [
            { label: "Visit Website", url: "https://starzone.se/" },
            { label: "Join Discord", url: "https://starzone.se/discord.php" }
        ]
    };
    
    // Intentar obtener información del usuario
    try {
        if (mainWindow && mainWindow.webContents) {
            // Obtener cookies de sesión
            session.defaultSession.cookies.get({ url: "https://" + config.serverURL })
                .then(cookies => {
                    const sessionCookie = cookies.find(c => c.name === "PHPSESSID");
                    
                    if (sessionCookie) {
                        // Usuario tiene sesión, intentar obtener datos
                        getUserData(sessionCookie.value).then(userData => {
                            if (userData && userData.logged) {
                                activity.details = `👤 ${userData.pilotName}`;
                                activity.state = `✨ ${userData.rankName} 🆙 Level ${userData.level}`;
                                
                                if (userData.onlineInMap && userData.inMap) {
                                    activity.details += ` | 🗺️ ${userData.inMap}`;
                                }
                            }
                            
                            // Establecer actividad
                            rpc.setActivity(activity).catch(() => {});
                        }).catch(() => {
                            // Si falla, usar datos por defecto
                            rpc.setActivity(activity).catch(() => {});
                        });
                    } else {
                        // No hay sesión, usar datos por defecto
                        rpc.setActivity(activity).catch(() => {});
                    }
                })
                .catch(() => {
                    rpc.setActivity(activity).catch(() => {});
                });
        } else {
            rpc.setActivity(activity).catch(() => {});
        }
    } catch (error) {
        // En caso de error, intentar al menos establecer actividad básica
        try {
            rpc.setActivity(activity).catch(() => {});
        } catch (e) {}
    }
}

// Función para obtener datos del usuario
async function getUserData(sessionId) {
    return new Promise((resolve) => {
        const options = {
            hostname: config.serverURL,
            path: '/apiUser.php',
            method: 'GET',
            headers: {
                'Cookie': `PHPSESSID=${sessionId}`
            },
            timeout: 5000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (e) {
                    resolve({ logged: false });
                }
            });
        });
        
        req.on('error', () => {
            resolve({ logged: false });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({ logged: false });
        });
        
        req.end();
    });
}

if (!settings.getSync().check) {
    settings.setSync(defaultSettings);
}

let argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('dev', {
        alias: 'd',
        type: 'boolean',
        description: 'Run in development mode'
    })
    .epilog('for more information visit https://starzone.se/')
    .argv;

async function createWindow() {
    mainWindow = new BrowserWindow({
        'width': settings.getSync().client.width,
        'height': settings.getSync().client.height,
        'x': settings.getSync().client.x,
        'y': settings.getSync().client.y,
        'icon': __dirname + '/icon.png',
        'webPreferences': {
            'preload': `${__dirname}/inject/main.js`,
            'contextIsolation': true,
            'nodeIntegration': true,
            'plugins': true,
            'devTools': argv.dev,
            'enableRemoteModule': true
        },
    });

    let credentials = new Credentials(BrowserWindow, mainWindow, settings, ipcMain);

    if (argv.dev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile("index.html");

    settingsWindow(mainWindow, "client");

    // Iniciar Discord RPC después de cargar la ventana
    setTimeout(() => {
        setupDiscordRPC();
    }, 3000);

    // Actualizar presencia cuando se navegue
    mainWindow.webContents.on('did-navigate', () => {
        setTimeout(updateDiscordPresence, 2000);
    });

    // MANEJADOR MEJORADO PARA NUEVAS VENTANAS - CON SOPORTE PARA MÚLTIPLES URLs
    mainWindow.webContents.on('new-window', async function(e, url) {
        e.preventDefault();

        // Lista de URLs que deben abrirse dentro de la app
        const internalUrls = [
            'https://starzone.se',
            'https://www.starzone.se',
            'https://stargallifrey.digital', 
            'https://www.stargallifrey.digital'
        ];

        // Verificar si la URL debe abrirse internamente
        let shouldOpenInternally = false;
        let windowType = "client";
        
        for (const internalUrl of internalUrls) {
            if (url.startsWith(internalUrl)) {
                shouldOpenInternally = true;
                
                // Determinar el tipo de ventana según la URL
                if (url.includes('starzone.se/map')) {
                    windowType = "game";
                }
                break;
            }
        }

        if (shouldOpenInternally) {
            // Crear nueva ventana dentro de Electron
            let newWindow = new BrowserWindow({
                'width': settings.getSync().client.width,
                'height': settings.getSync().client.height,
                'x': settings.getSync().client.x,
                'y': settings.getSync().client.y,
                'icon': __dirname + '/icon.png',
                'webPreferences': {
                    'preload': `${__dirname}/inject/main.js`,
                    'contextIsolation': true,
                    'nodeIntegration': true,
                    'plugins': true,
                    'devTools': argv.dev,
                    'enableRemoteModule': true
                },
            });

            newWindow.setMenuBarVisibility(true);
            newWindow.setAlwaysOnTop(false);
            newWindow.loadURL(url);
            
            if (argv.dev) {
                newWindow.webContents.openDevTools();
            }
            
            // Configurar el manejo de ventanas para esta nueva ventana también
            settingsWindow(newWindow, windowType);
            
            // Configurar que esta nueva ventana también maneje enlaces internos
            setupInternalLinkHandler(newWindow);
            
            // Actualizar Discord RPC
            newWindow.webContents.on('did-finish-load', () => {
                setTimeout(updateDiscordPresence, 3000);
            });
        } else {
            // Para otras URLs, abrir en navegador externo
            require('electron').shell.openExternal(url);
        }
    });
};

// Función auxiliar para configurar manejador de enlaces en ventanas hijas
function setupInternalLinkHandler(window) {
    if (!window || window.isDestroyed()) return;
    
    window.webContents.on('new-window', async function(e, url) {
        e.preventDefault();
        
        const internalUrls = [
            'https://starzone.se',
            'https://www.starzone.se',
            'https://stargallifrey.digital',
            'https://www.stargallifrey.digital'
        ];
        
        let shouldOpenInternally = false;
        for (const internalUrl of internalUrls) {
            if (url.startsWith(internalUrl)) {
                shouldOpenInternally = true;
                break;
            }
        }
        
        if (shouldOpenInternally) {
            // Crear otra ventana interna
            let childWindow = new BrowserWindow({
                'width': settings.getSync().client.width,
                'height': settings.getSync().client.height,
                'x': settings.getSync().client.x,
                'y': settings.getSync().client.y,
                'icon': __dirname + '/icon.png',
                'webPreferences': {
                    'preload': `${__dirname}/inject/main.js`,
                    'contextIsolation': true,
                    'nodeIntegration': true,
                    'plugins': true,
                    'devTools': argv.dev,
                    'enableRemoteModule': true
                },
            });
            
            childWindow.loadURL(url);
            settingsWindow(childWindow, "client");
            setupInternalLinkHandler(childWindow);
            
            if (argv.dev) {
                childWindow.webContents.openDevTools();
            }
        } else {
            require('electron').shell.openExternal(url);
        }
    });
}

function clearCacheButton() {
    console.log('Delete Cache button clicked');
    
    try {
        if (!mainWindow || mainWindow.isDestroyed()) {
            dialog.showMessageBox({
                type: 'error',
                title: 'Error',
                message: 'Main window is not available.'
            });
            return;
        }
        
        dialog.showMessageBox(mainWindow, {
            type: 'warning',
            buttons: ['Clear Cache', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
            title: 'Clear Cache',
            message: 'Do you want to clear the application cache?',
            detail: 'This will remove temporary files.'
        }, (response) => {
            if (response !== 0) {
                return;
            }
            
            const ses = mainWindow.webContents.session;
            
            if (ses && typeof ses.clearCache === 'function') {
                ses.clearCache(function() {
                    dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'Success',
                        message: 'Cache cleared successfully!'
                    });
                }, function(error) {
                    dialog.showMessageBox(mainWindow, {
                        type: 'error',
                        title: 'Error',
                        message: 'Failed to clear cache: ' + (error.message || error)
                    });
                });
            } else {
                dialog.showMessageBox(mainWindow, {
                    type: 'error',
                    title: 'Error',
                    message: 'Cache clearing is not available.'
                });
            }
        });
        
    } catch(error) {
        console.error('Error in clearCacheButton:', error);
    }
}

function createMenu() {
    axios.get("https://raw.githubusercontent.com/083d9a270e6e16b2fbb08d35067aae5f/cc06d45ce2ebf658b0cc8890bc7b9ea1/main/version.json").then(response => {
        let newVersionOfClient = response.data.newVersion;

        const template = [
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forcereload' },
                    { type: 'separator' },
                    { role: 'resetzoom' },
                    { role: 'zoomin' },
                    { role: 'zoomout' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            { role: 'window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
            {
                role: 'help',
                label: 'Help',
                submenu: [
                    {
                        label: 'Website',
                        click() { require('electron').shell.openExternal("https://starzone.se/"); }
                    }, 
                    {
                        label: 'Discord',
                        click() { require('electron').shell.openExternal("https://starzone.se/discord.php"); }
                    }
                ]
            },
            {
                label: 'Cache',
                submenu: [
                    {
                        label: 'Delete Cache (Beta)',
                        click: clearCacheButton
                    }
                ]
            },
            {
                label: 'Info',
                submenu: [
                    {
                        label: `Version: ${config.version}`
                    }
                ]
            },
            {
                label: 'Privacy',
                submenu: [
                    {
                        label: `${(settings.getSync().privacy ? "Hidden" : "Show")} my account info in Discord`,
                        click() { ManagePrivacy(); }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

    }).catch(function(error){
        console.error('Error creating menu:', error);
        const template = [
            {
                label: 'File',
                submenu: [
                    { role: 'quit' }
                ]
            },
            {
                label: 'Cache',
                submenu: [
                    {
                        label: 'Delete Cache (Beta)',
                        click: clearCacheButton
                    }
                ]
            }
        ];
        
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    });
}

let ppapi_flash_path;

if (process.platform == 'win32') {
    if (isOSWin64()){
        ppapi_flash_path = path.join(app.getAppPath(), '../flash/pepflashplayer64.dll');
    } else {
        ppapi_flash_path = path.join(app.getAppPath(), '../flash/pepflashplayer32.dll');
    }
} else if (process.platform == 'linux') {
    ppapi_flash_path = path.join(app.getAppPath(), '../flash/libpepflashplayer.so');
} else if (process.platform == 'darwin') {
    ppapi_flash_path = path.join(app.getAppPath(), '../flash/PepperFlashPlayer.plugin');
}

app.commandLine.appendSwitch('ppapi-flash-path', ppapi_flash_path);

app.whenReady().then(() => {
    createWindow();
    createMenu();
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        createMenu();
    }
});

function isOSWin64() {
    return process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
}

function settingsWindow(window, type) {
    if (settings.getSync()[type].max) {
        window.maximize();
    }

    window.on('maximize', () => {
        let backup = settings.getSync();
        backup[type].max = true;
        settings.setSync(backup);
    });

    window.on("unmaximize", () => {
        let backup = settings.getSync();
        backup[type].max = false;
        settings.setSync(backup);
    });

    window.on('resize', function() {
        let backup = settings.getSync();
        let size = window.getSize();
        backup[type].width = size[0];
        backup[type].height = size[1];
        settings.setSync(backup);
    })

    window.on('move', function(data) {
        let backup = settings.getSync();
        let pos = data.sender.getBounds();
        backup[type].x = pos.x;
        backup[type].y = pos.y;
        settings.setSync(backup);
    });
}

async function ManagePrivacy() {
    let privacyData = settings.getSync();
    if (privacyData.privacy){
        privacyData.privacy = false;
        dialog.showMessageBox({
            type: 'info',
            title: 'Privacy',
            message: 'Data saved successfully. Restarting client...'
        }, () => {
            setTimeout(() => {
                app.relaunch();
                app.quit();
            }, 2500);
        });
    } else if (!privacyData.privacy){
        privacyData.privacy = true;
        dialog.showMessageBox({
            type: 'info',
            title: 'Privacy',
            message: 'Data saved successfully. Restarting client...'
        }, () => {
            setTimeout(() => {
                app.relaunch();
                app.quit();
            }, 2500);
        });
    }
    settings.setSync(privacyData);
}