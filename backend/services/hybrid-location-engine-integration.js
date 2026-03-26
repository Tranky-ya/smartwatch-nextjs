/**
 * HYBRID LOCATION ENGINE - BeeSure++ Style
 * 
 * Motor de localización híbrido que MEJORA el sistema actual sin romperlo.
 * Se integra con LocationPrioritizationService existente y añade:
 * 
 * 1. Google Geolocation API (WiFi/LBS positioning real)
 * 2. Filtros BeeSure (outliers, velocidad, quietud)
 * 3. Suavizado Kalman-lite
 * 4. Map matching con OSM (opcional)
 * 
 * COMPATIBILIDAD: Funciona con tu sistema actual sin cambios en BD o frontend
 */

const axios = require('axios');

class HybridLocationEngine {
  constructor(config = {}) {
    this.config = {
      // APIs externas (opcionales)
      googleApiKey: config.googleApiKey || process.env.GOOGLE_GEOLOCATION_API_KEY || null,
      useOpenCellID: config.useOpenCellID !== false,
      
      // Parámetros BeeSure-style (adultos mayores por defecto)
      maxJumpMeters: config.maxJumpMeters || 40,
      maxSpeedKmh: config.maxSpeedKmh || 15,
      maxAccuracyMeters: config.maxAccuracyMeters || 50,
      stationaryThresholdMeters: config.stationaryThresholdMeters || 5,
      stationaryTimeSeconds: config.stationaryTimeSeconds || 30,
      
      // Suavizado Kalman-lite
      smoothingAlpha: config.smoothingAlpha || 0.25, // 0.2-0.3 para adultos mayores
      
      // Map matching (deshabilitado por defecto - requiere setup adicional)
      mapMatchingEnabled: config.mapMatchingEnabled || false,
      mapMatchingRadius: config.mapMatchingRadius || 20,
      
      // Logging
      logLevel: config.logLevel || 'info'
    };
    
    // Estado por dispositivo (IMEI -> state)
    this.deviceStates = new Map();
    
    // Estadísticas
    this.stats = {
      totalProcessed: 0,
      enhanced: { wifi: 0, lbs: 0 },
      filtered: { outliers: 0, stationary: 0, smoothed: 0 },
      apiCalls: { google: 0, openCellID: 0, errors: 0 }
    };
    
    this.log('info', '🚀 Hybrid Location Engine inicializado');
    this.log('info', `   ├─ Google API: ${this.config.googleApiKey ? 'ENABLED ✓' : 'DISABLED'}`);
    this.log('info', `   ├─ OpenCellID: ${this.config.useOpenCellID ? 'ENABLED ✓' : 'DISABLED'}`);
    this.log('info', `   ├─ Smoothing Alpha: ${this.config.smoothingAlpha}`);
    this.log('info', `   └─ Max Jump: ${this.config.maxJumpMeters}m, Max Speed: ${this.config.maxSpeedKmh}km/h`);
  }

  /**
   * Método principal - Mejora una ubicación que ya fue priorizada
   * 
   * @param {Object} locationResult - Resultado de LocationPrioritizationService.getBestLocation()
   * @param {Object} parsed - Datos parseados completos del mensaje UD
   * @param {string} imei - IMEI del dispositivo
   * @returns {Promise<Object>} Ubicación mejorada con metadata adicional
   */
  async enhance(locationResult, parsed, imei) {
    this.stats.totalProcessed++;
    
    try {
      // Obtener o inicializar estado del dispositivo
      if (!this.deviceStates.has(imei)) {
        this.deviceStates.set(imei, {
          lastGoodLocation: null,
          lastSmoothed: null,
          stationaryStart: null,
          history: []
        });
      }
      
      const state = this.deviceStates.get(imei);
      
      let enhancedLocation = { ...locationResult };
      
      // ═══════════════════════════════════════════════════════
      // PASO 1: MEJORAR WIFI/LBS CON GOOGLE API (si disponible)
      // ═══════════════════════════════════════════════════════
      
      if (locationResult.source === 'WiFi' || locationResult.source === 'LBS') {
        const apiLocation = await this._enhanceWithAPI(parsed, locationResult.source);
        
        if (apiLocation) {
          enhancedLocation = {
            ...enhancedLocation,
            location: apiLocation.location,
            accuracy: apiLocation.accuracy,
            source: apiLocation.source,
            enhanced: true,
            apiUsed: apiLocation.apiUsed
          };
          
          this.log('info', `[${imei}] ✨ Mejorado con ${apiLocation.apiUsed}: ${apiLocation.accuracy}m accuracy`);
        }
      }
      
      // ═══════════════════════════════════════════════════════
      // PASO 2: FILTRO DE OUTLIERS (BeeSure-style)
      // ═══════════════════════════════════════════════════════
      
      if (state.lastGoodLocation) {
        const outlierCheck = this._detectOutlier(state.lastGoodLocation, enhancedLocation, parsed);
        
        if (outlierCheck.isOutlier) {
          this.stats.filtered.outliers++;
          this.log('warn', `[${imei}] ⚠️ Outlier detectado: ${outlierCheck.reason} - usando ubicación anterior`);
          
          return {
            ...state.lastSmoothed,
            outlierRejected: true,
            outlierReason: outlierCheck.reason
          };
        }
      }
      
      // ═══════════════════════════════════════════════════════
      // PASO 3: DETECCIÓN DE QUIETUD
      // ═══════════════════════════════════════════════════════
      
      const isStationary = this._detectStationary(state, enhancedLocation);
      
      if (isStationary) {
        this.stats.filtered.stationary++;
        this.log('debug', `[${imei}] 🛑 Dispositivo quieto - congelando posición`);
        
        return {
          ...state.lastSmoothed,
          stationary: true,
          stationaryDuration: Math.floor((Date.now() - state.stationaryStart) / 1000)
        };
      } else {
        state.stationaryStart = null;
      }
      
      // ═══════════════════════════════════════════════════════
      // PASO 4: SUAVIZADO KALMAN-LITE
      // ═══════════════════════════════════════════════════════
      
      let finalLocation = enhancedLocation;
      
      if (state.lastSmoothed && enhancedLocation.source === 'GPS') {
        finalLocation = this._smoothLocation(state.lastSmoothed, enhancedLocation);
        this.stats.filtered.smoothed++;
        finalLocation.smoothed = true;
      }
      
      // ═══════════════════════════════════════════════════════
      // ACTUALIZAR ESTADO
      // ═══════════════════════════════════════════════════════
      
      state.lastGoodLocation = enhancedLocation;
      state.lastSmoothed = finalLocation;
      state.history.push({
        location: finalLocation.location,
        timestamp: new Date(),
        source: finalLocation.source
      });
      
      if (state.history.length > 10) {
        state.history.shift();
      }
      
      return finalLocation;
      
    } catch (error) {
      this.log('error', `[${imei}] Error en enhance: ${error.message}`);
      return locationResult; // Retornar original si hay error
    }
  }

  /**
   * Mejorar WiFi/LBS con APIs externas
   * @private
   */
  async _enhanceWithAPI(parsed, currentSource) {
    try {
      // Prioridad: Google API > OpenCellID
      
      if (this.config.googleApiKey) {
        return await this._googleGeolocate(parsed, currentSource);
      }
      
      if (this.config.useOpenCellID && currentSource === 'LBS') {
        return await this._openCellIDGeolocate(parsed);
      }
      
      return null;
      
    } catch (error) {
      this.stats.apiCalls.errors++;
      this.log('warn', `API enhancement failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Google Geolocation API
   * @private
   */
  async _googleGeolocate(parsed, sourceType) {
    try {
      const payload = { considerIp: false };
      
      // Agregar WiFi si disponible y es fuente WiFi
      if (sourceType === 'WiFi' && parsed.wifi_raw) {
        const wifiAPs = this._parseWiFiData(parsed.wifi_raw);
        if (wifiAPs.length >= 2) {
          payload.wifiAccessPoints = wifiAPs.map(ap => ({
            macAddress: ap.mac,
            signalStrength: ap.rssi || -90
          }));
        }
      }
      
      // Agregar Cell Tower si disponible
      if (parsed.mcc && parsed.mnc && parsed.lac && parsed.cell_id) {
        payload.cellTowers = [{
          cellId: parseInt(parsed.cell_id),
          locationAreaCode: parseInt(parsed.lac),
          mobileCountryCode: parseInt(parsed.mcc),
          mobileNetworkCode: parseInt(parsed.mnc)
        }];
      }
      
      const response = await axios.post(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.config.googleApiKey}`,
        payload,
        { timeout: 5000 }
      );
      
      if (response.data?.location) {
        this.stats.apiCalls.google++;
        
        const enhancedSource = payload.wifiAccessPoints ? 'WiFi' : 'LBS';
        this.stats.enhanced[enhancedSource.toLowerCase()]++;
        
        return {
          location: {
            latitude: response.data.location.lat,
            longitude: response.data.location.lng
          },
          accuracy: response.data.accuracy,
          source: enhancedSource,
          apiUsed: 'Google'
        };
      }
      
      return null;
      
    } catch (error) {
      this.stats.apiCalls.errors++;
      this.log('warn', `Google API error: ${error.message}`);
      return null;
    }
  }

  /**
   * OpenCellID API (gratuita)
   * @private
   */
  async _openCellIDGeolocate(parsed) {
    try {
      if (!parsed.mcc || !parsed.mnc || !parsed.lac || !parsed.cell_id) {
        return null;
      }
      
      const url = `https://opencellid.org/ajax/searchCell.php?mcc=${parsed.mcc}&mnc=${parsed.mnc}&lac=${parsed.lac}&cellid=${parsed.cell_id}`;
      
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data?.lat && response.data?.lon) {
        this.stats.apiCalls.openCellID++;
        this.stats.enhanced.lbs++;
        
        return {
          location: {
            latitude: parseFloat(response.data.lat),
            longitude: parseFloat(response.data.lon)
          },
          accuracy: parseInt(response.data.range) || 500,
          source: 'LBS',
          apiUsed: 'OpenCellID'
        };
      }
      
      return null;
      
    } catch (error) {
      this.log('warn', `OpenCellID error: ${error.message}`);
      return null;
    }
  }

  /**
   * Parsear datos WiFi crudos
   * @private
   */
  _parseWiFiData(wifiRaw) {
    if (!wifiRaw) return [];
    
    const aps = [];
    const parts = wifiRaw.split(',');
    
    for (let i = 0; i < parts.length - 1; i += 2) {
      const mac = parts[i];
      const rssi = parseInt(parts[i + 1]);
      
      if (mac && mac.length > 10 && mac !== '00:00:00:00:00:00') {
        aps.push({ mac, rssi });
      }
    }
    
    return aps;
  }

  /**
   * Detectar outliers (puntos anómalos)
   * @private
   */
  _detectOutlier(lastLocation, currentLocation, parsed) {
    const lastLoc = lastLocation.location || lastLocation;
    const currLoc = currentLocation.location || currentLocation;
    
    const distance = this._calculateDistance(
      lastLoc.latitude,
      lastLoc.longitude,
      currLoc.latitude,
      currLoc.longitude
    );
    
    // REGLA 1: Saltos imposibles
    if (distance > this.config.maxJumpMeters) {
      return {
        isOutlier: true,
        reason: `Salto de ${Math.round(distance)}m excede máximo de ${this.config.maxJumpMeters}m`
      };
    }
    
    // REGLA 2: Velocidad imposible
    const speed = parsed.speed || 0;
    if (speed > this.config.maxSpeedKmh) {
      return {
        isOutlier: true,
        reason: `Velocidad ${speed}km/h excede máximo de ${this.config.maxSpeedKmh}km/h`
      };
    }
    
    // REGLA 3: Accuracy muy mala
    if (currentLocation.accuracy > this.config.maxAccuracyMeters) {
      return {
        isOutlier: true,
        reason: `Accuracy ${currentLocation.accuracy}m excede máximo de ${this.config.maxAccuracyMeters}m`
      };
    }
    
    return { isOutlier: false };
  }

  /**
   * Detectar si dispositivo está quieto
   * @private
   */
  _detectStationary(state, currentLocation) {
    if (!state.lastSmoothed) {
      return false;
    }
    
    const lastLoc = state.lastSmoothed.location || state.lastSmoothed;
    const currLoc = currentLocation.location || currentLocation;
    
    const distance = this._calculateDistance(
      lastLoc.latitude,
      lastLoc.longitude,
      currLoc.latitude,
      currLoc.longitude
    );
    
    // Si se movió más del umbral, resetear contador
    if (distance > this.config.stationaryThresholdMeters) {
      state.stationaryStart = null;
      return false;
    }
    
    // Iniciar contador de quietud
    if (!state.stationaryStart) {
      state.stationaryStart = Date.now();
    }
    
    const stationarySeconds = (Date.now() - state.stationaryStart) / 1000;
    
    return stationarySeconds >= this.config.stationaryTimeSeconds;
  }

  /**
   * Suavizado Kalman-lite (exponential smoothing)
   * @private
   */
  _smoothLocation(previous, current) {
    const alpha = this.config.smoothingAlpha;
    
    const prevLoc = previous.location || previous;
    const currLoc = current.location || current;
    
    return {
      ...current,
      location: {
        latitude: alpha * currLoc.latitude + (1 - alpha) * prevLoc.latitude,
        longitude: alpha * currLoc.longitude + (1 - alpha) * prevLoc.longitude
      },
      accuracy: Math.min(current.accuracy || 999, previous.accuracy || 999) * 1.1
    };
  }

  /**
   * Calcular distancia entre dos puntos (fórmula Haversine)
   * @private
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Logging
   * @private
   */
  log(level, message) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel] || 1;
    
    if (levels[level] >= configLevel) {
      console.log(`[HYBRID-ENGINE] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      devices: this.deviceStates.size
    };
  }

  /**
   * Resetear estadísticas
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      enhanced: { wifi: 0, lbs: 0 },
      filtered: { outliers: 0, stationary: 0, smoothed: 0 },
      apiCalls: { google: 0, openCellID: 0, errors: 0 }
    };
  }
}

module.exports = HybridLocationEngine;
