const { Server } = require('socket.io');

/**
 * Servidor WebSocket para comunicación en tiempo real con el frontend
 */
class WebSocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  /**
   * Configura los manejadores de eventos de Socket.io
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Enviar estado inicial al conectarse
      this.sendInitialState(socket);

      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log(`🔌 Cliente WebSocket desconectado: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Manejar solicitudes del cliente
      socket.on('request:devices', () => {
        this.emitDevicesUpdate();
      });

      socket.on('request:alerts', () => {
        this.emitAlertsUpdate();
      });

      socket.on('request:stats', () => {
        this.emitStatsUpdate();
      });
    });
  }

  /**
   * Envía estado inicial al cliente que se conecta
   */
  async sendInitialState(socket) {
    try {
      const { Device, Alert } = require('./models');
      
      // Enviar dispositivos actuales
      const devices = await Device.findAll({ limit: 100 });
      socket.emit('devices:update', devices);

      // Enviar alertas activas
      const alerts = await Alert.findAll({
        where: { resolved: false },
        limit: 50,
        order: [['alert_time', 'DESC']]
      });
      socket.emit('alerts:update', alerts);

      console.log(`📤 Estado inicial enviado a ${socket.id}`);
    } catch (error) {
      console.error('Error enviando estado inicial:', error);
    }
  }

  /**
   * Emite actualización cuando un dispositivo se conecta/desconecta
   */
  emitDeviceConnection(device, isOnline) {
    this.io.emit('device:connection', {
      imei: device.imei,
      name: device.name,
      isOnline,
      timestamp: new Date()
    });

    console.log(`📡 [WebSocket] Dispositivo ${device.imei} ${isOnline ? 'conectado' : 'desconectado'}`);
  }

  /**
   * Emite nueva posición GPS recibida
   */
  emitNewPosition(device, position) {
    this.io.emit('position:new', {
      device: {
        id: device.id,
        imei: device.imei,
        name: device.name
      },
      position: {
        id: position.id,
        latitude: position.latitude,
        longitude: position.longitude,
        gpsValid: position.gps_valid,
        speed: position.speed,
        altitude: position.altitude,
        satellites: position.satellites,
        deviceTime: position.device_time,
        batteryLevel: position.battery_level
      },
      timestamp: new Date()
    });

    console.log(`📍 [WebSocket] Nueva posición de ${device.imei}`);
  }

  /**
   * Emite nueva alerta
   */
  emitNewAlert(device, alert) {
    const alertData = {
      id: alert.id,
      device: {
        id: device.id,
        imei: device.imei,
        name: device.name,
        phoneNumber: device.phone_number
      },
      alertType: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      latitude: alert.latitude,
      longitude: alert.longitude,
      alertTime: alert.alert_time,
      batteryLevel: alert.battery_level,
      timestamp: new Date()
    };

    this.io.emit('alert:new', alertData);

    // Si es crítica, enviar evento especial
    if (alert.severity === 'CRITICAL') {
      this.io.emit('alert:critical', alertData);
      console.log(`🚨 [WebSocket] ALERTA CRÍTICA: ${alert.alert_type} - ${device.imei}`);
    } else {
      console.log(`⚠️  [WebSocket] Nueva alerta: ${alert.alert_type} - ${device.imei}`);
    }
  }

  /**
   * Emite nuevos datos de salud
   */
  emitNewHealthData(device, healthData) {
    this.io.emit('health:new', {
      device: {
        id: device.id,
        imei: device.imei,
        name: device.name
      },
      health: {
        id: healthData.id,
        systolicPressure: healthData.systolic_pressure,
        diastolicPressure: healthData.diastolic_pressure,
        heartRate: healthData.heart_rate,
        spo2: healthData.spo2,
        measurementTime: healthData.measurement_time
      },
      timestamp: new Date()
    });

    console.log(`❤️  [WebSocket] Nuevos datos de salud de ${device.imei}`);
  }

  /**
   * Emite actualización de heartbeat (Link Keep)
   */
  emitHeartbeat(device) {
    this.io.emit('device:heartbeat', {
      imei: device.imei,
      name: device.name,
      batteryLevel: device.battery_level,
      stepsTotal: device.steps_total,
      lastHeartbeat: device.last_heartbeat,
      timestamp: new Date()
    });
  }

  /**
   * Emite actualización de estadísticas del dashboard
   */
  async emitStatsUpdate() {
    try {
      const { Device, Alert } = require('./models');
      const { Op } = require('sequelize');

      const totalDevices = await Device.count();
      const onlineDevices = await Device.count({ where: { is_online: true } });
      const activeAlerts = await Alert.count({
        where: {
          resolved: false,
          severity: { [Op.in]: ['HIGH', 'CRITICAL'] }
        }
      });

      const stats = {
        totalDevices,
        onlineDevices,
        offlineDevices: totalDevices - onlineDevices,
        activeAlerts,
        timestamp: new Date()
      };

      this.io.emit('stats:update', stats);
      console.log(`📊 [WebSocket] Estadísticas actualizadas`);
    } catch (error) {
      console.error('Error emitiendo estadísticas:', error);
    }
  }

  /**
   * Emite actualización de lista de dispositivos
   */
  async emitDevicesUpdate() {
    try {
      const { Device } = require('./models');
      const devices = await Device.findAll({
        limit: 100,
        order: [['updated_at', 'DESC']]
      });

      this.io.emit('devices:update', devices);
      console.log(`📱 [WebSocket] Lista de dispositivos actualizada`);
    } catch (error) {
      console.error('Error emitiendo dispositivos:', error);
    }
  }

  /**
   * Emite actualización de lista de alertas
   */
  async emitAlertsUpdate() {
    try {
      const { Alert, Device } = require('./models');
      const alerts = await Alert.findAll({
        include: [{
          model: Device,
          as: 'device',
          attributes: ['imei', 'name', 'phone_number']
        }],
        limit: 100,
        order: [['alert_time', 'DESC']]
      });

      this.io.emit('alerts:update', alerts);
      console.log(`🔔 [WebSocket] Lista de alertas actualizada`);
    } catch (error) {
      console.error('Error emitiendo alertas:', error);
    }
  }

  /**
   * Emite notificación general
   */
  emitNotification(type, message, data = {}) {
    this.io.emit('notification', {
      type, // 'info', 'success', 'warning', 'error'
      message,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Obtiene número de clientes conectados
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Cierra el servidor WebSocket
   */
  close() {
    this.io.close();
    console.log('🛑 Servidor WebSocket cerrado');
  }
}

module.exports = WebSocketServer;
