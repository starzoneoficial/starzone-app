const { dialog } = require('electron');

function checkForUpdates(menuItem, focusedWindow, event) {
    dialog.showMessageBox({
        type: 'info',
        title: 'Buscar actualizaciones',
        message: 'El sistema de actualizaciones está temporalmente deshabilitado.',
        buttons: ['OK']
    }, () => {
        // Callback opcional
    });
}

module.exports.checkForUpdates = checkForUpdates;
