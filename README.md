# Smartwatch Enterprise System (Node.js/Next.js Edition) 🚀

Plataforma integral de alto rendimiento diseñada para la gestión masiva de smartwatches GPS, monitoreo de salud (Pulso, SpO2, Temperatura) y servicios de teleasistencia en tiempo real para poblaciones vulnerables.

🏗️ **Arquitectura y Motor de Conectividad Segmentada**
El sistema utiliza un modelo híbrido que combina un servidor TCP de baja latencia para la recepción de tramas binarias/string y un frontend moderno en Next.js para la visualización y control.

### Motor de Localización Híbrido (3 Niveles)
1. **Nivel 1 (GPS/GNSS)**: Posicionamiento satelital de alta precisión para exteriores.
2. **Nivel 2 (WiFi Triangulation)**: Localización en interiores mediante escaneo de MAC addresses SSID (Protocolo UD_LTE).
3. **Nivel 3 (LBS/Celltower)**: Posicionamiento basado en celdas de telefonía móvil como respaldo crítico cuando el GPS/WiFi no están disponibles.

🛠️ **Configuración y Despliegue**

### Variables de Entorno Críticas (.env)
| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `DB_PASSWORD` | Contraseña de la base de datos PostgreSQL | `Barcelona537` |
| `JWT_SECRET` | Llave para firma de tokens de sesión | `Barcelona537_Colombia_...` |
| `NEXT_PUBLIC_API_URL` | URL base para la API (vacía para rutas relativas) | `""` |
| `NEXT_PUBLIC_WS_URL` | URL base para WebSockets (detectado dinámicamente) | `""` |

### Despliegue con Docker
El sistema está completamente containerizado para entornos de alta disponibilidad.
```bash
# Reconstrucción y despliegue limpio
docker-compose build --no-cache
docker-compose up -d
```

> [!IMPORTANT]
> El sistema implementa **Fail-Safe Connectivity**: Si el dominio principal no es resoluble, el frontend detecta automáticamente la IP de origen y reconfigura los WebSockets en tiempo real para evitar pérdida de monitoreo.

🔄 **Lógica de Salud & Comandos (Burst Mode)**
Gestionado por el motor `reqTemp` y `ProtocolParser`:
- **Burst Mode**: Al solicitar temperatura, el sistema envía una ráfaga de 4 comandos independientes (`BT`, `BTEMP2`, `btemp2`, `HT`) para asegurar compatibilidad con modelos 2G, 3G y 4G/LTE.
- **Validación Estricta**: Filtrado automático de coordenadas `0,0` y limpieza de basura binaria de protocolos antiguos (AQSH).

📂 **Organización del Código**
- `backend/server/tcp-server.js`: Núcleo de comunicación TCP y persistencia.
- `backend/server/protocol-parser.js`: Inteligencia de parseo de tramas Beesure/Guardian.
- `frontend/app/`: Estructura Next.js 14 (App Router) con soporte multilingüe (ES/EN).
- `frontend/lib/config.js`: Centralizador de configuración dinámica de red.

📊 **Monitoreo y Accesibilidad**
- **Dashboard en Tiempo Real**: Visualización integrada de mapas, historial de salud y alertas de geocercas.
- **Soporte Multilingüe**: Interfaz adaptable con cambio de idioma instantáneo y persistente.
- **Logs Inteligentes**: Servidor con etiquetado visual mediante emojis (🌡️, 🩺, 📍, 💓) para depuración rápida en vivo.

**Desarrollado para Tranki Solutions - Seguridad y Monitoreo Especializado.**
