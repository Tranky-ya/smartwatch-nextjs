/**
 * MOTOR DE LOCALIZACIÓN HÍBRIDO - VERSIÓN CORREGIDA 
 * 
 * CAMBIOS CRÍTICOS:
 * - maxSpeedKmh: 15 → 120 km/h (permitir vehículos)
 * - maxAccuracyMeters: 50 → 1000m (menos restrictivo)
 * - maxJumpMeters: 40 → 300m (saltos más grandes)
 * - Outliers: 3 consecutivos antes de rechazar
 * - GPS fallback más permisivo
 */

const axios = require('axios');
const geolib = require('geolib');

class HybridLocationEngine {
  constructor(config = {}) {
    this.config = {
      // APIs de geolocalización
      googleApiKey: config.googleApiKey || null,
      unwiredLabsToken: config.unwiredLabsToken || null,
      openCellIDToken: config.openCellIDToken || null,
      useOpenCellID: config.useOpenCellID !== false,
      useMozillaLS: config.useMozillaLS !== false,

      // 🚨 PARÁMETROS CORREGIDOS - MUY PERMISIVOS
      maxJumpMeters: config.maxJumpMeters || 300,        // Era: 40m → 300m
      maxSpeedKmh: config.maxSpeedKmh || 120,            // Era: 15km/h → 120km/h  
      maxAccuracyMeters: config.maxAccuracyMeters || 1000, // Era: 50m → 1000m
      stationaryThresholdMeters: config.stationaryThresholdMeters || 5,
      stationaryTimeSeconds: config.stationaryTimeSeconds || 30,

      // Suavizado
      smoothingAlpha: config.smoothingAlpha || 0.35,

      // Map matching
      mapMatchingEnabled: config.mapMatchingEnabled !== false,
      mapMatchingRadius: config.mapMatchingRadius || 50,

      // GPS scoring (más permisivo)
      minGoodSatellites: config.minGoodSatellites || 3,   // Era: 6 → 3
      minWeakSatellites: config.minWeakSatellites || 2,   // Era: 4 → 2

      // Logging
      logLevel: config.logLevel || 'info'
    };

    this.state = new Map();
    this.stats = {
      totalProcessed: 0,
      bySource: { GPS: 0, WiFi: 0, LBS: 0, FALLBACK: 0 },
      outliers: { jumps: 0, speed: 0, accuracy: 0 },
      stationary: 0,
      smoothed: 0,
      mapMatched: 0
    };
  }

  async processLocation(rawData) {
    this.stats.totalProcessed++;
    const { imei } = rawData;

    if (!this.state.has(imei)) {
      this.state.set(imei, {
        lastGoodPoint: null,
        lastSmoothed: null,
        stationaryStart: null,
        stationaryCount: 0,
        lastSpeed: 0,
        history: [],
        outlierStreak: 0  // 🚨 Contador de outliers consecutivos
      });
    }

    const deviceState = this.state.get(imei);

    try {
      // PASO 1: Clasificar GPS
      const gpsQuality = this._classifyGPSQuality(rawData);

      // PASO 2: Seleccionar fuente
      let location;

      if (gpsQuality === 'GOOD') {
        location = {
          latitude: rawData.latitude,
          longitude: rawData.longitude,
          accuracy: this._estimateGPSAccuracy(rawData.satellites),
          source: 'GPS',
          timestamp: Date.now()
        };
        this.stats.bySource.GPS++;

      } else if (gpsQuality === 'WEAK') {
        const wifiLocation = await this._getWiFiLocation(rawData);
        const lbsLocation = await this._getLBSLocation(rawData);

        if (wifiLocation && (!lbsLocation || wifiLocation.accuracy < lbsLocation.accuracy)) {
          location = wifiLocation;
          this.stats.bySource.WiFi++;
        } else if (lbsLocation) {
          location = lbsLocation;
          this.stats.bySource.LBS++;
        } else {
          // 🚨 FALLBACK GPS PERMISIVO
          this.log('warn', `[${imei}] WiFi y LBS fallaron, usando GPS_FALLBACK`);
          location = {
            latitude: rawData.latitude,
            longitude: rawData.longitude,
            accuracy: 200, // Accuracy moderada
            source: 'GPS_FALLBACK',
            timestamp: Date.now()
          };
          this.stats.bySource.FALLBACK++;
        }

      } else {
        // GPS malo - intentar WiFi/LBS, fallback a GPS
        const wifiLocation = await this._getWiFiLocation(rawData);
        const lbsLocation = await this._getLBSLocation(rawData);

        if (wifiLocation && (!lbsLocation || wifiLocation.accuracy < lbsLocation.accuracy)) {
          location = wifiLocation;
          this.stats.bySource.WiFi++;
        } else if (lbsLocation) {
          location = lbsLocation;
          this.stats.bySource.LBS++;
        } else {
          // 🚨 ACEPTAR GPS CRUDO COMO ÚLTIMO RECURSO
          this.log('warn', `[${imei}] Todas las fuentes fallaron, aceptando GPS crudo`);
          location = {
            latitude: rawData.latitude,
            longitude: rawData.longitude,
            accuracy: 500,
            source: 'GPS_LAST_RESORT',
            timestamp: Date.now()
          };
          this.stats.bySource.FALLBACK++;
        }
      }

      if (!location) {
        throw new Error('No se pudo obtener ubicación');
      }

      // PASO 3: Validación de outliers (MUY PERMISIVA)
      if (deviceState.lastGoodPoint) {
        const isOutlier = this._isOutlier(deviceState.lastGoodPoint, location);
        
        if (isOutlier.detected) {
          deviceState.outlierStreak++;
          this.log('warn', `[${imei}] Outlier detectado: ${isOutlier.reason} - racha: ${deviceState.outlierStreak}`);
          
          // 🚨 Solo rechazar después de 5 outliers consecutivos (muy permisivo)
          if (deviceState.outlierStreak >= 5) {
            this.log('error', `[${imei}] Demasiados outliers (${deviceState.outlierStreak}), usando punto anterior`);
            return {
              ...deviceState.lastSmoothed,
              timestamp: Date.now(),
              outlier: true,
              outlierReason: isOutlier.reason
            };
          }
        } else {
          deviceState.outlierStreak = 0;
        }
      }

      // PASO 4: Detectar quietud
      if (this._detectStationary(deviceState, location)) {
        this.stats.stationary++;
        return {
          ...deviceState.lastSmoothed,
          stationary: true,
          stationaryDuration: Math.floor((Date.now() - deviceState.stationaryStart) / 1000)
        };
      }

      // PASO 5: Suavizado
      let smoothedLocation;
      if (deviceState.lastSmoothed && location.source === 'GPS') {
        smoothedLocation = this._smoothLocation(deviceState.lastSmoothed, location);
        this.stats.smoothed++;
      } else {
        smoothedLocation = location;
      }

      // PASO 6: Map matching
      let finalLocation = smoothedLocation;
      if (this.config.mapMatchingEnabled && location.source === 'GPS' && location.accuracy < 100) {
        const matchedLocation = await this._mapMatch(smoothedLocation);
        if (matchedLocation) {
          finalLocation = matchedLocation;
          this.stats.mapMatched++;
        }
      }

      // Actualizar estado
      deviceState.lastGoodPoint = location;
      deviceState.lastSmoothed = finalLocation;
      deviceState.lastSpeed = rawData.speed || 0;

      deviceState.history.push(finalLocation);
      if (deviceState.history.length > 10) {
        deviceState.history.shift();
      }

      return {
        ...finalLocation,
        raw: {
          latitude: rawData.latitude,
          longitude: rawData.longitude,
          gpsStatus: rawData.gpsStatus,
          satellites: rawData.satellites
        },
        processing: {
          gpsQuality,
          smoothed: smoothedLocation !== location,
          mapMatched: finalLocation !== smoothedLocation,
          stationary: false,
          outlierStreak: deviceState.outlierStreak
        }
      };

    } catch (error) {
      this.log('error', `[${imei}] Error: ${error.message}`);
      
      // 🚨 FALLBACK FINAL - siempre retornar algo
      const fallbackLocation = {
        latitude: rawData.latitude,
        longitude: rawData.longitude,
        accuracy: 1000,
        source: 'ERROR_FALLBACK', 
        error: error.message,
        timestamp: Date.now()
      };
      
      deviceState.lastSmoothed = fallbackLocation;
      return fallbackLocation;
    }
  }

  _classifyGPSQuality(data) {
    if (data.gpsStatus !== 'A') return 'BAD';
    if (data.satellites >= this.config.minGoodSatellites) return 'GOOD';
    if (data.satellites >= this.config.minWeakSatellites) return 'WEAK';
    return 'BAD';
  }

  _isOutlier(lastPoint, currentPoint) {
    const distance = geolib.getDistance(
      { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
      { latitude: currentPoint.latitude, longitude: currentPoint.longitude }
    );

    const timeDiff = Math.max((currentPoint.timestamp - lastPoint.timestamp) / 1000, 1);

    // Salto espacial
    if (distance > this.config.maxJumpMeters) {
      this.stats.outliers.jumps++;
      return { detected: true, reason: `Salto de ${distance}m en ${timeDiff}s` };
    }

    // Velocidad imposible
    const speedKmh = (distance / timeDiff) * 3.6;
    if (speedKmh > this.config.maxSpeedKmh) {
      this.stats.outliers.speed++;
      return { detected: true, reason: `Velocidad ${speedKmh.toFixed(1)} km/h > ${this.config.maxSpeedKmh} km/h` };
    }

    // Accuracy mala
    if (currentPoint.accuracy > this.config.maxAccuracyMeters) {
      this.stats.outliers.accuracy++;
      return { detected: true, reason: `Accuracy ${currentPoint.accuracy}m > ${this.config.maxAccuracyMeters}m` };
    }

    return { detected: false };
  }

  _detectStationary(deviceState, location) {
    if (!deviceState.lastSmoothed) return false;

    const distance = geolib.getDistance(
      { latitude: deviceState.lastSmoothed.latitude, longitude: deviceState.lastSmoothed.longitude },
      { latitude: location.latitude, longitude: location.longitude }
    );

    if (distance > this.config.stationaryThresholdMeters) {
      deviceState.stationaryStart = null;
      deviceState.stationaryCount = 0;
      return false;
    }

    if (!deviceState.stationaryStart) {
      deviceState.stationaryStart = Date.now();
    }

    deviceState.stationaryCount++;
    const quietDuration = (Date.now() - deviceState.stationaryStart) / 1000;
    return quietDuration >= this.config.stationaryTimeSeconds;
  }

  _smoothLocation(lastSmoothed, currentLocation) {
    const alpha = this.config.smoothingAlpha;
    return {
      ...currentLocation,
      latitude: lastSmoothed.latitude + alpha * (currentLocation.latitude - lastSmoothed.latitude),
      longitude: lastSmoothed.longitude + alpha * (currentLocation.longitude - lastSmoothed.longitude)
    };
  }

  _estimateGPSAccuracy(satellites) {
    if (satellites >= 8) return 3;
    if (satellites >= 6) return 5;
    if (satellites >= 4) return 10;
    if (satellites >= 3) return 20;
    return 50;
  }

  async _getWiFiLocation(rawData) {
    if (!rawData.wifiAccessPoints || rawData.wifiAccessPoints.length === 0) {
      return null;
    }

    const validAPs = rawData.wifiAccessPoints.filter(ap => 
      ap.macAddress && ap.macAddress !== '00:00:00:00:00:00'
    );

    if (validAPs.length === 0) return null;

    if (this.config.googleApiKey) {
      try {
        this.log('debug', `Intentando Google WiFi...`);
        return await this._googleGeolocate(rawData, 'wifi');
      } catch (error) {
        this.log('warn', `Google WiFi falló: ${error.message}`);
      }
    }

    if (this.config.unwiredLabsToken) {
      try {
        this.log('debug', `Intentando Unwired Labs WiFi...`);
        return await this._unwiredLabsGeolocate(rawData, 'wifi');
      } catch (error) {
        this.log('warn', `Unwired Labs WiFi falló: ${error.message}`);
      }
    }

    this.log('debug', `No WiFi sources succeeded or available`);
    return null;
  }

  async _getLBSLocation(rawData) {
    if (this.config.googleApiKey) {
      try {
        this.log('debug', `Intentando Google LBS...`);
        return await this._googleGeolocate(rawData, 'lbs');
      } catch (error) {
        this.log('warn', `Google LBS falló: ${error.message}`);
      }
    }

    if (this.config.unwiredLabsToken) {
      try {
        this.log('debug', `Intentando Unwired Labs LBS...`);
        return await this._unwiredLabsGeolocate(rawData, 'lbs');
      } catch (error) {
        this.log('warn', `Unwired Labs LBS falló: ${error.message}`);
      }
    }

    if (this.config.useOpenCellID) {
      try {
        this.log('debug', `Intentando OpenCellID LBS...`);
        return await this._openCellIDGeolocate(rawData);
      } catch (error) {
        this.log('warn', `OpenCellID LBS falló: ${error.message}`);
      }
    }

    this.log('debug', `No LBS sources succeeded or available`);
    return null;
  }

  async _googleGeolocate(rawData, mode) {
    const payload = { considerIp: false };

    if (mode === 'wifi' || (mode === 'lbs' && rawData.wifiAccessPoints?.length > 0)) {
      const validAPs = rawData.wifiAccessPoints
        .filter(ap => {
          const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
          return ap.macAddress && 
                 ap.macAddress !== '00:00:00:00:00:00' && 
                 macRegex.test(ap.macAddress);
        })
        .map(ap => ({
          macAddress: ap.macAddress.toUpperCase().replace(/-/g, ':'),
          signalStrength: ap.signalStrength || -50
        }));

      if (validAPs.length === 0) {
        throw new Error('No valid WiFi APs after filtering');
      }

      payload.wifiAccessPoints = validAPs;
    }

    if (mode === 'lbs') {
      if (!rawData.cellId || rawData.cellId === 0) {
        throw new Error('Invalid cell tower data');
      }

      payload.cellTowers = [{
        cellId: rawData.cellId,
        locationAreaCode: rawData.lac || 0,
        mobileCountryCode: rawData.mcc || 0,
        mobileNetworkCode: rawData.mnc || 0,
        ...(rawData.signalStrength && { signalStrength: rawData.signalStrength })
      }];
      this.log('info', `[DEBUG GOOGLE] Payload a enviar: ${JSON.stringify(payload, null, 2)}`);
      this.log('info', `[DEBUG GOOGLE] Mode: ${mode}, WiFi APs: ${payload.wifiAccessPoints?.length || 0}, Cell Towers: ${payload.cellTowers?.length || 0}`);
    }

    this.log('info', `[DEBUG GOOGLE] Payload: ${JSON.stringify(payload)}`);
    this.log('info', `[DEBUG GOOGLE] Mode: ${mode}`);

    const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.config.googleApiKey}`;
    const response = await axios.post(url, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.location) {
      return {
        latitude: response.data.location.lat,
        longitude: response.data.location.lng,
        accuracy: response.data.accuracy || 100,
        source: mode.toUpperCase(),
        timestamp: Date.now()
      };
    }

    throw new Error('Google API returned invalid response');
  }

  async _unwiredLabsGeolocate(rawData, mode) {
    const payload = {};

    if (mode === 'wifi' && rawData.wifiAccessPoints?.length > 0) {
      payload.wifi = rawData.wifiAccessPoints
        .filter(ap => ap.macAddress && ap.macAddress !== '00:00:00:00:00:00')
        .map(ap => ({
          bssid: ap.macAddress,
          signal: ap.signalStrength || -50
        }));

      if (payload.wifi.length === 0) {
        throw new Error('No valid WiFi APs for Unwired Labs');
      }
    }

    if (mode === 'lbs' && rawData.cellId > 0) {
      payload.cells = [{
        cid: rawData.cellId,
        lac: rawData.lac || 0,
        mcc: rawData.mcc || 0,
        mnc: rawData.mnc || 0,
        ...(rawData.signalStrength && { signal: rawData.signalStrength })
      }];
    }

    const url = `https://us1.unwiredlabs.com/v2/process.php`;
    const response = await axios.post(url, {
      token: this.config.unwiredLabsToken,
      ...payload
    }, { timeout: 5000 });

    if (response.data && response.data.status === 'ok' && response.data.lat && response.data.lon) {
      return {
        latitude: response.data.lat,
        longitude: response.data.lon,
        accuracy: response.data.accuracy || 100,
        source: mode.toUpperCase(),
        timestamp: Date.now()
      };
    }

    throw new Error(`Unwired Labs error: ${response.data?.message || 'Unknown error'}`);
  }

  async _openCellIDGeolocate(rawData) {
    if (!rawData.cellId || rawData.cellId === 0) {
      throw new Error('Invalid cell data for OpenCellID');
    }

    const token = this.config.openCellIDToken || 'pk.e71689991f177c30448dd2841bd0d984';
    const url = `http://opencellid.org/cell/get?key=${token}&mcc=${rawData.mcc || 0}&mnc=${rawData.mnc || 0}&lac=${rawData.lac || 0}&cellid=${rawData.cellId}&format=json`;
    
    try {
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data && response.data.lat && response.data.lon) {
        return {
          latitude: response.data.lat,
          longitude: response.data.lon,
          accuracy: response.data.range || 1000,
          source: 'LBS_OPENCELLID',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      this.log('warn', `OpenCellID falló: ${error.message}`);
    }

    return null;
  }

  async _mapMatch(location) {
    return null;
  }

  log(level, message) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const configLevel = levels[this.config.logLevel] || 2;
    
    if (levels[level] <= configLevel) {
      console.log(`[${new Date().toISOString()}] [HYBRID-ENGINE] [${level.toUpperCase()}] ${message}`);
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeDevices: this.state.size,
      config: {
        maxSpeedKmh: this.config.maxSpeedKmh,
        maxAccuracyMeters: this.config.maxAccuracyMeters,
        maxJumpMeters: this.config.maxJumpMeters
      }
    };
  }
}

module.exports = HybridLocationEngine;
