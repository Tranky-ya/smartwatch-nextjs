# 📱 SMARTWATCH ADMIN v3.0 - DOCUMENTACIÓN COMPLETA

## 🎯 SISTEMA EMPRESARIAL DE GESTIÓN DE DISPOSITIVOS WEARABLES

**Desarrollado para:** Telvoz  
**Fecha:** Diciembre 2024  
**Versión:** 3.0 Enterprise Edition  
**Estado:** ✅ 100% Funcional y Listo para Producción

---

## 🌐 INFORMACIÓN DE ACCESO

### URLs del Sistema
- **Frontend:** http://192.168.1.14:3000
- **API Backend:** http://192.168.1.14:3001
- **Servidor TCP:** Puerto 7070 (dispositivos)

### Credenciales
- **Email:** admin@telvoz.com
- **Password:** Barcelona537

---

## 📋 CARACTERÍSTICAS COMPLETAS

### 1. ✅ GESTIÓN DE DISPOSITIVOS

#### Funcionalidades UI (Dashboard)
1. **⚡ Función Especial** - Consultas avanzadas por tipo (Juphoon, Rongcloud, Tencent, Baidu)
2. **📋 Información** - Consulta detallada por IMEI
3. **📱 Lista Dispositivos** - Visualización completa de dispositivos
4. **🔄 Restablecer** - Reset de dispositivos
5. **🔢 Reset IMEI + ID** - Restablecimiento con asignación automática
6. **👤 Asignar** - Asignación de dispositivos a usuarios
7. **📦 Secciones** - Asignación masiva por secciones
8. **📥 Importar** - Importación desde Excel/CSV
9. **🏷️ Lote Tipo** - Edición por lotes de tipo de equipo
10. **📝 Lote Modelo** - Modificación masiva de modelos
11. **🗺️ Monitor Mapas** - Apertura de mapa en tiempo real
12. **⏰ Activación** - Consulta de hora de activación
13. **📖 Manual** - Documentación integrada
14. **📴 Apagados** - Registro de apagados/reinicios

### 2. ✅ SERVIDOR TCP (Puerto 7070)

#### Protocolos Soportados
- **LK** - Heartbeat/Latido del corazón
  - Batería
  - Pasos diarios
  - Estado de conexión

- **UD_LTE** - Ubicación LTE
  - GPS (alta precisión: <10m con 6+ satélites)
  - LBS (media precisión: 100-1000m)
  - WiFi (media precisión: 20-100m)
  - Velocidad, curso, altitud
  - Datos de celda (MCC, MNC, LAC, Cell ID)

- **AL_LTE** - Alarmas
  - 🆘 SOS (Crítico)
  - 🤕 Caídas (Crítico)
  - 🔋 Batería baja (Bajo)
  - 📍 Entrada/Salida geocercas (Bajo/Medio)
  - ⚡ Vibración
  - 🚶 Movimiento

- **bphrt** - Datos de Salud
  - ❤️ Heart Rate (Frecuencia cardíaca)
  - 🩸 Blood Pressure (Presión arterial - Sistólica/Diastólica)
  - 🫁 SpO2 (Saturación de oxígeno - calculado)

### 3. ✅ SISTEMA DE ALERTAS

#### Tipos de Alertas
1. **Salud:**
   - HEALTH_HR_ABNORMAL (HR > 120 o < 50 BPM)
   - HEALTH_BP_HIGH (Sistólica > 140 o Diastólica > 90)
   - HEALTH_BP_LOW (Sistólica < 90 o Diastólica < 60)
   - HEALTH_SPO2_LOW (SpO2 < 94%)

2. **Dispositivo:**
   - SOS (Botón de emergencia)
   - FALL_DOWN (Detección de caídas)
   - LOW_BATTERY (Batería < 20%)

3. **Geocercas:**
   - GEOFENCE_ENTER (Entrada a zona)
   - GEOFENCE_EXIT (Salida de zona)

#### Estados de Alertas
- **NEW** - Nueva alerta
- **ACKNOWLEDGED** - Reconocida
- **IN_PROGRESS** - En proceso
- **RESOLVED** - Resuelta

#### Severidad
- **LOW** - Informativa
- **MEDIUM** - Atención requerida
- **HIGH** - Alta prioridad
- **CRITICAL** - Emergencia

### 4. ✅ MAPA INTERACTIVO LEAFLET

- Visualización en tiempo real
- Marcadores de dispositivos (verde=online, rojo=offline)
- Círculos de geocercas con radio configurable
- Popups informativos
- Auto-refresh cada 5 segundos
- Click para centrar y ver detalles
- Visualización de 4 geocercas activas

### 5. ✅ GEOCERCAS (CRUD Completo)

- Crear geocercas circulares
- Configurar radio (50m - 5000m)
- Alertas automáticas de entrada/salida
- Verificación en tiempo real con cada posición GPS
- Cálculo de distancia preciso (Haversine)
- Visualización en mapa

### 6. ✅ REPORTES

- **PDF:** Reporte completo de dispositivos con PDFKit
- **Excel:** Datos exportables con ExcelJS
- Descarga directa desde dashboard
- Generación bajo demanda

### 7. ✅ BASE DE DATOS POSTGRESQL

#### Tablas Principales
1. **devices** - Dispositivos registrados
2. **location_history** - Historial de ubicaciones (GPS/LBS/WiFi)
3. **alerts** - Sistema de alertas
4. **health_data** - Datos de salud (HR, BP, SpO2)
5. **geofences** - Geocercas configuradas
6. **users** - Usuarios del sistema
7. **organizations** - Multi-tenancy

---

## 🔌 API REST COMPLETA

### Autenticación
\`\`\`bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@telvoz.com",
  "password": "Barcelona537"
}

Response:
{
  "message": "Login exitoso",
  "token": "JWT_TOKEN",
  "user": {...}
}
\`\`\`

### Dispositivos
\`\`\`bash
# Listar todos
GET /api/devices
GET /api/devices?online=true&limit=50

# Información específica
GET /api/devices/info/:imei

# Restablecer
POST /api/devices/reset
{
  "imei": "123456789012345"
}

# Estadísticas
GET /api/stats/dashboard
\`\`\`

### Alertas (NUEVO)
\`\`\`bash
# Listar alertas
GET /api/alerts
GET /api/alerts?device_id=UUID&status=NEW&severity=HIGH&limit=50

# Cambiar estado
PUT /api/alerts/:id/status
{
  "status": "RESOLVED"
}
\`\`\`

### Datos de Salud (NUEVO)
\`\`\`bash
# Historial de salud
GET /api/health-data/:device_id
GET /api/health-data/:device_id?days=7
\`\`\`

### Historial de Ubicaciones (NUEVO)
\`\`\`bash
# Historial de posiciones
GET /api/location-history/:device_id
GET /api/location-history/:device_id?hours=24&limit=100
\`\`\`

### Geocercas
\`\`\`bash
# Listar
GET /api/geofences

# Crear
POST /api/geofences
{
  "organization_id": "UUID",
  "name": "Mi Geocerca",
  "description": "Zona principal",
  "center_lat": 6.244203,
  "center_lng": -75.581215,
  "radius_meters": 500
}

# Eliminar
DELETE /api/geofences/:id
\`\`\`

### Reportes
\`\`\`bash
# Descargar PDF
POST /api/reports/devices/pdf

# Descargar Excel
POST /api/reports/devices/excel
\`\`\`

### Comandos Remotos
\`\`\`bash
POST /api/commands/send
{
  "imei": "123456789012345",
  "command": "location",
  "params": {}
}

Comandos disponibles:
- location: Solicitar ubicación
- setServer: Configurar servidor {ip, port}
- setInterval: Intervalo de reporte {seconds}
- reboot: Reiniciar dispositivo
- setAPN: Configurar APN {apn, user, pass}
\`\`\`

---

## 🧪 PRUEBAS Y EJEMPLOS

### Probar Servidor TCP con Netcat
\`\`\`bash
# Conectar al servidor
nc 192.168.1.14 7070

# Enviar heartbeat
[3G*123456789012345*LK,0,85,1234]

# Enviar ubicación
UD_LTE,123456789012345,181224,143022,0614.5678,N,07534.1234,W,0.0,270,100,8,5.0

# Enviar alarma SOS
AL_LTE,123456789012345,SOS,181224,143022,0614.5678,N,07534.1234,W,75,1000

# Enviar datos de salud
bphrt,123456789012345,181224,143022,72,120,80,97
\`\`\`

### Consultar Alertas
\`\`\`bash
# Ver todas las alertas
curl http://localhost:3001/api/alerts | jq

# Ver alertas críticas
curl http://localhost:3001/api/alerts?severity=CRITICAL | jq

# Ver alertas de un dispositivo
curl http://localhost:3001/api/alerts?device_id=DEVICE_UUID | jq

# Resolver alerta
curl -X PUT http://localhost:3001/api/alerts/ALERT_ID/status \\
  -H "Content-Type: application/json" \\
  -d '{"status":"RESOLVED"}'
\`\`\`

### Ver Datos de Salud
\`\`\`bash
# Últimos 7 días
curl http://localhost:3001/api/health-data/DEVICE_ID | jq

# Últimos 30 días
curl http://localhost:3001/api/health-data/DEVICE_ID?days=30 | jq
\`\`\`

### Ver Historial de Ubicaciones
\`\`\`bash
# Últimas 24 horas
curl http://localhost:3001/api/location-history/DEVICE_ID | jq

# Últimas 48 horas, límite 200 registros
curl "http://localhost:3001/api/location-history/DEVICE_ID?hours=48&limit=200" | jq
\`\`\`

---

## 🔧 CONFIGURACIÓN DE DISPOSITIVOS REALES

### Parámetros de Conexión
- **IP Servidor:** 192.168.1.14
- **Puerto TCP:** 7070
- **Protocolo:** TCP con mensajes ASCII terminados en \\n

### Comandos SMS para Configuración
\`\`\`
# Configurar servidor
pw,123456,ip,192.168.1.14,7070#

# Configurar APN (Colombia - Claro)
pw,123456,apn,internet.comcel.com.co#

# Configurar APN (Colombia - Movistar)
pw,123456,apn,internet.movistar.com.co#

# Configurar intervalo de reporte (60 segundos)
pw,123456,upload,60#

# Reiniciar dispositivo
pw,123456,reset#
\`\`\`

---

## 📊 COMANDOS ÚTILES DE ADMINISTRACIÓN

### Docker
\`\`\`bash
# Ver estado
docker-compose ps

# Ver logs
docker-compose logs backend | tail -50
docker-compose logs frontend | tail -50

# Reiniciar servicios
docker-compose restart backend
docker-compose restart frontend

# Reiniciar todo
docker-compose down && docker-compose up -d

# Ver uso de recursos
docker stats smartwatch-backend smartwatch-frontend smartwatch-postgres
\`\`\`

### PostgreSQL
\`\`\`bash
# Acceder a la base de datos
docker-compose exec postgres psql -U postgres smartwatch_admin

# Consultas útiles
SELECT COUNT(*) FROM devices;
SELECT COUNT(*) FROM location_history;
SELECT COUNT(*) FROM alerts WHERE status = 'NEW';
SELECT * FROM health_data ORDER BY recorded_at DESC LIMIT 10;
SELECT name, is_active FROM geofences;

# Ver últimas alertas
SELECT 
  a.alert_type, 
  a.severity, 
  a.message, 
  d.imei, 
  a.triggered_at 
FROM alerts a 
JOIN devices d ON a.device_id = d.id 
ORDER BY a.triggered_at DESC 
LIMIT 20;

# Ver dispositivos online
SELECT imei, name, battery_level, last_seen 
FROM devices 
WHERE is_online = true;
\`\`\`

### Backup
\`\`\`bash
# Backup completo
cd ~
tar -czf smartwatch-backup-$(date +%Y%m%d).tar.gz smartwatch-nextjs/

# Backup solo BD
docker-compose exec postgres pg_dump -U postgres smartwatch_admin > backup-$(date +%Y%m%d).sql

# Restaurar BD
docker-compose exec -T postgres psql -U postgres smartwatch_admin < backup.sql
\`\`\`

### Mantenimiento
\`\`\`bash
# Limpiar posiciones antiguas (>30 días)
docker-compose exec -T postgres psql -U postgres smartwatch_admin << SQL
DELETE FROM location_history WHERE recorded_at < NOW() - INTERVAL '30 days';
SQL

# Limpiar alertas resueltas antiguas (>90 días)
docker-compose exec -T postgres psql -U postgres smartwatch_admin << SQL
DELETE FROM alerts WHERE status = 'RESOLVED' AND updated_at < NOW() - INTERVAL '90 days';
SQL

# Ver espacio de disco
df -h
docker system df

# Limpiar Docker (si es necesario)
docker system prune -a -f
\`\`\`

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

### Corto Plazo (1-2 semanas)
1. ✅ Probar con dispositivos reales
2. ⚠️ Configurar notificaciones por email/SMS para alertas críticas
3. ⚠️ Implementar panel de alertas en dashboard
4. ⚠️ Agregar gráficas de datos de salud

### Mediano Plazo (1-2 meses)
1. Dashboard de métricas avanzadas (Chart.js)
2. Playback de rutas históricas
3. Reportes programados automáticos
4. Integración WhatsApp Business API
5. App móvil básica (React Native)

### Largo Plazo (3-6 meses)
1. Machine Learning para detección de patrones
2. Predicción de mantenimiento
3. Sistema de roles y permisos granular
4. Multi-idioma (Español/Inglés)
5. API pública documentada con Swagger

---

## 📧 CONFIGURACIÓN EMAIL SMTP

**Servidor:** smtp.gmail.com:587  
**Usuario:** juan.vasquez@telvoz.com  
**Estado:** ✅ Configurado y funcional

### Probar Email
\`\`\`bash
docker-compose exec backend node /app/test-email.js
\`\`\`

---

## 🔐 SEGURIDAD

### Implementado
- ✅ Autenticación JWT con expiración 24h
- ✅ Passwords hasheados con bcrypt
- ✅ CORS configurado
- ✅ Validación de inputs
- ✅ Logs de acceso

### Recomendaciones Adicionales
- 🔒 Configurar HTTPS con Let's Encrypt
- 🔒 Implementar rate limiting
- 🔒 Configurar firewall (UFW)
- 🔒 Actualizar passwords regularmente
- 🔒 Backups automáticos diarios

---

## 📞 SOPORTE Y CONTACTO

**Desarrollado para:** Telvoz  
**Sistema:** Smartwatch Admin v3.0 Enterprise  
**Tecnologías:** Node.js, Next.js, PostgreSQL, Docker, Leaflet  

**Estado del Sistema:** ✅ 100% Funcional  
**Fecha de Entrega:** Diciembre 2024  

---

## 📝 CHANGELOG

### v3.0 (Diciembre 2024)
- ✅ Sistema completo de gestión de dispositivos (14 funcionalidades)
- ✅ Servidor TCP con protocolos LK, UD_LTE, AL_LTE, bphrt
- ✅ Sistema de alertas con estados y severidad
- ✅ Datos de salud con cálculo de SpO2
- ✅ Diferenciación GPS/LBS/WiFi
- ✅ Verificación automática de geocercas
- ✅ Mapa interactivo Leaflet
- ✅ Reportes PDF/Excel
- ✅ API REST completa (20+ endpoints)
- ✅ Dashboard empresarial
- ✅ Multi-tenancy

---

**© 2024 Telvoz - Todos los derechos reservados**
