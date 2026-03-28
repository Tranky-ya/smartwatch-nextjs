# Protocolo Beesure GPS / 4P-Touch: Guía de Comandos

Este documento resume los comandos del protocolo Beesure GPS (usado por dispositivos 3G, CS, SG) extraídos de la documentación oficial de 4P-Touch.

## Estructura General
Todos los mensajes siguen el formato:
`[CódigoFabricante*IMEI*LongitudHex*Contenido]`
- **CódigoFabricante**: 3G, CS, SG, etc.
- **IMEI**: Últimos 10 dígitos del IMEI.
- **LongitudHex**: Longitud del *Contenido* en hexadecimal (4 dígitos).
- **Contenido**: Comando y parámetros separados por comas.

---

## 1. Mensajes de Estado y Ubicación (Dispositivo -> Servidor)

| Comando | Descripción | Parámetros Principales |
|:--- |:--- |:--- |
| **LK** | Heartbeat (Latido) | Pasos, Giros en sueño, % Batería |
| **UD** | Datos de Ubicación | Fecha, Hora, Lat, Lng, Velocidad, Satélites, Señal, Batería |
| **UD2** | Datos de Ciego | Igual que UD (enviado cuando recupera señal tras punto ciego) |
| **AL** | Alerta/Alarma | Igual que UD + Código de alarma en el campo de estado |
| **TS** | Terminal Status | Estado general del hardware y señal |

---

## 2. Comandos de Salud (Bidireccional)

| Comando | Descripción | Parámetros |
|:--- |:--- |:--- |
| **bphrt** | Salud Básica | Sistólica, Diastólica, Pulso, Altura, Género, Edad, Peso |
| **HT** | Health Total | Pulso, Sistólica, Diastólica, SpO2, Temperatura |
| **HR** | Heart Rate | Pulso (BPM) |
| **BP** | Blood Pressure | Sistólica, Diastólica |
| **BT** | Body Temperature | Temperatura corporal |
| **SPO2** | Oxígeno | % de saturación de oxígeno |
| **HRTSTART** | Iniciar Medición | Activa sensores de salud desde el servidor |

---

## 3. Configuración y Control (Servidor -> Dispositivo)

| Comando | Descripción | Parámetros |
|:--- |:--- |:--- |
| **IP** | Cambiar Servidor | Dirección IP, Puerto |
| **UPLOAD** | Intervalo de Carga | Segundos entre envíos de UD |
| **CR** | Medir Ahora (GPS) | Solicita posición inmediata |
| **FIND** | Buscar Reloj | El reloj empieza a sonar |
| **MONITOR** | Escucha Remota | El reloj hace una llamada silenciosa al número indicado |
| **SOS** | Números de SOS | SOS1, SOS2, SOS3 |
| **PHONB** | Agenda | Nombre1, Tel1, Nombre2, Tel2... |
| **LZ** | Idioma y Hora | Idioma (0..15), Zona Horaria (offset) |
| **RESET** | Reiniciar | Reinicia el hardware |
| **POWEROFF** | Apagar | Apaga el dispositivo remotamente |
| **FACTORY** | Reset Fábrica | Borra todas las configuraciones |
| **ANYTIME** | Monitoreo Auto | 1 (activar), 0 (desactivar) salud automática |
| **FALLDET** | Caída | Configuración de sensibilidad de caída |

---

## 4. Mensajería / Intercom

| Comando | Descripción |
|:--- |:--- |
| **TK** | Mensaje de Voz | Envío de audio comprimido (AMR/G711) |
| **TKQ** | Petición de Voz | El dispositivo pregunta si hay audios pendientes |

---

## Notas de Implementación
1. **Respuesta a LK**: Es OBLIGATORIO responder `[3G*IMEI*0002*LK]` a cada latido para mantener la sesión activa.
2. **Respuesta a AL**: Se debe responder `[3G*IMEI*0002*AL]` para confirmar recepción de alarma.
3. **LEN en respuestas**: El campo LongitudHex siempre debe representar el largo del *Contenido* enviado en ese mensaje específico.
