# 📱 Guía de Configuración de Dispositivos 4P

## Configuración Inicial

### 1. Insertar SIM Card
- Usar SIM con datos móviles activos
- Configurar APN según operador:
  - **Claro Colombia**: internet.comcel.com.co
  - **Movistar Colombia**: internet.movistar.com.co
  - **Tigo Colombia**: web.colombiamovil.com.co

### 2. Configurar Servidor
Enviar SMS al dispositivo:
\`\`\`
CS,<IMEI>,192.168.1.14,7070
\`\`\`

### 3. Configurar Intervalo de Reporte
\`\`\`
TIMER,<IMEI>,60
\`\`\`
(Reporta cada 60 segundos)

### 4. Solicitar Ubicación Manual
\`\`\`
CR,<IMEI>,0
\`\`\`

## Comandos Disponibles via API

### Solicitar ubicación
\`\`\`bash
curl -X POST http://192.168.1.14:3001/api/commands/send \\
  -H "Content-Type: application/json" \\
  -d '{"imei":"IMEI_DEL_DISPOSITIVO","command":"location"}'
\`\`\`

### Configurar servidor
\`\`\`bash
curl -X POST http://192.168.1.14:3001/api/commands/send \\
  -H "Content-Type: application/json" \\
  -d '{"imei":"IMEI","command":"setServer","params":{"ip":"192.168.1.14","port":7070}}'
\`\`\`

### Reiniciar dispositivo
\`\`\`bash
curl -X POST http://192.168.1.14:3001/api/commands/send \\
  -H "Content-Type: application/json" \\
  -d '{"imei":"IMEI","command":"reboot"}'
\`\`\`

## Verificación de Conexión

1. Verificar que el TCP Server esté escuchando:
\`\`\`bash
docker-compose logs backend | grep "TCP iniciado"
\`\`\`

2. Ver conexiones activas:
\`\`\`bash
docker-compose logs backend | grep "Dispositivo conectado"
\`\`\`

3. Ver datos recibidos:
\`\`\`bash
curl http://192.168.1.14:3001/api/devices
\`\`\`
