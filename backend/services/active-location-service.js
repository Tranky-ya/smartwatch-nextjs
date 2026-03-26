/**
 * Active Location Service - Comportamiento tipo Beesure GPS
 * 
 * Este servicio implementa la solicitud ACTIVA de ubicación GPS
 * mediante comandos TCP, similar a como funciona la app Beesure.
 */

const { Device, Position } = require('../server/models');
const { Op } = require('sequelize');

class ActiveLocationService {
  constructor(tcpServer) {
    this.tcpServer = tcpServer;
    
    // Verificar que Position tiene los campos necesarios
    this.validateModels();
    
    // Cooldown para evitar spam de comandos
    this.commandCooldowns = new Map(); // imei -> timestamp del último comando
    this.MIN_COOLDOWN_MS = 30 * 1000; // 30 segundos mínimo entre comandos
    
    // Tracking de comandos enviados
    this.pendingCommands = new Map(); // imei -> { command, timestamp, retries }
    this.MAX_RETRIES = 2;
    
    // Configuración de reglas de solicitud automática
    this.config = {
      // Forzar GPS cuando la última ubicación es muy antigua
      MAX_POSITION_AGE_MS: 2 * 60 * 1000, // 2 minutos
      
      // Forzar GPS cuando el tipo de ubicación no es óptimo
      FORCE_GPS_ON_TD: true, // TD = Torre Celular (baja precisión)
      FORCE_GPS_ON_WIFI: false, // WiFi generalmente es aceptable
      
      // Auto-solicitud periódica para dispositivos sin GPS reciente
      AUTO_REQUEST_INTERVAL_MS: 5 * 60 * 1000, // Cada 5 minutos
      
      // Intentar con DW si CR falla
      FALLBACK_TO_DW: true,
      
      // Comandos en orden de prioridad
      COMMAND_PRIORITY: ['CR', 'DW', 'UPLOAD']
    };
    
    // Iniciar monitor de ubicaciones obsoletas
    this.startAutoLocationMonitor();
    
    console.log('[ACTIVE-LOCATION] Servicio de localización activa iniciado');
    console.log(`   - Cooldown mínimo: ${this.MIN_COOLDOWN_MS/1000}s`);
    console.log(`   - Edad máxima de posición: ${this.config.MAX_POSITION_AGE_MS/1000}s`);
    console.log(`   - Forzar GPS en TD: ${this.config.FORCE_GPS_ON_TD}`);
  }

  /**
   * Validar que los modelos tienen los campos necesarios
   */
  validateModels() {
    try {
      if (!Position || !Position.rawAttributes) {
        console.error('[ACTIVE-LOCATION] ⚠️ Modelo Position no disponible');
        return;
      }
      
      const hasLocationTypeField = 'location_type' in Position.rawAttributes;
      const hasAccuracyField = 'accuracy' in Position.rawAttributes;
      
      if (!hasLocationTypeField || !hasAccuracyField) {
        console.warn('[ACTIVE-LOCATION] ⚠️ Campos location_type o accuracy no encontrados en Position');
        console.warn('[ACTIVE-LOCATION] ⚠️ Es posible que necesites sincronizar la BD');
      } else {
        console.log('[ACTIVE-LOCATION] ✅ Modelo Position validado correctamente');
      }
    } catch (error) {
      console.error('[ACTIVE-LOCATION] Error validando modelos:', error.message);
    }
  }

  /**
   * Solicitar ubicación GPS activamente (API pública)
   * @param {string} imei - IMEI del dispositivo
   * @param {string} reason - Razón de la solicitud (manual, auto, sos, etc.)
   * @param {boolean} force - Ignorar cooldown
   */
  async requestLocation(imei, reason = 'manual', force = false) {
    try {
      console.log(`\n[ACTIVE-LOCATION] Solicitud de ubicación para ${imei}`);
      console.log(`   Razón: ${reason}`);
      console.log(`   Forzar: ${force}`);

      // Verificar cooldown
      if (!force && !this.canSendCommand(imei)) {
        const lastCommand = this.commandCooldowns.get(imei);
        const secondsAgo = Math.floor((Date.now() - lastCommand) / 1000);
        const waitSeconds = Math.ceil((this.MIN_COOLDOWN_MS - (Date.now() - lastCommand)) / 1000);
        
        console.log(`[ACTIVE-LOCATION] [${imei}] ⏰ En cooldown (último comando hace ${secondsAgo}s, esperar ${waitSeconds}s más)`);
        return {
          success: false,
          reason: 'cooldown',
          message: `Espera ${waitSeconds}s antes de solicitar ubicación nuevamente`,
          waitSeconds
        };
      }

      // Verificar que el dispositivo esté conectado
      const device = await Device.findOne({ where: { imei } });
      if (!device) {
        console.log(`[ACTIVE-LOCATION] [${imei}] Dispositivo no encontrado en BD`);
        return {
          success: false,
          reason: 'not_found',
          message: 'Dispositivo no encontrado'
        };
      }

      if (!device.is_online) {
        console.log(`[ACTIVE-LOCATION] [${imei}] Dispositivo OFFLINE`);
        return {
          success: false,
          reason: 'offline',
          message: 'Dispositivo no está conectado'
        };
      }

      // Intentar comandos en orden de prioridad
      for (const command of this.config.COMMAND_PRIORITY) {
        console.log(`[ACTIVE-LOCATION] [${imei}] Intentando comando: ${command}`);
        
        const result = await this.sendLocationCommand(imei, command, reason);
        
        if (result) {
          // Registrar comando enviado
          this.recordCommandSent(imei, command);
          
          console.log(`[ACTIVE-LOCATION] [${imei}] ✅ Comando ${command} enviado exitosamente`);
          
          // Guardar comando pendiente para verificar respuesta
          this.pendingCommands.set(imei, {
            command,
            timestamp: Date.now(),
            retries: 0,
            reason
          });
          
          return {
            success: true,
            command,
            reason,
            message: `Solicitud de ubicación enviada (${command})`,
            timestamp: new Date().toISOString()
          };
        }
        
        console.log(`[ACTIVE-LOCATION] [${imei}] ❌ Comando ${command} falló, intentando siguiente...`);
        
        // Si CR falla y está habilitado fallback, continuar con DW
        if (command === 'CR' && !this.config.FALLBACK_TO_DW) {
          break;
        }
        
        // Esperar un poco entre intentos
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[ACTIVE-LOCATION] [${imei}] ❌ Todos los comandos fallaron`);
      return {
        success: false,
        reason: 'command_failed',
        message: 'No se pudo enviar comando al dispositivo'
      };

    } catch (error) {
      console.error(`[ACTIVE-LOCATION] Error solicitando ubicación para ${imei}:`, error);
      return {
        success: false,
        reason: 'error',
        message: error.message
      };
    }
  }

  /**
   * Enviar comando TCP de ubicación al dispositivo
   */
  async sendLocationCommand(imei, command, reason) {
    try {
      const params = {};
      
      // CR y DW no necesitan parámetros adicionales
      // UPLOAD podría necesitar intervalo
      if (command === 'UPLOAD') {
        params.interval = 3600; // Subir cada 60 segundos
      }

      const result = await this.tcpServer.sendCommand(imei, command, params);
      
      if (result) {
        console.log(`[ACTIVE-LOCATION] [${imei}] Comando TCP ${command} enviado por razón: ${reason}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[ACTIVE-LOCATION] Error enviando comando ${command} a ${imei}:`, error);
      return false;
    }
  }

  /**
   * Verificar si se puede enviar comando (cooldown)
   */
  canSendCommand(imei) {
    const lastCommand = this.commandCooldowns.get(imei);
    if (!lastCommand) return true;
    
    const elapsed = Date.now() - lastCommand;
    return elapsed >= this.MIN_COOLDOWN_MS;
  }

  /**
   * Registrar comando enviado (para cooldown)
   */
  recordCommandSent(imei, command) {
    this.commandCooldowns.set(imei, Date.now());
    
    // Limpiar cooldowns antiguos (más de 10 minutos)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [key, timestamp] of this.commandCooldowns.entries()) {
      if (timestamp < tenMinutesAgo) {
        this.commandCooldowns.delete(key);
      }
    }
  }

  /**
   * Verificar si una posición necesita actualización
   */
  async shouldRequestLocation(device) {
    try {
      // Obtener última posición del dispositivo
      const lastPosition = await Position.findOne({
        where: { device_id: device.id },
        order: [['device_time', 'DESC']]
      });

      if (!lastPosition) {
        console.log(`[ACTIVE-LOCATION] [${device.imei}] Sin posición previa - SOLICITAR GPS`);
        return { should: true, reason: 'no_position' };
      }

      // Verificar antigüedad de la posición
      const positionAge = Date.now() - new Date(lastPosition.device_time).getTime();
      if (positionAge > this.config.MAX_POSITION_AGE_MS) {
        const minutesOld = Math.floor(positionAge / 60000);
        console.log(`[ACTIVE-LOCATION] [${device.imei}] Posición muy antigua (${minutesOld} min) - SOLICITAR GPS`);
        return { should: true, reason: 'old_position', age_minutes: minutesOld };
      }

      // Verificar tipo de ubicación (TD = Torre, baja precisión)
      if (this.config.FORCE_GPS_ON_TD && lastPosition.location_type === 'TD') {
        console.log(`[ACTIVE-LOCATION] [${device.imei}] Ubicación tipo TD (torre) - SOLICITAR GPS real`);
        return { should: true, reason: 'low_precision_td' };
      }

      // Ubicación es reciente y precisa
      return { should: false, reason: 'position_ok' };

    } catch (error) {
      console.error(`[ACTIVE-LOCATION] Error verificando posición de ${device.imei}:`);
      console.error(`   Mensaje: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      return { should: false, reason: 'error' };
    }
  }

  /**
   * Marcar que se recibió respuesta a un comando
   */
  markCommandReceived(imei, messageType) {
    const pending = this.pendingCommands.get(imei);
    if (pending) {
      const responseTime = Date.now() - pending.timestamp;
      console.log(`[ACTIVE-LOCATION] [${imei}] ✅ Respuesta recibida (${messageType}) después de ${Math.floor(responseTime/1000)}s`);
      this.pendingCommands.delete(imei);
    }
  }

  /**
   * Verificar comandos pendientes y hacer retry si no hay respuesta
   */
  async checkPendingCommands() {
    const now = Date.now();
    const RESPONSE_TIMEOUT = 60 * 1000; // 60 segundos sin respuesta

    for (const [imei, pending] of this.pendingCommands.entries()) {
      const elapsed = now - pending.timestamp;
      
      if (elapsed > RESPONSE_TIMEOUT) {
        console.log(`[ACTIVE-LOCATION] [${imei}] ⚠️ Sin respuesta a ${pending.command} después de ${Math.floor(elapsed/1000)}s`);
        
        // Si fue CR y no respondió, intentar con DW
        if (pending.command === 'CR' && pending.retries < this.MAX_RETRIES) {
          console.log(`[ACTIVE-LOCATION] [${imei}] Reintentando con comando DW...`);
          
          const result = await this.sendLocationCommand(imei, 'DW', `${pending.reason}_retry`);
          
          if (result) {
            pending.command = 'DW';
            pending.timestamp = now;
            pending.retries++;
          } else {
            this.pendingCommands.delete(imei);
          }
        } else {
          // Ya se intentó todo, limpiar
          console.log(`[ACTIVE-LOCATION] [${imei}] Comando abandonado después de ${pending.retries} reintentos`);
          this.pendingCommands.delete(imei);
        }
      }
    }
  }


  /**
   * Monitor automático de ubicaciones obsoletas
   * Similar a cómo Beesure solicita GPS periódicamente
   */
  startAutoLocationMonitor() {
    // Ejecutar cada 2 minutos
    setInterval(async () => {
      await this.checkAndRequestObsoleteLocations();
    }, 2 * 60 * 1000);
    
    // Verificar comandos pendientes cada 30 segundos
    setInterval(async () => {
      await this.checkPendingCommands();
    }, 30 * 1000);
    
    console.log('[ACTIVE-LOCATION] Monitor automático de ubicaciones iniciado (cada 2 min)');
    console.log('[ACTIVE-LOCATION] Monitor de comandos pendientes iniciado (cada 30s)');
  }

  /**
   * Revisar dispositivos y solicitar GPS si es necesario
   */
  async checkAndRequestObsoleteLocations() {
    try {
      // Buscar dispositivos online
      const onlineDevices = await Device.findAll({
        where: { is_online: true }
      });

      if (onlineDevices.length === 0) return;

      console.log(`\n[ACTIVE-LOCATION] Revisando ${onlineDevices.length} dispositivos online...`);

      for (const device of onlineDevices) {
        // Verificar si necesita actualización
        const check = await this.shouldRequestLocation(device);
        
        if (check.should) {
          console.log(`[ACTIVE-LOCATION] [${device.imei}] Necesita actualización: ${check.reason}`);
          
          // Solicitar ubicación automáticamente
          await this.requestLocation(device.imei, `auto_${check.reason}`, false);
          
          // Esperar un poco entre comandos para no saturar
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

    } catch (error) {
      console.error('[ACTIVE-LOCATION] Error en monitor automático:', error);
    }
  }

  /**
   * Manejar eventos SOS - prioridad máxima
   */
  async handleSOSEvent(imei) {
    console.log(`\n[ACTIVE-LOCATION] [${imei}] ⚠️ EVENTO SOS - Solicitando ubicación inmediata`);
    
    // Ignorar cooldown en caso de emergencia
    return await this.requestLocation(imei, 'sos', true);
  }

  /**
   * Manejar entrada/salida de geocerca
   */
  async handleGeofenceEvent(imei, eventType) {
    console.log(`\n[ACTIVE-LOCATION] [${imei}] Evento de geocerca: ${eventType}`);
    
    // Solicitar ubicación actualizada
    return await this.requestLocation(imei, `geofence_${eventType}`, false);
  }

  /**
   * Obtener estadísticas del servicio
   */
  getStats() {
    return {
      active_cooldowns: this.commandCooldowns.size,
      pending_commands: this.pendingCommands.size,
      config: this.config
    };
  }
}

module.exports = ActiveLocationService;
