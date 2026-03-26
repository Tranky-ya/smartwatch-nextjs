/**
 * MOTOR HÍBRIDO SIMPLIFICADO - SIEMPRE ACEPTA UBICACIONES
 * Versión de emergencia que bypasea todas las validaciones
 */
const geolib = require('geolib');

class HybridLocationEngine {
  constructor(config = {}) {
    this.config = config;
    this.state = new Map();
    this.stats = {
      totalProcessed: 0,
      accepted: 0,
      bySource: { GPS_FORCED: 0 }
    };
  }

  async processLocation(rawData) {
    this.stats.totalProcessed++;
    this.stats.accepted++;
    
    const { imei } = rawData;

    // SIEMPRE crear ubicación válida - SIN EXCEPCIONES
    const location = {
      latitude: rawData.latitude,
      longitude: rawData.longitude,
      accuracy: rawData.satellites ? Math.max(5, 50 - rawData.satellites * 5) : 50,
      source: 'GPS_FORCED',
      timestamp: Date.now(),
      raw: {
        latitude: rawData.latitude,
        longitude: rawData.longitude,
        gpsStatus: rawData.gpsStatus,
        satellites: rawData.satellites
      },
      processing: {
        gpsQuality: 'ALWAYS_ACCEPT',
        smoothed: false,
        mapMatched: false,
        stationary: false,
        forced: true
      }
    };

    // Guardar estado
    if (!this.state.has(imei)) {
      this.state.set(imei, { lastGoodPoint: null, history: [] });
    }
    
    const deviceState = this.state.get(imei);
    deviceState.lastGoodPoint = location;
    deviceState.history.push(location);
    if (deviceState.history.length > 10) {
      deviceState.history.shift();
    }

    this.stats.bySource.GPS_FORCED++;

    // Log de éxito
    this.log('info', `✅ [${imei}] UBICACIÓN FORZADA ACEPTADA: Lat:${location.latitude.toFixed(6)}, Lng:${location.longitude.toFixed(6)}, Sats:${rawData.satellites || 0}`);
    
    return location;
  }

  log(level, message) {
    console.log(`[${new Date().toISOString()}] [HYBRID-ENGINE] [${level.toUpperCase()}] ${message}`);
  }

  getStats() {
    return {
      ...this.stats,
      acceptanceRate: '100%',
      activeDevices: this.state.size
    };
  }
}

module.exports = HybridLocationEngine;
