// Servicio GPS mejorado con scoring, warm-up y forzado automático
const { scoreLocation, getLocationQuality } = require('./locationScoring');
const gpsForcer = require('./gpsForcer');

class GPSEnhancedService {
  constructor() {
    // Buffer de warm-up: almacena últimas 3 lecturas por dispositivo
    this.warmupBuffers = new Map(); // IMEI -> [{location, score, timestamp}]
    
    // Estado de ubicación por dispositivo
    this.deviceStates = new Map(); // IMEI -> {state, lastScore, lastValidLocation}
    
    // Configuración
    this.WARMUP_MIN_READINGS = 2; // Mínimo de lecturas antes de aceptar
    this.WARMUP_WINDOW_MS = 60000; // Ventana de 60 segundos
    this.MIN_ACCEPTABLE_SCORE = 60; // Score mínimo para aceptar ubicación
    this.EXCELLENT_SCORE = 80; // Score para ubicación excelente
  }

  /**
   * Procesa una nueva ubicación con scoring y warm-up
   */
  async processLocation(device, parsed, tcpServer) {
    const imei = device.imei;
    const now = Date.now();

    // 1. Calcular score de la ubicación actual
    const previousDevice = await this.getPreviousLocation(device);
    const score = scoreLocation(parsed, previousDevice);
    const quality = getLocationQuality(score);

    console.log(`[GPS-ENHANCED] ${imei} - Score: ${score}/100 (${quality})`);

    // 2. Agregar al buffer de warm-up
    if (!this.warmupBuffers.has(imei)) {
      this.warmupBuffers.set(imei, []);
    }
    
    const buffer = this.warmupBuffers.get(imei);
    buffer.push({
      location: parsed,
      score: score,
      timestamp: now
    });

    // Mantener solo las últimas 3 lecturas y dentro de la ventana temporal
    this.warmupBuffers.set(imei, 
      buffer
        .filter(item => (now - item.timestamp) < this.WARMUP_WINDOW_MS)
        .slice(-3)
    );

    // 3. Obtener estado actual del dispositivo
    let deviceState = this.deviceStates.get(imei) || {
      state: 'idle',
      lastScore: 0,
      lastValidLocation: null,
      forcingAttempts: 0
    };

    // 4. Determinar nuevo estado basado en score y buffer
    const newState = this.determineState(imei, score, buffer.length);
    
    // 5. Decidir si forzar GPS
    if (this.shouldForceGPS(deviceState, score, newState)) {
      console.log(`[GPS-ENHANCED] ${imei} - Forzando GPS (score bajo: ${score})`);
      deviceState.state = 'forcing';
      deviceState.forcingAttempts++;
      
      // Forzar GPS en background
      gpsForcer.forceGPS(tcpServer, imei).catch(err => {
        console.error(`[GPS-ENHANCED] ${imei} - Error forzando GPS:`, err.message);
      });
    } else {
      deviceState.state = newState;
    }

    // 6. Determinar si la ubicación es aceptable
    const isAcceptable = this.isLocationAcceptable(imei, score);
    
    if (isAcceptable) {
      deviceState.lastScore = score;
      deviceState.lastValidLocation = parsed;
      deviceState.forcingAttempts = 0; // Reset intentos
      console.log(`[GPS-ENHANCED] ${imei} - ✅ Ubicación ACEPTADA (score: ${score})`);
    } else {
      console.log(`[GPS-ENHANCED] ${imei} - ⏳ Ubicación en validación (score: ${score})`);
    }

    // 7. Guardar estado actualizado
    this.deviceStates.set(imei, deviceState);

    // 8. Retornar resultado
    return {
      accepted: isAcceptable,
      score: score,
      quality: quality,
      state: deviceState.state,
      shouldSave: isAcceptable, // Solo guardar si es aceptable
      metadata: {
        warmup_readings: buffer.length,
        forcing_attempts: deviceState.forcingAttempts
      }
    };
  }

  /**
   * Determina el estado del GPS basado en score y lecturas
   */
  determineState(imei, score, bufferSize) {
    if (score >= this.EXCELLENT_SCORE && bufferSize >= this.WARMUP_MIN_READINGS) {
      return 'stable';
    }
    
    if (score >= this.MIN_ACCEPTABLE_SCORE && bufferSize >= this.WARMUP_MIN_READINGS) {
      return 'good';
    }
    
    if (bufferSize < this.WARMUP_MIN_READINGS) {
      return 'warming_up';
    }
    
    if (score < this.MIN_ACCEPTABLE_SCORE) {
      return 'validating';
    }
    
    return 'validating';
  }

  /**
   * Decide si se debe forzar el GPS
   */
  shouldForceGPS(deviceState, currentScore, newState) {
    // No forzar si ya está forzando
    if (deviceState.state === 'forcing') {
      return false;
    }

    // No forzar si ya intentó muchas veces seguidas
    if (deviceState.forcingAttempts >= 3) {
      return false;
    }

    // Forzar si el score es muy bajo
    if (currentScore < 40) {
      return true;
    }

    // Forzar si el score cayó significativamente
    if (deviceState.lastScore > 70 && currentScore < 50) {
      return true;
    }

    // Forzar si está en validación por mucho tiempo
    if (newState === 'validating' && deviceState.state === 'validating') {
      return true;
    }

    return false;
  }

  /**
   * Determina si la ubicación es lo suficientemente buena para aceptar
   */
  isLocationAcceptable(imei, score) {
    const buffer = this.warmupBuffers.get(imei) || [];
    
    // Necesita al menos 2 lecturas
    if (buffer.length < this.WARMUP_MIN_READINGS) {
      return false;
    }

    // El score actual debe ser aceptable
    if (score < this.MIN_ACCEPTABLE_SCORE) {
      return false;
    }

    // Verificar consistencia: al menos 2 de las últimas 3 lecturas deben ser buenas
    const goodReadings = buffer.filter(item => item.score >= this.MIN_ACCEPTABLE_SCORE).length;
    
    return goodReadings >= this.WARMUP_MIN_READINGS;
  }

  /**
   * Obtiene la ubicación anterior del dispositivo
   */
  async getPreviousLocation(device) {
    return {
      last_latitude: device.last_latitude,
      last_longitude: device.last_longitude,
      last_update_time: device.updatedAt
    };
  }

  /**
   * Obtiene el estado actual de un dispositivo
   */
  getDeviceState(imei) {
    return this.deviceStates.get(imei) || {
      state: 'idle',
      lastScore: 0,
      lastValidLocation: null,
      forcingAttempts: 0
    };
  }

  /**
   * Limpia buffers antiguos (llamar periódicamente)
   */
  cleanupOldBuffers() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutos

    for (const [imei, buffer] of this.warmupBuffers.entries()) {
      const filtered = buffer.filter(item => (now - item.timestamp) < maxAge);
      if (filtered.length === 0) {
        this.warmupBuffers.delete(imei);
      } else {
        this.warmupBuffers.set(imei, filtered);
      }
    }
  }
}

module.exports = new GPSEnhancedService();
