# Implementación del Protocolo Beesure GPS SeTracker

## Descripción General

Este documento detalla la implementación del protocolo Beesure GPS SeTracker en el servidor backend. El servidor ahora sigue exactamente la especificación del fabricante para comunicación TCP con dispositivos GPS.

## Formato del Protocolo

### ⚠️ ACLARACIÓN CRÍTICA: LEN vs INDEX

**El protocolo Beesure usa LEN (longitud), NO INDEX (contador de mensaje)**

```
[MANUFACTURER_CODE*DEVICE_ID*LEN*CONTENT]
     (3G, CS, SG)      (10 dígitos)  (hex ASCII)
```

**Campos:**
- `MANUFACTURER_CODE`: Código del fabricante (2 dígitos) - 3G, CS, o SG
- `DEVICE_ID`: Últimos 10 dígitos del IMEI del dispositivo
- `LEN`: Longitud del CONTENT en hexadecimal (4 dígitos ASCII)
- `CONTENT`: Datos reales del comando/respuesta

**Ejemplos:**
```
[3G*8800000015*0002*LK]
  ├─ CONTENT: "LK" → longitud = 2 → hex = 0002 ✓

[3G*8800000015*000D*LK,50,100,100]
  ├─ CONTENT: "LK,50,100,100" → longitud = 13 → hex = 000D ✓

[3G*8800000015*000A*UPLOAD,600]
  ├─ CONTENT: "UPLOAD,600" → longitud = 10 → hex = 000A ✓
```

### Cálculo Correcto de LEN

```javascript
function calcLen(content) {
  return content.length.toString(16).toUpperCase().padStart(4, '0');
}

// Ejemplos:
calcLen('LK')              // → '0002' (2 bytes)
calcLen('LK,50,100,100')   // → '000D' (13 bytes)
calcLen('UD,...datos...')  // → '00CD' (205 bytes)
```

**NO son índices de mensaje, son longitudes de contenido.**

## Tipos de Mensajes Implementados

### 1. LK (Keep-Alive / Heartbeat)

**Dispositivo → Servidor:**
```
[3G*8800000015*0002*LK]
[3G*8800000015*000D*LK,50,100,100]
```

**Parámetros (opcional):**
- Pasos del día
- Volteretas del cuerpo (durante sueño)
- Porcentaje de batería

**Servidor → Dispositivo (Respuesta - CRÍTICO):**
```
[3G*8800000015*0002*LK]
```

### ⚠️ REGLA DE ORO DEL LK

**El dispositivo ignora respuestas con LEN incorrecto.**

Si recibe:
```
[3G*8800000015*000D*LK,50,100,100]  ← CONTENT = 13 bytes
```

**DEBES responder EXACTAMENTE:**
```
[3G*8800000015*0002*LK]  ← CONTENT = 2 bytes (solo "LK")
```

**❌ ERRORES COMUNES (IGNORADOS POR EL DISPOSITIVO):**
- ❌ `[3G*8800000015*000D*LK]` - LEN incorrecto (reutilizado)
- ❌ `[3G*8800000015*0002*LK,OK]` - CONTENT incorrecto
- ❌ `[3G*8800000015*0001*LK]` - LEN incorrecto (1 byte)
- ❌ Responder con espacios o cambiar orden

**✅ CORRECTO:**
- ✅ `[3G*8800000015*0002*LK]` - Exactamente así

**Notas Importantes:**
- El dispositivo envía LK cada 5-8 minutos cuando está conectado
- DEBE recibir una respuesta correcta, o enviará LK cada minuto
- Si el servidor responde incorrectamente, el dispositivo lo reintenta cada 60 segundos
- Después de 5 fallos de conexión, el dispositivo se reinicia automáticamente
- El servidor DEBE mantenerse como conexión persistente (no cerrar socket)
- **Si la respuesta tiene LEN incorrecto, será ignorada completamente**

### 2. UD (Position Data / Ubicación)

**Dispositivo → Servidor:**
```
[3G*8800000015*00CD*UD,180916,025723,A,22.570733,N,113.8626083,E,0.00,249.5,0.0,6,100,60,0,0,00000010,7,255,460,1,...]
```

**Parámetros:**
| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| Fecha | DDMMYY | 180916 |
| Hora | HHMMSS (UTC) | 025723 |
| Estado | A=válido, V=inválido | A |
| Latitud | Coordenada decimal | 22.570733 |
| Hemisferio Lat | N/S | N |
| Longitud | Coordenada decimal | 113.8626083 |
| Hemisferio Lng | E/W | E |
| Velocidad | km/h | 0.00 |
| Dirección | Grados | 249.5 |
| Altitud | Metros | 0.0 |
| Satélites | Cantidad GPS | 6 |
| Señal GSM | 0-100 | 100 |
| Batería | % | 60 |
| Pasos | Contador | 0 |
| Volteretas | Durante sueño | 0 |
| Estado Dispositivo | Hexadecimal | 00000010 |
| Estaciones Base | Datos LBS | ... |

**Servidor → Dispositivo (Sin respuesta requerida)**

**Variantes:**
- `UD`: GSM 2G
- `UD_WCDMA`: 3G WCDMA
- `UD_LTE`: 4G LTE

### 3. AL (Alarm / Alarma)

**Dispositivo → Servidor:**
```
[3G*8800000015*00CD*AL,180916,064153,A,22.570512,N,113.8623267,E,...]
```

**Servidor → Dispositivo (Respuesta):**
```
[3G*8800000015*0002*AL]
```

**Tipos de Alarma (Estado Dispositivo - bits):**
- Bit 0: Batería baja
- Bit 16: Alarma SOS
- Bit 17: Alarma batería baja
- Bit 20: Retiro del reloj
- Bit 21: Caída detectada

### 4. bphrt (Blood Pressure & Heart Rate / Salud)

**Dispositivo → Servidor:**
```
[3G*8800000015*0013*bphrt,112,73,67,,,,]
```

**Parámetros:**
- Presión sistólica
- Presión diastólica
- Frecuencia cardíaca
- Altura (cm)
- Género (1=M, 2=F)
- Edad
- Peso (kg)

**Servidor → Dispositivo:**
```
[3G*8800000015*0006*bphrt]
```

## Comandos del Servidor

### IP (Cambiar Servidor)

**Formato:**
```
[3G*IMEI*HEX_LEN*IP,IP_ADDRESS,PORT]
```

**Ejemplo:**
```
[3G*8800000015*0014*IP,113.81.229.9,5900]
```

**Respuesta:**
- El dispositivo no responde a este comando
- Se desconecta del servidor actual
- Se conecta al nuevo servidor en 5-8 minutos
- Requiere reinicio del dispositivo (esperar o forzar reinicio manual)

**Implementación en Backend:**
```javascript
await tcpServer.changeServerIP(imei, '3.224.68.233', 7070);
// Internamente genera:
// [3G*XXXXXXXXXX*001F*IP,3.224.68.233,7070]
```

### UPLOAD (Configurar Intervalo de Carga)

**Formato:**
```
[3G*IMEI*HEX_LEN*UPLOAD,INTERVAL_SECONDS]
```

**Ejemplo:**
```
[3G*8800000015*000A*UPLOAD,600]
```

**Parámetros:**
- Intervalo en segundos (60-65535)
- Afecta solo en modo dinámico
- En modo sleep/ahorro solo se envía LK

### CR (Request Position / Solicitar Ubicación)

**Formato:**
```
[3G*IMEI*HEX_LEN*CR]
```

**Ejemplo:**
```
[3G*8800000015*0002*CR]
```

**Comportamiento:**
- Activa posicionamiento GPS inmediato
- Envía ubicación cada 20 segundos durante 3 minutos
- Luego vuelve a intervalo normal

**Implementación:**
```javascript
await tcpServer.requestLocation(imei);
```

### RESET (Reiniciar Dispositivo)

**Formato:**
```
[3G*IMEI*HEX_LEN*RESET]
```

**Respuesta del dispositivo:**
```
[3G*IMEI*HEX_LEN*RESET]
```

### FIND (Buscar Dispositivo)

**Formato:**
```
[3G*IMEI*HEX_LEN*FIND]
```

**Comportamiento:**
- El dispositivo suena durante 1 minuto
- Se puede cancelar presionando botón

## Implementación en el Backend

### Archivo: `protocol-parser.js`

**Funciones principales:**

```javascript
// Parsear mensaje entrante
const parsed = ProtocolParser.parse(message);
// Retorna: {type, imei, ...datos específicos}

// Generar respuesta
const response = ProtocolParser.generateCommandResponse(imei, commandType);
// Retorna: "[3G*IMEI*HEX_LEN*CONTENT]"

// Generar comando
const command = ProtocolParser.generateCommand(imei, 'IP', 
  {ip: '3.224.68.233', port: 7070}
);
// Retorna: "[3G*IMEI*HEX_LEN*IP,3.224.68.233,7070]"

// Calcular longitud hexadecimal
const hex = ProtocolParser.calculateHexLength(content);
// Retorna: "001F" para 31 bytes
```

### Archivo: `tcp-server.js`

**Métodos para enviar comandos:**

```javascript
// Cambiar servidor
await tcpServer.changeServerIP(imei, '3.224.68.233', 7070);

// Configurar intervalo
await tcpServer.setUploadInterval(imei, 600);

// Solicitar ubicación
await tcpServer.requestLocation(imei);

// Reiniciar dispositivo
await tcpServer.rebootDevice(imei);

// Buscar dispositivo
await tcpServer.findDevice(imei);

// Enviar comando personalizado
await tcpServer.sendCommand(imei, 'UPLOAD', {interval: 300});
```

### Archivo: `api-server.js`

**Endpoint para cambiar servidor:**

```javascript
POST /api/devices/:imei/change-server
{
  "serverIp": "3.224.68.233",
  "serverPort": 7070
}

Response:
{
  "success": true,
  "message": "Comando enviado...",
  "newServer": {
    "ip": "3.224.68.233",
    "port": 7070
  }
}
```

## Flujo de Conexión Típico

### 1. Conexión Inicial
```
Dispositivo: [3G*IMEI*0002*LK]
   ↓
Servidor recibe, parsea, actualiza BD
   ↓
Servidor responde: [3G*IMEI*0002*LK]
   ↓
Dispositivo recibe respuesta
```

### 2. Cambio de Servidor
```
Servidor: [3G*IMEI*001F*IP,3.224.68.233,7070]
   ↓
Dispositivo: No responde, se desconecta
   ↓
Esperar 5-8 minutos
   ↓
Dispositivo se reinicia internamente
   ↓
Dispositivo: [3G*IMEI*0002*LK] (a nuevo servidor)
   ↓
Servidor responde: [3G*IMEI*0002*LK]
```

## Manejo de Errores

### ❌ Error: Dispositivo Ignora Respuesta

**Síntoma:**
```
Enviado: [3G*8800000015*000D*LK,50,100,100]
Recibido: (nada) ← Dispositivo no responde
```

**Causa más probable: LEN incorrecto en respuesta**

**Soluciones:**
1. Verificar que respuesta sea exactamente: `[3G*8800000015*0002*LK]`
2. Verificar que NO reutilices el LEN recibido (000D)
3. Verificar que el LEN (0002) corresponda a "LK" (2 bytes)

**Código correcto:**
```javascript
// ✅ CORRECTO
const responseContent = 'LK';
const hexLen = responseContent.length.toString(16).toUpperCase().padStart(4, '0');
const response = `[3G*${imei}*${hexLen}*${responseContent}]`;
// Resultado: [3G*8800000015*0002*LK]

// ❌ INCORRECTO
const response = `[3G*${imei}*000D*LK]`; // Reutilizó LEN recibido
// Dispositivo ignorará esta respuesta
```

### ❌ Error: Dispositivo Desconecta Constantemente

**Síntoma:**
```
🔌 Nueva conexión desde X.X.X.X:XXXXX
📴 Desconectado X.X.X.X:XXXXX
(se repite cada 60 segundos)
```

**Causas:**
1. LEN incorrecto en respuesta de LK
2. Servidor cierra conexión (no persistente)
3. Firewall bloqueando puerto
4. Respuesta no llega al dispositivo

**Solución:**
1. Verificar LEN en respuesta
2. Mantener socket abierto (no cerrar después de responder)
3. Verificar firewall/security group
4. Ver logs del servidor: `docker logs smartwatch-backend -f`

### ❌ Error: "Enviado: 374, Recibido: 0"

**Síntoma en Hercules/NetAssist:**
```
Enviado:   374 bytes
Recibido:  0 bytes
```

**Causa:**
El LEN de la respuesta es incorrecto. El dispositivo (o simulador) lo rechaza.

**Solución:**
Verificar que la respuesta tenga el LEN correcto:
```
Si envías: [3G*IMEI*0002*LK]
Debes recibir: [3G*IMEI*0002*LK]

Si envías: [3G*IMEI*000D*LK,50,100,100]
Debes recibir: [3G*IMEI*0002*LK]  ← LEN siempre 0002 para "LK"
```

### Problema: Dispositivo no responde a comandos

**Síntoma:**
- Dispositivo muestra "Online"
- Pero no ejecuta comandos (CR, UPLOAD, etc.)

**Causas:**
1. Dispositivo no está realmente online (solo en UI)
2. Socket perdido después del último LK
3. Comando enviado con LEN incorrecto
4. Dispositivo en modo sleep/ahorro

**Solución:**
1. Esperar a que dispositivo envíe siguiente LK (5-8 minutos)
2. Reenviar comando
3. Verificar formato: `[3G*IMEI*HEX_LEN*COMANDO]`
4. Revisar logs del servidor

## Parámetros de Configuración

**docker-compose.yml:**
```yaml
environment:
  SERVER_IP: 3.224.68.233
  TCP_SERVER_PORT: 7070
  TCP_SERVER_HOST: 0.0.0.0
```

## Testing

### Prueba de LK con Hercules / NetAssist

**Paso 1: Conectar a tu servidor TCP**
```
Host: 3.224.68.233
Puerto: 7070
Protocolo: TCP
```

**Paso 2: Enviar Keep-Alive Simple**
```
[3G*8800000015*0002*LK]
```

**Paso 3: Esperar Respuesta**
```
[3G*8800000015*0002*LK]  ← Deberías ver EXACTAMENTE esto
```

**Si ves esto → ✅ Correcto**
```
Enviado: [3G*8800000015*0002*LK]
Recibido: [3G*8800000015*0002*LK]
```

**Si ves esto → ❌ LEN incorrecto**
```
Enviado: [3G*8800000015*0002*LK]
Recibido: (nada)
```

### Prueba de LK con Datos

**Enviar:**
```
[3G*8800000015*000D*LK,50,100,100]
```
(CONTENT = "LK,50,100,100" → 13 bytes → 000D hex)

**Deberías recibir:**
```
[3G*8800000015*0002*LK]
```
(CONTENT = "LK" → 2 bytes → 0002 hex)

**NO reutilices el LEN recibido (000D) en la respuesta.**

### Prueba desde Terminal

```bash
# Enviar desde dispositivo o simulador
echo "[3G*8800000015*0002*LK]" | nc localhost 7070

# El servidor debe responder con
[3G*8800000015*0002*LK]
```

### Prueba de Cambio de Servidor

```bash
curl -X POST http://localhost:3001/api/devices/351266770069591/change-server \
  -H "Content-Type: application/json" \
  -d '{"serverIp":"3.224.68.233","serverPort":7070}'
```

## Referencias
- Protocolo oficial: Beesure GPS SeTracker v2.0
- Documento completo: [PROTOCOLO_BEESURE.md](./PROTOCOLO_BEESURE.md)
- Especificación completa con todos los comandos disponibles

## Notas Importantes

1. **Conexión Persistente**: El servidor DEBE mantener conexiones abiertas (no cerrar socket después de LK)
2. **Respuesta a LK**: Es CRÍTICO responder correctamente a cada LK o el dispositivo lo reenvía constantemente
3. **Formato Hexadecimal**: La longitud SIEMPRE debe estar en 4 dígitos hexadecimales
4. **IMEI de 10 dígitos**: Usar solo los últimos 10 dígitos del IMEI completo
5. **Sin Espacios**: Los comandos NO tienen espacios entre campos
6. **Corchetes Obligatorios**: Cada mensaje DEBE empezar con `[` y terminar con `]`

## Historial de Cambios

### v1.0 (22 Dec 2025)
- Implementación completa del protocolo Beesure
- Soporte para LK, UD, AL, bphrt
- Comandos IP, UPLOAD, CR, RESET, FIND
- Métodos sendCommand y helpers en TCPServer
- API endpoint para cambio de servidor
