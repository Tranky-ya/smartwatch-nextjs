/**
 * PARSER DE TRAMAS 4P-TOUCH / BEESURE GPS
 * 
 * Parser completo para smartwatches 4P Touch que extrae:
 * - GPS (lat/lon, status, satÃ©lites)
 * - LBS (MCC, MNC, LAC, CellID, seÃ±al)
 * - WiFi (MACs, RSSI)
 * - Otros datos (baterÃ­a, pasos, etc)
 */

class SmartwatchParser {
  
  /**
   * Parsea mensaje UD (PosiciÃ³n)
   * Formato: [3G*IMEI*LEN*UD_LTE,date,time,status,lat,N/S,lon,E/W,speed,dir,alt,sats,gsm,battery,steps,tumbles,status,gsmOn,voltage,mcc,mnc,lac,cellid,signal,wifinum,,mac,rssi,...]
   */
  static parsePositionMessage(message, imei) {
    try {
      // Extraer payload entre * y ]
      const parts = message.split('*');
      if (parts.length < 4) {
        throw new Error('Formato de mensaje invÃ¡lido');
      }
      
      const payload = parts[3].replace(']', '');
      const fields = payload.split(',');
      
      // Detectar tipo de mensaje
      const messageType = fields[0]; // UD, UD_LTE, UD2, etc
      
      if (!messageType.startsWith('UD')) {
        return null; // No es mensaje de posiciÃ³n
      }
      
      // Campos estÃ¡ndar UD/UD_LTE
      let index = 0;
      const data = {
        imei,
        messageType: fields[index++],           // 0: UD_LTE
        date: fields[index++],                  // 1: 030226 (DDMMYY)
        time: fields[index++],                  // 2: 235535 (HHMMSS)
        gpsStatus: fields[index++],             // 3: A=vÃ¡lido, V=invÃ¡lido
        latitude: parseFloat(fields[index++]),  // 4: 6.156721
        latDirection: fields[index++],          // 5: N/S
        longitude: parseFloat(fields[index++]), // 6: -75.5202105
        lonDirection: fields[index++],          // 7: E/W
        speed: parseFloat(fields[index++]),     // 8: 0.00 (km/h)
        direction: parseFloat(fields[index++]), // 9: 0.0 (grados)
        altitude: parseFloat(fields[index++]),  // 10: 0.0 (metros)
        satellites: parseInt(fields[index++]) || 0, // 11: nÃºmero de satÃ©lites
        gsmSignal: parseInt(fields[index++]) || 0,  // 12: seÃ±al GSM (0-31)
        battery: parseInt(fields[index++]) || 0,    // 13: % baterÃ­a
        steps: parseInt(fields[index++]) || 0,      // 14: pasos totales
        tumbles: parseInt(fields[index++]) || 0,    // 15: caÃ­das
        deviceStatus: fields[index++],              // 16: estado hex
        gsmOn: parseInt(fields[index++]) || 0,      // 17: GSM encendido
        voltage: parseInt(fields[index++]) || 0,    // 18: voltaje
        
        // Datos LBS (Cell Tower)
        mcc: parseInt(fields[index++]) || 0,        // 19: Mobile Country Code
        mnc: parseInt(fields[index++]) || 0,        // 20: Mobile Network Code
        lac: parseInt(fields[index++]) || 0,        // 21: Location Area Code
        cellId: parseInt(fields[index++]) || 0,     // 22: Cell ID
        signalStrength: parseInt(fields[index++]) || 0, // 23: seÃ±al LBS
        
        // WiFi Access Points
        wifiCount: parseInt(fields[index++]) || 0,  // 24: nÃºmero de APs detectados
        wifiAccessPoints: []
      };
      
      // Parsear WiFi Access Points
      // Formato: ,,MAC,RSSI,,MAC,RSSI,...
      while (index < fields.length - 1) {
        index++; // Saltar campo vacÃ­o
        
        const macAddress = fields[index++];
        const signalStrength = parseInt(fields[index++]) || -100;
        
        if (macAddress && macAddress !== '0.0') {
          data.wifiAccessPoints.push({
            macAddress: macAddress.toUpperCase(),
            signalStrength
          });
        }
      }
      
      // Timestamp completo
      data.timestamp = this._parseDateTime(data.date, data.time);
      
      // Convertir coordenadas a formato estÃ¡ndar si es necesario
      if (data.latDirection === 'S') {
        data.latitude = -Math.abs(data.latitude);
      }
      if (data.lonDirection === 'W' && data.longitude > 0) {
        data.longitude = -Math.abs(data.longitude);
      }
      
      // Metadata adicional
      data.isMoving = data.speed > 0.5; // Moving si velocidad > 0.5 km/h
      data.hasGPS = data.gpsStatus === 'A' && data.satellites >= 4;
      data.hasWiFi = data.wifiAccessPoints.length >= 2;
      data.hasLBS = data.cellId > 0;
      
      return data;
      
    } catch (error) {
      console.error('[PARSER ERROR]', error.message);
      return null;
    }
  }

  /**
   * Parsea mensaje LK (Heartbeat)
   * Formato: [3G*IMEI*LEN*LK,totalSteps,todaySteps,battery]
   */
  static parseHeartbeatMessage(message, imei) {
    try {
      const parts = message.split('*');
      if (parts.length < 4) {
        throw new Error('Formato de mensaje invÃ¡lido');
      }
      
      const payload = parts[3].replace(']', '');
      const fields = payload.split(',');
      
      if (fields[0] !== 'LK') {
        return null;
      }
      
      return {
        imei,
        messageType: 'HEARTBEAT',
        totalSteps: parseInt(fields[1]) || 0,
        todaySteps: parseInt(fields[2]) || 0,
        battery: parseInt(fields[3]) || 0,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('[PARSER ERROR]', error.message);
      return null;
    }
  }

  /**
   * Parsea cualquier tipo de mensaje
   */
  static parseMessage(rawMessage) {
    try {
      // Limpiar mensaje
      const message = rawMessage.trim();
      
      // Validar formato bÃ¡sico [3G*IMEI*LEN*PAYLOAD]
      if (!message.startsWith('[3G*') || !message.endsWith(']')) {
        return null;
      }
      
      // Extraer IMEI
      const parts = message.split('*');
      if (parts.length < 4) {
        return null;
      }
      
      const imei = parts[1];
      const payload = parts[3].split(',')[0].replace(']', '');
      
      // Detectar tipo de mensaje
      if (payload.startsWith('UD')) {
        return this.parsePositionMessage(message, imei);
      }
      
      if (payload === 'LK') {
        return this.parseHeartbeatMessage(message, imei);
      }
      
      // Otros tipos de mensaje (agregar segÃºn necesites)
      return {
        imei,
        messageType: 'UNKNOWN',
        payload,
        rawMessage: message
      };
      
    } catch (error) {
      console.error('[PARSER ERROR]', error.message);
      return null;
    }
  }

  /**
   * Convierte fecha/hora del dispositivo a Date
   * @private
   */
  static _parseDateTime(dateStr, timeStr) {
    try {
      // dateStr: DDMMYY (030226 = 3 de febrero 2026)
      // timeStr: HHMMSS (235535 = 23:55:35)
      
      const day = parseInt(dateStr.substr(0, 2));
      const month = parseInt(dateStr.substr(2, 2)) - 1; // 0-indexed
      const year = 2000 + parseInt(dateStr.substr(4, 2));
      
      const hour = parseInt(timeStr.substr(0, 2));
      const minute = parseInt(timeStr.substr(2, 2));
      const second = parseInt(timeStr.substr(4, 2));
      
      return new Date(year, month, day, hour, minute, second);
      
    } catch (error) {
      return new Date(); // Fallback a hora actual
    }
  }

  /**
   * Valida si los datos de posiciÃ³n son utilizables
   */
  static isValidPositionData(data) {
    if (!data) return false;
    
    return (
      data.latitude !== 0 &&
      data.longitude !== 0 &&
      Math.abs(data.latitude) <= 90 &&
      Math.abs(data.longitude) <= 180 &&
      (data.hasGPS || data.hasWiFi || data.hasLBS)
    );
  }

  /**
   * Formatea datos para logging
   */
  static formatForLog(data) {
    if (!data) return 'NULL';
    
    if (data.messageType === 'HEARTBEAT') {
      return `[LK] IMEI: ${data.imei}, Battery: ${data.battery}%, Steps: ${data.todaySteps}/${data.totalSteps}`;
    }
    
    if (data.messageType && data.messageType.startsWith('UD')) {
      const status = data.gpsStatus === 'A' ? 'GPS-VALID' : 'GPS-INVALID';
      return `[${data.messageType}] IMEI: ${data.imei}, ${status}, Sats: ${data.satellites}, WiFi: ${data.wifiAccessPoints.length}, LBS: ${data.hasLBS ? 'YES' : 'NO'}, Pos: (${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)})`;
    }
    
    return `[${data.messageType}] IMEI: ${data.imei}`;
  }
}

module.exports = SmartwatchParser;
