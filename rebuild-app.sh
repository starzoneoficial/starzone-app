#!/bin/bash
echo "=== RECONSTRUYENDO STARZONE CLIENT ==="

# 1. Verificar archivos existentes
echo "1. Archivos disponibles:"
ls -la *.html *.css *.png *.jpg 2>/dev/null

# 2. Crear index.html si no existe
if [ ! -f "index.html" ] || [ ! -s "index.html" ]; then
    echo "2. Creando index.html básico..."
    cat > index.html << 'HTMLFILE'
<!DOCTYPE html>
<html>
<head>
    <title>StarZone Client</title>
    <link rel="stylesheet" href="app.css">
    <style>
        body { margin: 0; padding: 0; background: #0a0a1a; }
        #loading { position: fixed; width: 100%; height: 100%; background: #0a0a1a; }
        #main-content { display: none; width: 100%; height: 100vh; }
        iframe { width: 100%; height: 100%; border: none; }
    </style>
</head>
<body>
    <div id="loading">
        <img src="StarZoneLogoClient.png" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
    </div>
    <div id="main-content">
        <iframe id="game-frame" src="about:blank"></iframe>
    </div>
    <script>
        setTimeout(function() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
            document.getElementById('game-frame').src = 'https://starzone.se/';
        }, 2000);
    </script>
</body>
</html>
HTMLFILE
    echo "   index.html creado"
fi

# 3. Verificar imágenes
if [ ! -f "StarZoneLogoClient.png" ]; then
    echo "3. ADVERTENCIA: StarZoneLogoClient.png no encontrado"
    echo "   Buscando alternativas..."
    find . -name "*.png" -type f ! -path "./node_modules/*" | head -5
fi

# 4. Verificar CSS
if [ ! -f "app.css" ]; then
    echo "4. Creando app.css básico..."
    cat > app.css << 'CSSFILE'
/* app.css básico para StarZone */
body, html {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: Arial, sans-serif;
}

#loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0a0a1a;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.loading-logo {
    max-width: 400px;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
}

.game-container {
    width: 100vw;
    height: 100vh;
}
CSSFILE
    echo "   app.css creado"
fi

echo "=== COMPLETADO ==="
echo "Ahora ejecuta: npm start"
