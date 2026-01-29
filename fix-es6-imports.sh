#!/bin/bash
echo "=== SOLUCIONANDO ERROR DE IMPORT/EXPORT ==="

# 1. Buscar archivos con import/export
echo "1. Buscando archivos con sintaxis ES6..."
find . -name "*.js" -type f ! -path "./node_modules/*" ! -path "./dist/*" -exec grep -l "import.*from\|export default" {} \; 2>/dev/null

# 2. Verificar axios
echo ""
echo "2. Verificando versión de axios..."
npm list axios 2>/dev/null || echo "axios no instalado"

# 3. Si axios está en una versión moderna, instalar versión antigua
if grep -q '"axios"' package.json; then
    echo "3. Instalando axios compatible (0.19.2)..."
    npm uninstall axios
    npm install axios@0.19.2 --save
fi

# 4. Buscar otros módulos problemáticos
echo ""
echo "4. Buscando otros módulos ES6 en node_modules..."
find node_modules -name "*.mjs" -type f 2>/dev/null | head -5

# 5. Limpiar y reinstalar
echo ""
echo "5. Limpiando y reinstalando..."
rm -rf node_modules package-lock.json dist
npm install

# 6. Compilar
echo ""
echo "6. Compilando..."
npx electron-builder --win --x64

echo "=== COMPLETADO ==="
