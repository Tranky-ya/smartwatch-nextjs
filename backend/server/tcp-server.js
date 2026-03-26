const net = require('net');
const { EventEmitter } = require('events');
require('dotenv').config();
const ProtocolParser = require('./protocol-parser');
const { Device, Position, Alert, HealthData, DailySteps } = require('./models');
const { sequelize, testConnection } = require('./database');
const { QueryTypes, Op } = require('sequelize');
const geofenceService = require('../services/geofence-service');
const LocationPrioritizationService = require('../services/location-prioritization-service');
const HybridLocationEngine = require('./hybrid-location-engine');

function extractFrames(buffer) {
  const frames = [];
  let current = '';
  let inside = false;

  for (const ch of buffer) {
    if (ch === '[') {
      inside = true;
      current = '[';
      continue;
    }

    if (inside) {
      current += ch;
    }

    if (ch === ']' && inside) {
      frames.push(current);
      current = '';
      inside = false;
    }
  }

  return frames;
}

class TCPServer extends EventEmitter {
  constructor(host, port, websocketServer = null) {
    super();
    this.host = host || process.env.TCP_SERVER_HOST || '0.0.0.0';
    this.port = port || process.env.TCP_SERVER_PORT || 7070;
    this.server = null;
    this.connections = new Map();
    this.websocketServer = websocketServer;
    this.heartbeatMonitor = null;
    this.locationPrioritizer = new LocationPrioritizationService();

    // Configuración de timeouts
    this.HEARTBEAT_TIMEOUT = 2 * 60 * 1000; // 2 minutos sin heartbeat = offline
    this.MONITOR_INTERVAL = 15 * 1000; // Revisar cada 15 segundos

    this.locationEngine = new HybridLocationEngine({
      googleApiKey: process.env.GOOGLE_GEOLOCATION_API_KEY,
      unwiredLabsToken: process.env.UNWIRED_LABS_TOKEN,
      openCellIDToken: process.env.OPENCELLID_API_TOKEN,
      logLevel: 'info'
    });
  }

  setWebSocketServer(websocketServer) {
    this.websocketServer = websocketServer;
    console.log('[OK] WebSocket Server vinculado al TCP Server');
  }

  setActiveLocationService(activeLocationService) {
    this.activeLocationService = activeLocationService;
    console.log('[OK] Active Location Service vinculado al TCP Server');
  }

  getSocketByIMEI(imei) {
    if (!imei) return null;
    const imeiStr = String(imei).slice(-10);
    
    // Convertimos a array para buscar desde el final (más reciente)
    const entries = Array.from(this.connections.entries());
    
    for (let i = entries.length - 1; i >= 0; i--) {
      const [socket, info] = entries[i];
      
      if (info && info.imei === imeiStr) {
        if (!socket.destroyed && socket.writable) {
          return socket;
        } else {
          // Limpieza proactiva de sockets muertos
          this.connections.delete(socket);
        }
      }
    }
    
    return null;
  }


  async start() {
    try {
      await testConnection();
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`\n[START] Servidor TCP iniciado en ${this.host}:${this.port}`);
        console.log(`[WAIT] Esperando conexiones de dispositivos...\n`);
      });

      this.server.on('error', (error) => {
        console.error('[ERROR] Error en servidor TCP:', error);
      });

      this.startHeartbeatMonitor();
      console.log(`[MONITOR] Monitor de heartbeat iniciado (timeout: ${this.HEARTBEAT_TIMEOUT/1000}s, intervalo: ${this.MONITOR_INTERVAL/1000}s)`);

    } catch (error) {
      console.error('[ERROR] Error iniciando servidor TCP:', error);
      process.exit(1);
    }
  }

  handleConnection(socket) {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[CONNECT] Nueva conexion desde ${clientInfo}`);

    let buffer = '';
    let currentDevice = null;
    const processMessage = this.processMessage.bind(this);

    socket.on('data', async (data) => {
      try {
        const rawString = data.toString('utf8');
        console.log(`\n[RAW] [${clientInfo}] >>> ${JSON.stringify(rawString)}`);
        console.log(`   Bytes: [${Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);

        buffer += rawString;

        while (true) {
          const start = buffer.indexOf('[');
          if (start === -1) break;

          if (start > 0) {
            const junk = buffer.slice(0, start);
            if (junk.trim()) {
              console.warn(`[WARN] [${clientInfo}] Bytes fuera de frame descartados: ${JSON.stringify(junk)}`);
            }
            buffer = buffer.slice(start);
          }

          const end = buffer.indexOf(']');
          if (end === -1) break;

          const frame = buffer.slice(0, end + 1);
          buffer = buffer.slice(end + 1);

          const cleanedFrame = frame.trim();
          if (!cleanedFrame) continue;

          console.log(`[CLEAN] [${clientInfo}] >>> ${JSON.stringify(cleanedFrame)}`);
          console.log(`   Largo: ${cleanedFrame.length} caracteres`);
          console.log(`[VALIDATE] [${clientInfo}] Validando formato...`);
          currentDevice = await processMessage(socket, cleanedFrame, currentDevice);
        }

        if (buffer.includes('\n') || buffer.includes('\r')) {
          const parts = buffer.split(/[\r\n]+/);
          buffer = parts.pop() || '';

          for (const part of parts) {
            const cleaned = part.trim();
            if (!cleaned) continue;

            if (cleaned.startsWith('[') && !cleaned.includes(']')) {
              buffer = cleaned + buffer;
              continue;
            }

            console.log(`[CLEAN] [${clientInfo}] >>> ${JSON.stringify(cleaned)}`);
            console.log(`   Largo: ${cleaned.length} caracteres`);

            if (cleaned.toLowerCase() === 'exit' || cleaned.toLowerCase() === 'quit') {
              console.log(`[EXIT] [${clientInfo}] Comando EXIT/QUIT manual recibido - cerrando conexion`);
              socket.end();
              return;
            }

            console.log(`[VALIDATE] [${clientInfo}] Validando formato...`);
            currentDevice = await processMessage(socket, cleaned, currentDevice);
          }
        }
      } catch (error) {
        console.error(`[ERROR] Error procesando datos de ${clientInfo}:`, error.stack);
      }
    });

    socket.on('end', () => {
      if (currentDevice) {
        console.log(`[DISCONNECT] [${currentDevice.imei}] Desconectado`);
        this.connections.delete(socket);
        currentDevice.update({ is_online: false }).catch(console.error);
      } else {
        console.log(`[DISCONNECT] Desconectado ${clientInfo}`);
      }
    });

    socket.on('error', (error) => {
      console.error(`[ERROR] Error en conexion ${clientInfo}:`, error.message);
    });
  }

  async processMessage(socket, message, currentDevice) {
    try {
      console.log(`\n[PARSE] Iniciando analisis de mensaje...`);

      const parsed = ProtocolParser.parse(message);

      if (!parsed) {
        console.warn(`[PARSE-FAIL] Mensaje NO parseado/rechazado por validacion`);
        console.warn(`   Mensaje original: ${JSON.stringify(message)}`);
        return currentDevice;
      }

      console.log(`[PARSE-OK] Mensaje parseado exitosamente`);
      console.log(`   Tipo: ${parsed.type}`);
      console.log(`   IMEI: ${parsed.imei}`);

      if (!String(parsed.imei || '').match(/^\d{10}$/)) {
        console.warn(`[PARSE-FAIL] IMEI invalido desde parser, descartando para evitar device fantasma`);
        console.warn(`   Tipo: ${parsed.type}, IMEI: ${JSON.stringify(parsed.imei)}, Mensaje: ${JSON.stringify(message)}`);
        return currentDevice;
      }

      let device = currentDevice;
      if (!device || device.imei !== parsed.imei) {
        console.log(`[DB] Buscando dispositivo ${parsed.imei} en BD...`);
        device = await Device.findOne({ where: { imei: parsed.imei } });

        if (!device) {
          console.warn(`[DB-CREATE] Dispositivo ${parsed.imei} NO encontrado - Creando nuevo...`);
          device = await Device.create({
            imei: parsed.imei,
            name: `Device ${parsed.imei}`,
            organization_id: 'e5998eca-315a-44c6-a352-90d22380c5e8',
            is_online: true
          });
          console.log(`[DB-OK] Dispositivo creado exitosamente`);
        } else {
          console.log(`[DB-OK] Dispositivo encontrado en BD`);
        }

        this.connections.set(socket, { imei: parsed.imei, device });
      }

      console.log(`[DB-UPDATE] Actualizando estado: is_online=true`);
      await device.update({
        is_online: true,
        last_connection: new Date()
      });

      console.log(`[ROUTER] Ruteando al handler de tipo: ${parsed.type}`);

      switch (parsed.type) {
        case 'LK':
          await this.handleHeartbeat(device, parsed);
          break;
        case 'UD':
          await this.handlePosition(device, parsed);
          break;
        case 'AL':
          await this.handleAlarm(device, parsed);
          break;
        case 'bphrt':
        case 'SPO2':
        case 'HT': // 🔥 Health Total
        case 'HR': // Heart Rate
        case 'BP': // Blood Pressure
        case 'BT': // Body Temperature
          await this.handleHealthData(device, parsed);
          break;
        case 'CR':
          await this.handleCR(device, parsed);
          break;
        case 'TS':
          await this.handleTerminalStatus(device, parsed);
          break;
        case 'DEVICEFUNCCOUNT':
          console.log(`[STATS] [${device.imei}] Estadísticas de funciones recibidas`);
          break;
        case 'HANDSHAKE':
          await this.handleHandshake(device, parsed);
          break;
        default:
          console.log(`[INFO] [${device.imei}] Mensaje tipo ${parsed.type} recibido sin handler específico (OK)`);
      }

      const response = ProtocolParser.generateCommandResponse(device.imei, parsed.type);

      // 🚫 Inhibir respuesta automática para TK para evitar bucles infinitos
      if (parsed.type === 'TK' || parsed.type === 'TKQ' || parsed.type === 'TKQ2') {
        console.log(`[INFO] [${device.imei}] Mensaje de voz/chat (TK) - Respuesta automática suprimida`);
        return device;
      }

      if (response) {
        console.log(`\n[RESPONSE] Respuesta generada`);
        const responseWithNewline = response + '\n';
        console.log(`[SEND] [${parsed.imei}] Mensaje: ${JSON.stringify(response)}`);
        console.log(`[SEND] [${parsed.imei}] Con \\n: ${JSON.stringify(responseWithNewline)}`);
        console.log(`[SEND] [${parsed.imei}] Bytes: [${Array.from(Buffer.from(responseWithNewline)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);
        socket.write(responseWithNewline);
        console.log(`[SEND-OK] [${parsed.imei}] Respuesta enviada exitosamente`);
      } else {
        console.log(`[INFO] [${parsed.imei}] Sin respuesta para tipo: ${parsed.type}`);
      }

      return device;
    } catch (error) {
      console.error('[ERROR] Error procesando mensaje:', error);
      return currentDevice;
    }
  }

  async handleHeartbeat(device, parsed) {
    try {
      const stepsToday = await this.calculateDailySteps(device.id, parsed.steps);

      await device.update({
        battery_level: parsed.battery,
        steps_today: stepsToday,
        steps_total: parsed.steps,
        last_heartbeat: new Date(),
        is_online: true
      });

      console.log(`[HEARTBEAT] [${device.imei}] Heartbeat - Bateria: ${parsed.battery}%, Pasos hoy: ${stepsToday}, Total: ${parsed.steps}`);

      if (parsed.battery < 20) {
        await Alert.create({
          device_id: device.id,
          alert_type: 'LOW_BATTERY',
          severity: 'MEDIUM',
          message: `Bateria baja: ${parsed.battery}%`,
          alert_time: new Date(),
          status: 'NEW'
        });
      }
    } catch (error) {
      console.error('[ERROR] Error en heartbeat:', error);
    }
  }

  async handlePosition(device, parsed) {
    try {
      console.log(`[POSITION] [${device.imei}] Posicion recibida`);
      console.log(`   Lat: ${parsed.latitude}, Lng: ${parsed.longitude}`);
      console.log(`   Bateria: ${parsed.battery}%`);
      console.log(`   Tipo original: ${parsed.location_type || parsed.positionType || 'UNKNOWN'}`);
      console.log(`   Valid: ${parsed.gps_valid ? 'A' : 'V'}`);
      console.log(`   Satelites: ${parsed.satellites || 0}`);

      const bestLocation = this.locationPrioritizer.getBestLocation(parsed);
      
      // 🚀 INTEGRACIÓN CON MOTOR HÍBRIDO
      // Si la mejor opción es LBS o WiFi con coordenadas sospechosas, procesar con el motor
      let processingResult = null;
      if (bestLocation.source === 'LBS' || bestLocation.source === 'WiFi' || !parsed.gps_valid) {
        console.log(`[HYBRID] [${device.imei}] Ubicación débil detectada (${bestLocation.source}), resolviendo vía Motor Híbrido...`);
        processingResult = await this.locationEngine.processLocation({
          imei: device.imei,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          gpsStatus: parsed.valid,
          satellites: parsed.satellites,
          mcc: parsed.mcc || 334, // Default Mexico if unknown
          mnc: parsed.mnc || 1,
          lac: parsed.lac,
          cellId: parsed.cell_id,
          wifiAccessPoints: parsed.wifi_data ? ProtocolParser.parseWiFiData(parsed.wifi_raw.split(',')) : []
        });

        if (processingResult && processingResult.latitude) {
            console.log(`[HYBRID-OK] [${device.imei}] Ubicación RESUELTA: ${processingResult.latitude}, ${processingResult.longitude} (Source: ${processingResult.source})`);
            bestLocation.location.latitude = processingResult.latitude;
            bestLocation.location.longitude = processingResult.longitude;
            bestLocation.source = processingResult.source;
            bestLocation.accuracy = processingResult.accuracy;
            bestLocation.reason = `Resolved via Hybrid Engine (${processingResult.source})`;
        }
      }

      const report = this.locationPrioritizer.getDecisionReport(bestLocation);

      console.log(`\n[LOCATION-PRIORITY] Selección inteligente:`);
      console.log(`   📍 Source: ${report.source_display}`);
      console.log(`   📏 Precisión estimada: ~${report.accuracy_meters}m`);
      console.log(`   🎯 Confianza: ${report.confidence_percent}%`);
      console.log(`   💡 Razón: ${report.reason}`);
      console.log(`   📊 Prioridad: ${bestLocation.priority}\n`);

      const finalLat = bestLocation.location.latitude;
      const finalLng = bestLocation.location.longitude;
      const finalSource = bestLocation.source;
      const finalAccuracy = bestLocation.accuracy;

      await Position.create({
        device_id: device.id,
        message_type: 'UD',
        device_time: parsed.device_time || new Date(),
        server_time: new Date(),
        gps_valid: parsed.gps_valid || false,
        latitude: finalLat,
        longitude: finalLng,
        lat_direction: finalLat >= 0 ? 'N' : 'S',
        lon_direction: finalLng >= 0 ? 'E' : 'W',
        speed: parsed.speed || 0,
        course: parsed.course || 0,
        altitude: parsed.altitude || 0,
        satellites: parsed.satellites || 0,
        hdop: parsed.hdop || 0,
        mcc: parsed.mcc || null,
        mnc: parsed.mnc || null,
        lac: parsed.lac || null,
        cell_id: parsed.cell_id || null,
        wifi_data: parsed.wifi_raw || parsed.wifi_data || null,
        battery_level: parsed.battery || null,
        signal_strength: parsed.signal_strength || null,
        alarm_type: parsed.alarm_type || null,
        alarm_decoded: parsed.alarm_decoded || null,
        raw_message: parsed.raw_message || null,
        location_type: finalSource,
        accuracy: finalAccuracy
      });

      if (this.activeLocationService) {
        this.activeLocationService.markCommandReceived(device.imei, 'UD');
      }

      await device.update({
        battery_level: parsed.battery || device.battery_level,
        last_latitude: finalLat,
        last_longitude: finalLng
      });

      if (finalLat && finalLng) {
        await geofenceService.checkGeofences(device, finalLat, finalLng);
      }
    } catch (error) {
      console.error('[ERROR] Error procesando posicion:', error);
    }
  }

  async handleAlarm(device, parsed) {
    try {
      const alarmType = parsed.alarm_type || 'OTHER';
      const alarms = parsed.alarms || {};

      console.log(`🚨 [ALARM] [${device.imei}] Alarma recibida`);
      console.log(`   📌 Tipo: ${alarmType}`);
      console.log(`   📍 Posición: ${parsed.latitude}, ${parsed.longitude}`);
      console.log(`   🔍 Detalles:`, alarms);

      let severity = 'MEDIUM';
      if (alarms.sos || alarms.fallDown) severity = 'CRITICAL';
      else if (alarms.lowBattery) severity = 'HIGH';

      let message = 'Alarma desconocida';
      if (alarms.sos) message = '🆘 Botón SOS presionado';
      else if (alarms.fallDown) message = '⚠️ CAÍDA DETECTADA';
      else if (alarms.lowBattery) message = '🔋 Batería baja';
      else if (alarms.geofenceIn) message = '📍 Entrada a geocerca';
      else if (alarms.geofenceOut) message = '📍 Salida de geocerca';
      else if (alarms.powerOff) message = '⚡ Dispositivo apagado';
      else if (alarms.takeOff) message = '⌚ Dispositivo removido';

      await Alert.create({
        device_id: device.id,
        alert_type: alarmType,
        severity: severity,
        message: message,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        alert_time: new Date(),
        status: 'NEW'
      });

      if (alarms.sos && this.activeLocationService) {
        console.log(`[SOS] [${device.imei}] Evento SOS detectado - Solicitando GPS activo`);
        setTimeout(async () => {
          try {
            await this.activeLocationService.handleSOSEvent(device.imei);
          } catch (error) {
            console.error(`[SOS] Error solicitando GPS para ${device.imei}:`, error);
          }
        }, 1000);
      }

      await Position.create({
        device_id: device.id,
        message_type: 'AL',
        device_time: parsed.device_time || new Date(),
        server_time: new Date(),
        gps_valid: parsed.gps_valid || false,
        latitude: Math.abs(parsed.latitude),
        longitude: Math.abs(parsed.longitude),
        lat_direction: parsed.latitude >= 0 ? 'N' : 'S',
        lon_direction: parsed.longitude >= 0 ? 'E' : 'W',
        speed: parsed.speed || 0,
        course: parsed.course || 0,
        altitude: parsed.altitude || 0,
        satellites: parsed.satellites || 0,
        battery_level: parsed.battery || null,
        signal_strength: parsed.signal_strength || null,
        alarm_type: alarmType,
        alarm_decoded: alarms,
        raw_message: parsed.raw_message || null
      });
    } catch (error) {
      console.error('[ERROR] Error procesando alarma:', error);
    }
  }

  async handleHealthData(device, parsed) {
    try {
      const healthData = {
        heartRate: parsed.heartRate || 0,
        bloodPressure: {
          systolic: parsed.systolic || parsed.bloodPressure?.systolic || 0,
          diastolic: parsed.diastolic || parsed.bloodPressure?.diastolic || 0
        },
        spo2: parsed.spo2 || 0,
        temperature: parsed.temperature || 0
      };

      await HealthData.create({
        device_id: device.id,
        heart_rate: healthData.heartRate,
        systolic_pressure: healthData.bloodPressure.systolic,
        diastolic_pressure: healthData.bloodPressure.diastolic,
        spo2: healthData.spo2,
        temperature: healthData.temperature,
        measurement_time: new Date()
      });

      console.log(`[HEALTH] [${device.imei}] Datos de salud guardados`);
      console.log(`   FC: ${healthData.heartRate} BPM`);
      console.log(`   PA: ${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic}`);
      console.log(`   SpO2: ${healthData.spo2}%`);

    } catch (error) {
      console.error('[ERROR] Error procesando datos de salud:', error);
    }
  }

  async handleCR(device, parsed) {
    console.log(`[CR] [${device.imei}] Eco de comando recibido`);
  }

  async handleTerminalStatus(device, parsed) {
    try {
      console.log(`[TS] [${device.imei}] Terminal Status actualizado`);
      console.log(`   Bateria: ${parsed.battery}%`);
      console.log(`   Senal: ${parsed.signal}%`);
      console.log(`   Firmware: ${parsed.deviceInfo?.firmware_version || 'N/A'}`);
      console.log(`   Idioma: ${parsed.deviceInfo?.language || 'N/A'}`);
      console.log(`   GPS: ${parsed.deviceInfo?.gps_status || 'N/A'}`);
      console.log(`   WiFi: ${parsed.deviceInfo?.wifi_connect ? 'Conectado' : 'Desconectado'}`);

      await device.update({
        battery_level: parsed.battery || device.battery_level,
        signal_strength: parsed.signal || device.signal_strength,
        language: parsed.deviceInfo?.language || device.language,
        firmware_version: parsed.deviceInfo?.firmware_version || device.firmware_version,
        device_info: parsed.deviceInfo || device.device_info
      });
    } catch (error) {
      console.error('[ERROR] Error procesando Terminal Status:', error);
    }
  }

  async checkHealthAlerts(device, healthData) {
    const alerts = [];

    if (healthData.heartRate > 120 || healthData.heartRate < 50) {
      alerts.push({
        type: 'HEALTH_HR_ABNORMAL',
        message: `Frecuencia cardiaca anormal: ${healthData.heartRate} BPM`,
        severity: 'HIGH'
      });
    }

    if (healthData.bloodPressure.systolic > 140 || healthData.bloodPressure.diastolic > 90) {
      alerts.push({
        type: 'HEALTH_BP_HIGH',
        message: `Presion arterial alta: ${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic}`,
        severity: 'MEDIUM'
      });
    }

    if (healthData.bloodPressure.systolic < 90 || healthData.bloodPressure.diastolic < 60) {
      alerts.push({
        type: 'HEALTH_BP_LOW',
        message: `Presion arterial baja: ${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic}`,
        severity: 'MEDIUM'
      });
    }

    if (healthData.spo2 < 94) {
      alerts.push({
        type: 'HEALTH_SPO2_LOW',
        message: `Oxigeno bajo: ${healthData.spo2}%`,
        severity: 'HIGH'
      });
    }

    for (const alert of alerts) {
      await Alert.create({
        device_id: device.id,
        alert_type: alert.type,
        severity: alert.severity,
        message: alert.message,
        alert_time: new Date(),
        status: 'NEW'
      });

      console.log(`[ALERT] [${device.imei}] ${alert.message}`);
    }
  }

  async checkGeofences(device, position) {
    try {
      const geofences = await sequelize.query(
        `SELECT * FROM geofences WHERE organization_id = $1 AND is_active = true`,
        { bind: [device.organization_id], type: QueryTypes.SELECT }
      );

      for (const fence of geofences) {
        const coords = fence.coordinates || {};
        const distance = this.calculateDistance(
          position.latitude,
          position.longitude,
          coords.latitude,
          coords.longitude
        );

        const isInside = distance <= (coords.radius || 500);

        if (isInside && fence.alert_on_enter) {
          await Alert.create({
            device_id: device.id,
            alert_type: 'GEOFENCE_ENTER',
            severity: 'LOW',
            message: `Entrada a geocerca: ${fence.name}`,
            latitude: position.latitude,
            longitude: position.longitude,
            metadata: { geofence_id: fence.id, distance: Math.round(distance) },
            alert_time: new Date(),
            status: 'NEW'
          });

          console.log(`[GEOFENCE] [${device.imei}] Entro a geocerca "${fence.name}" (${Math.round(distance)}m del centro)`);
        }

        if (!isInside && fence.alert_on_exit) {
          const lastPosition = await Position.findOne({
            where: { device_id: device.id },
            order: [['server_time', 'DESC']],
            offset: 1,
            limit: 1
          });

          if (lastPosition) {
            const lastDistance = this.calculateDistance(
              lastPosition.latitude,
              lastPosition.longitude,
              coords.latitude,
              coords.longitude
            );

            if (lastDistance <= coords.radius) {
              await Alert.create({
                device_id: device.id,
                alert_type: 'GEOFENCE_EXIT',
                severity: 'MEDIUM',
                message: `Salida de geocerca: ${fence.name}`,
                latitude: position.latitude,
                longitude: position.longitude,
                metadata: { geofence_id: fence.id, distance: Math.round(distance) },
                alert_time: new Date(),
                status: 'NEW'
              });

              console.log(`[GEOFENCE] [${device.imei}] Salio de geocerca "${fence.name}"`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] Error verificando geocercas:', error);
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async handleHandshake(device, parsed) {
    console.log(`[HANDSHAKE] [${device.imei}] Handshake recibido`);
  }

  async sendCommand(imei, command, params = {}) {
    try {
      const socket = this.getSocketByIMEI(imei);

      if (!socket || socket.destroyed) {
        console.error(`[ERROR] [${imei}] No hay conexion activa para enviar comando`);
        return false;
      }

      const commandMessage = ProtocolParser.generateCommand(imei, command, params);
      const messageWithNewline = commandMessage + '\n';

      console.log(`\n[COMMAND] Enviando comando al dispositivo`);
      console.log(`   IMEI: ${imei}`);
      console.log(`   Comando: ${command}`);
      console.log(`   Parametros: ${JSON.stringify(params)}`);
      
      const buffer = Buffer.from(messageWithNewline);
      console.log(`[SEND] [${imei}] Mensaje: ${JSON.stringify(commandMessage)}`);
      console.log(`[SEND] [${imei}] Bytes: [${Array.from(buffer).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);

      socket.write(buffer);
      console.log(`[SEND-OK] [${imei}] Comando enviado exitosamente`);


      return true;
    } catch (error) {
      console.error(`[ERROR] Error enviando comando a ${imei}:`, error.stack);
      return false;
    }
  }

  async changeServerIP(imei, ip, port) {
    console.log(`[CONFIG] Iniciando cambio de servidor para ${imei}`);
    console.log(`   Destino: ${ip}:${port}`);

    return this.sendCommand(imei, 'IP', { ip, port });
  }

  async calculateDailySteps(deviceId, currentTotalSteps) {
    try {
      const today = new Date().toISOString().split('T')[0];

      let [dailyRecord, created] = await DailySteps.findOrCreate({
        where: {
          device_id: deviceId,
          date: today
        },
        defaults: {
          device_id: deviceId,
          date: today,
          steps: 0,
          steps_total_at_end: currentTotalSteps
        }
      });

      if (created) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const yesterdayRecord = await DailySteps.findOne({
          where: {
            device_id: deviceId,
            date: yesterdayStr
          },
          order: [['date', 'DESC']]
        });

        const startOfDayTotal = yesterdayRecord ? yesterdayRecord.steps_total_at_end : 0;
        const stepsToday = Math.max(0, currentTotalSteps - startOfDayTotal);

        await dailyRecord.update({
          steps: stepsToday,
          steps_total_at_end: currentTotalSteps
        });

        console.log(`[DAILY_STEPS] Nuevo día para dispositivo ${deviceId}: ${stepsToday} pasos (desde ${startOfDayTotal} hasta ${currentTotalSteps})`);
        return stepsToday;
      } else {
        const previousTotal = dailyRecord.steps_total_at_end || 0;
        const increment = Math.max(0, currentTotalSteps - previousTotal);
        const newStepsToday = dailyRecord.steps + increment;

        await dailyRecord.update({
          steps: newStepsToday,
          steps_total_at_end: currentTotalSteps
        });

        return newStepsToday;
      }
    } catch (error) {
      console.error('[ERROR] Calculando pasos diarios:', error);
      return 0;
    }
  }

  async setUploadInterval(imei, interval) {
    if (interval < 60) interval = 60;
    if (interval > 65535) interval = 65535;

    return this.sendCommand(imei, 'UPLOAD', { interval });
  }

  async requestLocation(imei) {
    return this.sendCommand(imei, 'CR', {});
  }

  async rebootDevice(imei) {
    return this.sendCommand(imei, 'RESET', {});
  }

  async findDevice(imei) {
    return this.sendCommand(imei, 'FIND', {});
  }

  startHeartbeatMonitor() {
    if (this.heartbeatMonitor) {
      clearInterval(this.heartbeatMonitor);
    }

    this.heartbeatMonitor = setInterval(async () => {
      await this.checkDeviceHeartbeats();
    }, this.MONITOR_INTERVAL);
  }

  async checkDeviceHeartbeats() {
    try {
      const now = new Date();
      const timeoutDate = new Date(now.getTime() - this.HEARTBEAT_TIMEOUT);

      const staleDevices = await Device.findAll({
        where: {
          is_online: true,
          last_connection: {
            [Op.not]: null,
            [Op.lt]: timeoutDate
          }
        }
      });

      if (staleDevices.length > 0) {
        console.log(`\n[MONITOR] Encontrados ${staleDevices.length} dispositivos sin heartbeat reciente`);

        for (const device of staleDevices) {
          const lastSeen = device.last_connection || device.last_heartbeat;
          const minutesAgo = Math.floor((now - lastSeen) / 60000);

          console.log(`[MONITOR] [${device.imei}] Marcando como offline - Último heartbeat hace ${minutesAgo} min`);

          await device.update({ is_online: false });

          let socketToClose = null;
          for (const [sock, dev] of this.connections.entries()) {
            if (dev && dev.imei === device.imei) {
              socketToClose = sock;
              break;
            }
          }

          if (socketToClose && !socketToClose.destroyed) {
            console.log(`[MONITOR] [${device.imei}] Cerrando socket obsoleto`);
            socketToClose.destroy();
            this.connections.delete(socketToClose);
          }

          if (this.websocketServer && this.websocketServer.broadcastDeviceUpdate) {
            this.websocketServer.broadcastDeviceUpdate({
              type: 'device_status_change',
              imei: device.imei,
              is_online: false,
              timestamp: now.toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('[MONITOR] Error revisando heartbeats:', error);
    }
  }

  stop() {
    if (this.heartbeatMonitor) {
      clearInterval(this.heartbeatMonitor);
      this.heartbeatMonitor = null;
      console.log('[STOP] Monitor de heartbeat detenido');
    }

    if (this.server) {
      this.server.close();
      console.log('[STOP] Servidor TCP detenido');
    }
  }
}

module.exports = TCPServer;
