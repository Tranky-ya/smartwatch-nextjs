# 📋 Procedimientos Operativos - Relojes GPS 4P-Touch

**Fecha:** 2026-04-24
**Versión:** 1.0
**Basado en:** Documentación oficial 4P-Touch + análisis de protocolo

---

## 📱 Configuración de SIM Card (OBLIGATORIO)

Antes de insertar el SIM en cualquier reloj, verificar:

### ✅ Checklist Pre-Onboarding:

- [ ] **SIM 4G VoLTE nano** (compatible con Voice + SMS + GPRS)
- [ ] **Plan mensual:** Mínimo 100-120 MB de datos
- [ ] **PIN desactivado** (el reloj no puede ingresar PIN)
- [ ] **Buzón de voz desactivado** (si SOS no atiende, queda colgado en voicemail)
- [ ] **APN configurado** (ver tabla abajo)

### 🇨🇴 Configuración APN para Colombia

MCC fijo: **732**

| Operador   | MNC | APN                             | SMS de configuración                                    |
|------------|-----|---------------------------------|---------------------------------------------------------|
| Claro      | 101 | `internet.comcel.com.co`        | `pw,123456,apn,internet.comcel.com.co,,,732101#`       |
| Movistar   | 123 | `internet.movistar.com.co`      | `pw,123456,apn,internet.movistar.com.co,,,732123#`     |
| Tigo       | 103 | `web.colombiamovil.com.co`      | `pw,123456,apn,web.colombiamovil.com.co,,,732103#`     |
| WOM        | 111 | `internet.wom.co`               | `pw,123456,apn,internet.wom.co,,,732111#`              |
| ETB        | 187 | `internet.etb.net.co`           | `pw,123456,apn,internet.etb.net.co,,,732187#`          |

---

## 🚀 P1 — Onboarding de Dispositivo Nuevo

### Paso 1: Carga inicial
```
⚠️ CRÍTICO: Usar SOLO cargador 5V/1A
❌ NO usar cargadores rápidos 5V/2A - pueden dañar el reloj
```
- Cargar **1-2 horas** completamente antes del primer uso
- Verificar que el LED de carga encienda

### Paso 2: Preparar SIM
- Insertar SIM **con el reloj apagado**
- Verificar checklist de SIM arriba

### Paso 3: Primer encendido
1. Encender reloj (mantener botón power 3 segundos)
2. **Esperar 1 minuto SIN TOCAR NADA**
3. Observar si aparece señal de red

### Paso 4: Diagnóstico inicial
**¿Se conectó al servidor automáticamente?**

- ✅ **SÍ** → Saltar a Paso 8
- ❌ **NO** → Continuar a Paso 5

### Paso 5: Diagnóstico WiFi (opcional pero recomendado)
**Objetivo:** Descartar falla de hardware vs falla de configuración

```
1. Conectar reloj a un WiFi router (Settings > WiFi)
2. ¿Conecta y aparece en el servidor?
   - SÍ → Problema es el APN/SIM, ir a Paso 6
   - NO → Posible hardware defectuoso, RMA
```

### Paso 6: Configurar APN vía SMS
Desde tu móvil, enviar SMS al SIM del reloj:

**Para Claro:**
```
pw,123456,apn,internet.comcel.com.co,,,732101#
```

Esperar 10 segundos y luego enviar:
```
pw,123456,reset#
```

### Paso 7: Verificar configuración
Enviar SMS:
```
pw,123456,ts#
```

El reloj debe responder con algo como:
```
ver:G4C_HJ_EMMC_240...;
ID:g3a4b9zbba;
imei:868159043670382;
url:tu-servidor.com;     ← Verificar que sea TU servidor
port:7070;               ← Verificar tu puerto
NET:OK(100)              ← Debe decir OK, no NO
GPS:OK(1)                ← Si está outdoors
```

Si `url:` y `port:` apuntan a otro servidor → Ver P2 (Migración)

### Paso 8: Sincronización GPS inicial (CRÍTICO)
```
⚠️ DEBE hacerse OUTDOORS (al aire libre, no en edificios)
```

1. Llevar reloj al exterior (jardín, calle, balcón)
2. Reiniciar dispositivo
3. Esperar 3-5 minutos sin moverlo
4. Repetir reinicio **2-3 veces** si es necesario
5. Verificar en dashboard que aparezca con GPS válido

### Paso 9: Vincular en la app
- Escanear QR generado por el servidor (POST `/api/devices/:imei/generate-qr`)
- Asignar nombre y contactos de emergencia

---

## 🔄 P2 — Migración de Dispositivo a Tu Servidor

### Escenario A: Device está en servidor 4P-Touch oficial

**Costo:** Gratis
**Tiempo:** 1-2 días laborables

1. Enviar email a `sales@4p-touch.com`
2. Asunto: `FOTA Migration Request`
3. Body:
   ```
   IMEI: 868159043670382
   Nuevo servidor IP: tu-servidor.com
   Nuevo puerto: 7070
   ```
4. Ellos lo migran vía FOTA (Over-The-Air)
5. Reiniciar device outdoors 2-3 veces
6. Verificar con `pw,123456,ts#`

### Escenario B: Device está en servidor de tercero al que tienes acceso

1. Desde ese servidor, enviar comando TCP:
   ```
   [3G*IMEI*0014*IP,tu-servidor.com,7070]
   ```

2. O usar el endpoint REST de este proyecto:
   ```bash
   POST /api/devices/:imei/change-server
   {
     "ip": "tu-servidor.com",
     "port": 7070
   }
   ```

3. El device se desconectará automáticamente
4. Reiniciar outdoors 2-3 veces
5. Esperar 6-8 minutos
6. Si no conecta, enviar SMS `pw,123456,ts#` para verificar

### Escenario C: Compra bulk de dispositivos nuevos

**Recomendado para órdenes 10+ unidades**

1. Antes del shipping, pedir a 4P-Touch que preconfiguren:
   - Server IP: `tu-servidor.com`
   - Port: `7070`
   - APN: `internet.comcel.com.co,,,732101` (Claro Colombia)

2. **Gratis** si se solicita antes del envío
3. Los devices llegan pre-configurados, solo cargar e insertar SIM

---

## 🔧 P3 — Reactivar Dispositivo "Muerto" (No Enciende)

### Síntoma:
Device no responde al botón de encendido, pantalla negra.

### Procedimiento (en orden):

#### 1. Carga prolongada (resolver 80% de casos)
```
- Cargar 1-2 horas con cargador 5V/1A
- NO usar cargador rápido
- Verificar que LED de carga encienda
- Intentar encender después de 2h
```

#### 2. Hard reset por botón (firmware antiguo)
```
⚠️ Funciona solo en firmware pre-2022
```
- Mantener botón power presionado **25 segundos**
- Soltar y esperar 5 segundos
- Intentar encender normalmente

#### 3. Descarga total + recarga
```
1. Si el reloj enciende pero se apaga inmediato:
   - Dejar encendido hasta que se descargue 100%
   - Conectar cargador 5V/1A
   - Cargar 2 horas completas
   - Intentar encender
```

#### 4. Short-circuit de batería (AVANZADO)
```
⚠️ Solo si tienes experiencia con electrónica
```
1. Abrir tapa trasera del reloj (4 tornillos pequeños)
2. Localizar conectores rojo (+) y negro (-) de batería
3. Con pinzas de metal, hacer contacto entre ambos por 2 segundos
4. Cerrar reloj
5. Conectar a cargador 2 horas
6. Intentar encender

#### 5. RMA (Return Merchandise Authorization)
Si ninguno de los anteriores funciona:
- Probable daño por agua o componente quemado
- Contactar a proveedor para reemplazo

---

## 🩺 P4 — Diagnóstico de Dispositivo "Perdido"

### Síntoma:
Device aparece offline en el servidor, no envía datos.

### Árbol de decisión:

#### Test 1: SMS de estado
```
Enviar: pw,123456,ts#
```

**¿Responde el reloj?**

##### A. SÍ responde

Leer la respuesta:

**`NET:NO` → Problema de conectividad SIM**
```
Causas comunes:
- SIM sin saldo/datos
- APN mal configurado
- GPRS desactivado por operador
- SIM bloqueada

Solución:
1. Verificar saldo de SIM
2. Reenviar APN: pw,123456,apn,internet.comcel.com.co,,,732101#
3. Reiniciar: pw,123456,reset#
```

**`NET:OK` pero `url:` apunta a OTRO servidor → Device mal configurado**
```
Solución:
1. Ver P2 (Migración)
2. Enviar: pw,123456,ip,tu-servidor.com,7070#
3. Reiniciar outdoors 2-3 veces
```

**`NET:OK` y `url:` es correcto → Problema en TU servidor**
```
Verificar:
1. Puerto 7070 abierto en firewall
2. Servicio TCP corriendo: docker-compose ps
3. Logs del backend: docker-compose logs backend | grep IMEI
4. ¿Hay intentos de conexión rechazados?
```

##### B. NO responde

**Causas posibles:**
```
1. Reloj apagado/sin batería
2. SIM sin señal de red (verificar coverage map)
3. SIM muerta/defectuosa
4. Hardware dañado
```

**Solución:**
1. Si está accesible físicamente: intentar encender (ver P3)
2. Probar conectar a WiFi router para descartar hardware
3. Si conecta por WiFi pero no por SIM → reemplazar SIM
4. Si no conecta ni por WiFi → RMA

#### Test 2: Revisar logs del servidor
```bash
# Buscar intentos de conexión del IMEI
docker-compose logs backend | grep "868159043670382"

# ¿Hay intentos de conexión?
```

**SÍ hay intentos:**
```
Buscar errores como:
- "IMEI INVÁLIDO" → Actualizar firmware (bug ya corregido en v3.4.A)
- "Protocol mismatch" → Device usa protocolo CS/SG, servidor espera 3G
- "Socket timeout" → Problema de red entre device y servidor
```

**NO hay intentos:**
```
→ El device no está intentando conectar
→ Volver a Test 1 (SMS)
```

---

## 📊 P5 — Interpretación del Comando TS (Terminal Status)

Cuando envías `pw,123456,ts#`, el reloj responde con metadata valiosa:

### Ejemplo de respuesta:
```
ver:G4C_HJ_EMMC_240_5M_En_N_2022.11.16_16.38.00;
ID:g3a4b9zbba;
imei:868159043670382;
url:52.28.132.157;
port:8001;
upload:3600;
lk:300;
batlevel:80;
language:cs;
zone:+02:00;
profile:1;
GPS:OK(1);
wifiOpen:true;
wifiConnect:true;
gprsOpen:true;
NET:OK(100)
```

### Decodificación de campos críticos:

| Campo         | Valor Ejemplo | Significado                                      |
|---------------|---------------|--------------------------------------------------|
| `ver`         | `G4C_HJ_...`  | Versión exacta de firmware                       |
| `ID`          | `g3a4b9zbba`  | ID auto-generado (dispositivos 4G modernos)      |
| `imei`        | `86815904...` | IMEI completo (15 dígitos)                       |
| `url`         | `52.28.132...`| **Servidor al que está conectado actualmente**   |
| `port`        | `8001`        | **Puerto TCP usado**                             |
| `upload`      | `3600`        | Intervalo de reporte (segundos) - 3600 = 1 hora |
| `lk`          | `300`         | Intervalo heartbeat (segundos) - 300 = 5 min    |
| `batlevel`    | `80`          | Batería % (0-100)                                |
| `GPS`         | `OK(1)` / `NO`| **OK = outdoors / NO = indoors o sin señal**     |
| `wifiOpen`    | `true`/`false`| WiFi habilitado                                  |
| `wifiConnect` | `true`/`false`| **WiFi conectado a router**                      |
| `gprsOpen`    | `true`/`false`| GPRS habilitado                                  |
| `NET`         | `OK(100)` /`NO`| **OK = red activa / NO = sin conexión**         |

### 🎯 Diagnósticos rápidos con TS:

**Device conectado a servidor equivocado:**
```
url: 52.28.132.157  (debería ser tu-servidor.com)
→ Solución: Enviar comando IP (ver P2)
```

**Device está indoors (sin GPS):**
```
GPS: NO
→ Normal si está en edificio. Salir al exterior para GPS.
```

**Device offline a pesar de estar online:**
```
NET: OK(100)
url: tu-servidor.com  ✓
port: 7070           ✓
→ Problema en TU servidor (revisar logs/firewall)
```

**WiFi conectado pero GPRS no:**
```
wifiConnect: true
NET: NO
→ SIM sin datos/APN mal configurado
```

---

## 🔐 P6 — Comandos SMS que SIEMPRE Funcionan

Estos 6 comandos funcionan **incluso si el device está en otro servidor**:

| # | Comando                                  | Descripción                      |
|---|------------------------------------------|----------------------------------|
| 1 | `pw,123456,pw,NUEVA_PASSWORD#`           | Cambiar password (default: 123456)|
| 2 | `pw,123456,verno#`                       | Obtener versión firmware         |
| 3 | `pw,123456,ts#`                          | Estado completo (⭐ MÁS ÚTIL)    |
| 4 | `pw,123456,reset#`                       | Reiniciar device                 |
| 5 | `pw,123456,apn,NOMBRE_APN,,,732101#`     | Configurar APN                   |
| 6 | `pw,123456,imei,015DIGITOS#`             | Reescribir IMEI (⚠️ ilegal en algunos países) |

### ⚠️ Comandos obsoletos (NO usar):
- `pw,123456,ip,IP,PORT#` → Bloqueado en firmware nuevos por UE
- `pw,123456,center,NUMERO#` → Use TCP command en su lugar
- `pw,123456,upload,SEGUNDOS#` → Use TCP command

---

## 🛡️ P7 — Prevención de Daños Comunes

### ❌ Errores que matan el hardware:

1. **Cargador rápido 5V/2A**
   - ❌ Causa: Sobrevoltaje quema circuitos
   - ✅ Usar: 5V/1A exclusivamente

2. **Reinicio con PIN activado en SIM**
   - ❌ Causa: Device no puede ingresar PIN → bootloop
   - ✅ Desactivar PIN antes de insertar

3. **Firmware downgrade manual**
   - ❌ Causa: Brick permanente
   - ✅ Solo FOTA oficial de 4P-Touch

4. **Exposición prolongada al agua**
   - ❌ Modelos NO sumergibles (IP67 max = salpicaduras)
   - ✅ Evitar natación/duchas

5. **Presión excesiva en pantalla táctil**
   - ❌ Digitizer se rompe fácilmente
   - ✅ Toques suaves

---

## 📞 Contactos de Soporte

**Fabricante (4P-Touch):**
- Email: sales@4p-touch.com
- Asunto para FOTA: `FOTA Migration Request`
- Asunto para protocolo binario: `AQSH Binary Protocol Specification Request`

**Documentación oficial:**
- Protocol: https://www.4p-touch.com/beesure-gps-setracker-server-protocol.html
- Portal: https://www.4p-touch.com/server-portal-configuration-guide.html

---

## 📝 Plantilla de Ticket de Soporte

Cuando reportes problemas a 4P-Touch, incluir:

```
Subject: [ISSUE] Device connection problem - IMEI XXXXXX

Device Information:
- IMEI: 868159043670382
- Model: (enviar foto del hangtag o caja)
- Purchase Date: 2024-01-15
- Firmware Version: (resultado de pw,123456,verno#)

Current Server:
- URL: tu-servidor.com
- Port: 7070
- Protocol: Beesure TCP

Issue Description:
[Descripción detallada]

TS Command Output:
[Pegar resultado completo de pw,123456,ts#]

Troubleshooting Already Done:
- [x] Verified SIM has data/credit
- [x] Tested WiFi connection (works/doesn't work)
- [x] Sent APN config SMS
- [x] Restarted device outdoors 3 times
- [x] Checked server logs (attach screenshot)

Request:
[Migración FOTA / Protocolo binario / RMA / etc.]
```

---

**Última actualización:** 2026-04-24
**Autor:** Claude (Anthropic) + Documentación 4P-Touch
**Versión:** 1.0
