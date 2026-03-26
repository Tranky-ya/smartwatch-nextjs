#!/bin/bash
# Script para aplicar tracking al archivo map/page.js
# Descarga el archivo original y aplica los cambios

cd ~/smartwatch-nextjs/frontend/app/map

echo "🔄 Descargando archivo original..."
# Primero, sube manualmente el archivo 1768148384713_page.js como page.js
# O ejecútalo desde donde esté

echo "📦 Aplicando cambios de tracking..."

# Crear archivo temporal con los cambios
cat > /tmp/patch-tracking.sed << 'SEDEOF'
# Línea 42: Agregar estados de tracking después de locationRequest
42 a\
  const [autoTracking, setAutoTracking] = useState(false);\
  const [lastUpdate, setLastUpdate] = useState(null);\
  const trackingIntervalRef = useRef(null);

# Línea 56: Agregar función getTimeAgo
56 a\
\
  const getTimeAgo = (dateString) => {\
    if (!dateString) return "";\
    const now = new Date();\
    const past = new Date(dateString);\
    const diffMs = now - past;\
    const diffMins = Math.floor(diffMs / 60000);\
    if (diffMins < 1) return "Justo ahora";\
    if (diffMins === 1) return "Hace 1 minuto";\
    if (diffMins < 60) return "Hace " + diffMins + " minutos";\
    const diffHours = Math.floor(diffMins / 60);\
    if (diffHours === 1) return "Hace 1 hora";\
    return "Hace " + diffHours + " horas";\
  };
SEDEOF

# Aplicar parche
sed -i -f /tmp/patch-tracking.sed page.js

# Agregar setLastUpdate (buscar dinámicamente)
LINEA=$(grep -n "message: 'Ubicacion actualizada correctamente'" page.js | cut -d: -f1)
if [ ! -z "$LINEA" ]; then
  sed -i "${LINEA} a\        });\n        setLastUpdate(resultado.location.server_time);" page.js
  sed -i "$((LINEA+1))d" page.js
  echo "✓ setLastUpdate agregado en línea $LINEA"
fi

# Agregar useEffect de tracking
LINEA_UE=$(grep -n "}, \[selectedDevice, selectedGeofence\]);" page.js | tail -1 | cut -d: -f1)
if [ ! -z "$LINEA_UE" ]; then
  cat >> page.js.tmp << 'EOF'

  useEffect(() => {
    if (!autoTracking || !selectedDevice) {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      return;
    }
    console.log('Auto-tracking activado: cada 5 minutos');
    trackingIntervalRef.current = setInterval(() => {
      console.log('Auto-tracking: Solicitando ubicacion...');
      handleRequestLocation(selectedDevice.imei);
    }, 300000);
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [autoTracking, selectedDevice]);
EOF
  head -$LINEA_UE page.js > page.js.new
  cat page.js.tmp >> page.js.new
  tail -n +$((LINEA_UE + 1)) page.js >> page.js.new
  mv page.js.new page.js
  rm page.js.tmp
  echo "✓ useEffect agregado después de línea $LINEA_UE"
fi

# Agregar toggle UI
LINEA_BTN=$(grep -n '<Radio size={16} />' page.js | tail -1 | cut -d: -f1)
if [ ! -z "$LINEA_BTN" ]; then
  LINEA_INS=$((LINEA_BTN + 3))
  sed -i "${LINEA_INS} i\\
\\
                  <div style={{ marginTop: \"8px\", padding: \"10px\", background: autoTracking ? \"#e0f2fe\" : \"#f3f4f6\", borderRadius: \"6px\", border: \`2px solid \${autoTracking ? \"#3b82f6\" : \"#d1d5db\"}\` }}>\\
                    <button onClick={() => setAutoTracking(!autoTracking)} style={{ width: \"100%\", padding: \"8px\", background: autoTracking ? \"#3b82f6\" : \"#6b7280\", color: \"white\", border: \"none\", borderRadius: \"4px\", cursor: \"pointer\", fontSize: \"12px\", fontWeight: \"600\", display: \"flex\", alignItems: \"center\", justifyContent: \"center\", gap: \"6px\" }}>\\
                      <Activity size={14} />\\
                      {autoTracking ? \"Seguimiento Activo (5 min)\" : \"Activar Seguimiento\"}\\
                    </button>\\
                    {lastUpdate && <div style={{ marginTop: \"6px\", fontSize: \"10px\", color: \"#6b7280\", textAlign: \"center\" }}>Ultima actualizacion: {getTimeAgo(lastUpdate)}</div>}\\
                  </div>" page.js
  echo "✓ Toggle UI agregado después de línea $LINEA_BTN"
fi

echo ""
echo "=== Verificación ==="
echo "Estados tracking: $(grep -c 'const \[autoTracking' page.js)"
echo "Función getTimeAgo: $(grep -c 'const getTimeAgo' page.js)"
echo "setLastUpdate: $(grep -c 'setLastUpdate(' page.js)"
echo "Toggle UI: $(grep -c 'Activar Seguimiento' page.js)"
echo ""
echo "✅ Parche aplicado correctamente"
echo ""
echo "Ahora ejecuta:"
echo "  cd ~/smartwatch-nextjs"
echo "  docker-compose restart frontend"
