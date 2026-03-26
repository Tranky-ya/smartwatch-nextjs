#!/bin/bash

# ============================================
# SCRIPT DE INTEGRACIÓN - HYBRID ENGINE
# ============================================
# Este script aplica el parche del motor híbrido
# a tu tcp-server.js de forma segura y reversible
# ============================================

set -e  # Salir si hay error

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🔧 INTEGRACIÓN HYBRID LOCATION ENGINE                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "server/tcp-server.js" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio backend/"
    echo "   cd backend && bash integrate-hybrid-engine.sh"
    exit 1
fi

# Crear backup
BACKUP_FILE="server/tcp-server.js.backup-before-hybrid-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creando backup..."
cp server/tcp-server.js "$BACKUP_FILE"
echo "✅ Backup creado: $BACKUP_FILE"
echo ""

# Copiar motor híbrido
echo "📥 Copiando motor híbrido..."
if [ ! -d "services" ]; then
    mkdir -p services
fi

if [ ! -f "services/hybrid-location-engine.js" ]; then
    echo "❌ Error: No se encuentra hybrid-location-engine.js"
    echo "   Copia el archivo hybrid-location-engine-integration.js como services/hybrid-location-engine.js"
    exit 1
fi

echo "✅ Motor híbrido encontrado"
echo ""

# Aplicar parche
echo "🔧 Aplicando parche a tcp-server.js..."

# Verificar que el parche no está ya aplicado
if grep -q "HybridLocationEngine" server/tcp-server.js; then
    echo "⚠️  El parche parece estar ya aplicado"
    read -p "¿Quieres continuar de todas formas? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Operación cancelada"
        exit 1
    fi
fi

# CAMBIO 1: Añadir import después de LocationPrioritizationService
sed -i '/const LocationPrioritizationService = require/a const HybridLocationEngine = require('\''../services/hybrid-location-engine'\'');' server/tcp-server.js

# CAMBIO 2: Inicializar en constructor (buscar this.locationPrioritizer y añadir después)
sed -i '/this\.locationPrioritizer = new LocationPrioritizationService/a \    this.hybridEngine = new HybridLocationEngine({\n      googleApiKey: process.env.GOOGLE_GEOLOCATION_API_KEY,\n      maxJumpMeters: 40,\n      maxSpeedKmh: 15,\n      smoothingAlpha: 0.25,\n      logLevel: '\''info'\''\n    });' server/tcp-server.js

echo "✅ Parche aplicado exitosamente"
echo ""

# Instrucciones para CAMBIO 3 (manual porque es más complejo)
echo "⚠️  PASO MANUAL REQUERIDO:"
echo ""
echo "Debes editar server/tcp-server.js manualmente y en la función handlePosition:"
echo ""
echo "BUSCAR (línea ~326):"
echo "  const bestLocation = this.locationPrioritizer.getBestLocation(parsed);"
echo "  const report = this.locationPrioritizer.getDecisionReport(bestLocation);"
echo ""
echo "AÑADIR DESPUÉS:"
echo "  const enhancedLocation = await this.hybridEngine.enhance(bestLocation, parsed, device.imei);"
echo ""
echo "Y CAMBIAR:"
echo "  const finalLat = bestLocation.location.latitude;"
echo "  const finalLng = bestLocation.location.longitude;"
echo "  const finalSource = bestLocation.source;"
echo "  const finalAccuracy = bestLocation.accuracy;"
echo ""
echo "POR:"
echo "  const finalLat = enhancedLocation.location.latitude;"
echo "  const finalLng = enhancedLocation.location.longitude;"
echo "  const finalSource = enhancedLocation.source;"
echo "  const finalAccuracy = enhancedLocation.accuracy;"
echo ""
echo "📝 Abre: nano server/tcp-server.js (busca línea 326)"
echo ""

# Añadir variable al .env si no existe
if [ -f ".env" ]; then
    if ! grep -q "GOOGLE_GEOLOCATION_API_KEY" .env; then
        echo "" >> .env
        echo "# Google Geolocation API (opcional)" >> .env
        echo "GOOGLE_GEOLOCATION_API_KEY=" >> .env
        echo "✅ Variable añadida a .env"
    else
        echo "✅ Variable ya existe en .env"
    fi
else
    echo "⚠️  Archivo .env no encontrado"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ INTEGRACIÓN COMPLETADA (FALTA PASO MANUAL)          ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║   SIGUIENTE PASO:                                         ║"
echo "║   1. Editar server/tcp-server.js (línea ~326)            ║"
echo "║   2. Añadir enhancedLocation según instrucciones arriba  ║"
echo "║   3. Reiniciar: pm2 restart backend                      ║"
echo "║                                                           ║"
echo "║   ROLLBACK (si algo sale mal):                           ║"
echo "║   cp $BACKUP_FILE server/tcp-server.js ║"
echo "║   pm2 restart backend                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
