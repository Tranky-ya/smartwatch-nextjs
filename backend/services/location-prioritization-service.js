/**
 * Location Prioritization Service
 * 
 * Implementa la lógica de Beesure para priorizar ubicaciones:
 * 1. GPS (≥4 satélites) → Máxima precisión
 * 2. WiFi positioning → Buena precisión en ciudad
 * 3. LBS (Cell Tower) → Último recurso
 */

class LocationPrioritizationService {
  constructor() {
    // Umbrales de calidad
    this.GPS_MIN_SATELLITES = 4;
    this.GPS_WEAK_SATELLITES = 3;
    this.WIFI_MIN_NETWORKS = 2;
    
    // Niveles de precisión estimada (metros)
    this.ACCURACY = {
      GPS_STRONG: 10,      // ≥4 satélites
      GPS_WEAK: 30,        // 1-3 satélites
      WiFi: 30,            // WiFi positioning
      LBS: 500,            // Cell tower
      UNKNOWN: 9999
    };
  }

  /**
   * Obtener la mejor ubicación disponible
   * @param {Object} parsed - Datos parseados del mensaje UD/AL
   * @returns {Object} - {location, source, accuracy, confidence}
   */
  getBestLocation(parsed) {
    const candidates = [];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1️⃣ EVALUAR GPS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (this.hasGPS(parsed)) {
      const gpsQuality = this.evaluateGPSQuality(parsed);
      
      if (gpsQuality.usable) {
        candidates.push({
          location: {
            latitude: parsed.latitude,
            longitude: parsed.longitude
          },
          source: gpsQuality.source,
          accuracy: gpsQuality.accuracy,
          confidence: gpsQuality.confidence,
          priority: 1, // Máxima prioridad si es bueno
          satellites: parsed.satellites || 0,
          reason: gpsQuality.reason
        });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2️⃣ EVALUAR WiFi (si GPS no es confiable)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (this.hasWiFi(parsed)) {
      // El reloj ya calculó coordenadas con WiFi
      // Solo usar si GPS falló o es débil
      const wifiQuality = this.evaluateWiFiQuality(parsed);
      
      if (wifiQuality.usable) {
        candidates.push({
          location: {
            latitude: parsed.latitude,
            longitude: parsed.longitude
          },
          source: 'WiFi',
          accuracy: this.ACCURACY.WiFi,
          confidence: wifiQuality.confidence,
          priority: 2,
          wifi_networks: wifiQuality.network_count,
          reason: wifiQuality.reason
        });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3️⃣ EVALUAR LBS (último recurso)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (this.hasLBS(parsed)) {
      candidates.push({
        location: {
          latitude: parsed.latitude,
          longitude: parsed.longitude
        },
        source: 'LBS',
        accuracy: this.ACCURACY.LBS,
        confidence: 0.3,
        priority: 3,
        cell_id: parsed.cell_id,
        reason: 'Cell tower positioning (low accuracy)'
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4️⃣ SELECCIONAR MEJOR CANDIDATO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if (candidates.length === 0) {
      return {
        location: {
          latitude: parsed.latitude || 0,
          longitude: parsed.longitude || 0
        },
        source: 'UNKNOWN',
        accuracy: this.ACCURACY.UNKNOWN,
        confidence: 0,
        priority: 99,
        reason: 'No valid positioning data available'
      };
    }

    // Ordenar por prioridad (menor = mejor)
    candidates.sort((a, b) => a.priority - b.priority);

    return candidates[0];
  }

  /**
   * Verificar si hay datos GPS
   */
  hasGPS(parsed) {
    // GPS válido si:
    // - valid = 'A' (Active)
    // - O tiene satélites > 0
    // - O NO tiene flag GPS:TD/GPS:NO
    
    if (parsed.gps_status === 'TD' || parsed.gps_status === 'NO') {
      return false; // GPS explícitamente deshabilitado
    }

    return parsed.valid === 'A' || (parsed.satellites && parsed.satellites > 0);
  }

  /**
   * Evaluar calidad de GPS
   */
  evaluateGPSQuality(parsed) {
    const sats = parsed.satellites || 0;

    // GPS fuerte (≥4 satélites)
    if (sats >= this.GPS_MIN_SATELLITES) {
      return {
        usable: true,
        source: 'GPS',
        accuracy: this.ACCURACY.GPS_STRONG,
        confidence: 0.95,
        reason: `Strong GPS signal (${sats} satellites)`
      };
    }

    // GPS débil (1-3 satélites)
    if (sats >= 1 && sats < this.GPS_MIN_SATELLITES) {
      return {
        usable: true,
        source: 'GPS_WEAK',
        accuracy: this.ACCURACY.GPS_WEAK,
        confidence: 0.6,
        reason: `Weak GPS signal (${sats} satellites)`
      };
    }

    // GPS válido pero sin satélites reportados (asumir débil)
    if (parsed.valid === 'A') {
      return {
        usable: true,
        source: 'GPS',
        accuracy: this.ACCURACY.GPS_WEAK,
        confidence: 0.7,
        reason: 'GPS valid but satellite count unknown'
      };
    }

    return {
      usable: false,
      reason: 'GPS not available'
    };
  }

  /**
   * Verificar si hay datos WiFi
   */
  hasWiFi(parsed) {
    // WiFi disponible si:
    // - tiene flag has_wifi
    // - O location_type = 'WiFi'
    // - O positionType = 'WiFi'
    
    return parsed.has_wifi === true || 
           parsed.location_type === 'WiFi' || 
           parsed.positionType === 'WiFi' ||
           (parsed.wifi_raw && parsed.wifi_raw.length > 10);
  }

  /**
   * Evaluar calidad de WiFi
   */
  evaluateWiFiQuality(parsed) {
    // Estimar número de redes (muy aproximado)
    const networkCount = parsed.wifi_raw ? 
      Math.floor(parsed.wifi_raw.length / 20) : 1;

    if (networkCount >= this.WIFI_MIN_NETWORKS) {
      return {
        usable: true,
        confidence: 0.8,
        network_count: networkCount,
        reason: `WiFi positioning (${networkCount}+ networks)`
      };
    }

    // Una sola red WiFi es menos confiable
    return {
      usable: true,
      confidence: 0.6,
      network_count: 1,
      reason: 'WiFi positioning (single network, lower confidence)'
    };
  }

  /**
   * Verificar si hay datos LBS
   */
  hasLBS(parsed) {
    // LBS disponible si tiene coordenadas y NO es GPS
    return (parsed.latitude && parsed.longitude) && 
           (parsed.positionType === 'LBS' || 
            parsed.location_type === 'TD' ||
            parsed.location_type === 'LBS');
  }

  /**
   * Obtener descripción legible del source
   */
  getSourceDescription(source) {
    const descriptions = {
      'GPS': '🛰️ GPS (Alta precisión)',
      'GPS_WEAK': '🛰️ GPS débil',
      'WiFi': '📶 WiFi (Buena precisión)',
      'LBS': '📡 Torre celular (Baja precisión)',
      'UNKNOWN': '❓ Desconocido'
    };
    
    return descriptions[source] || source;
  }

  /**
   * Generar reporte de decisión para logs
   */
  getDecisionReport(result) {
    return {
      source: result.source,
      source_display: this.getSourceDescription(result.source),
      accuracy_meters: result.accuracy,
      confidence_percent: Math.round(result.confidence * 100),
      priority: result.priority,
      reason: result.reason,
      location: result.location
    };
  }
}

module.exports = LocationPrioritizationService;
