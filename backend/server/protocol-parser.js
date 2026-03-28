class ProtocolParser {
  /**
   * Parse mensaje del dispositivo
   * Formato Beesure: [CS*IMEI*LEN*CONTENT]
   * CS: Código del fabricante (2 dígitos)
   * IMEI: 10 dígitos (últimos 10 dígitos del IMEI)
   * LEN: Longitud del contenido en hexadecimal (4 dígitos)
   * CONTENT: Datos reales (variable)
   */
  static parse(message) {
    try {
      const message_clean = message.trim();

      // 🧪 VALIDACIÓN 1: Formato básico [...]
      console.log(`\n🧪 [VALIDATE] Mensaje crudo: ${JSON.stringify(message_clean)}`);

      if (!message_clean.startsWith('[') || !message_clean.endsWith(']')) {
      // Silenciar advertencia si es claramente un paquete binario AQSH
      if (message_clean.includes('AQSH') || /[\x00-\x08]/.test(message_clean)) {
        return null;
      }
      console.warn(`⚠️ ❌ FORMATO INVÁLIDO - No tiene [ al inicio o ] al final`);
        console.warn(`   Esperado: [CS*IMEI*LEN*CONTENT]`);
        console.warn(`   Recibido: ${JSON.stringify(message_clean)}`);
        return null;
      }

      console.log(`✅ Formato correcto: empieza con [ y termina con ]`);

      const content = message_clean.slice(1, -1);
      const parts = content.split('*');

      // 🧪 VALIDACIÓN 2: Estructura [CS*IMEI*LEN*CONTENT]
      console.log(`🧪 [VALIDATE] Partes separadas por *: ${parts.length} campos`);
      console.log(`   ${JSON.stringify(parts)}`);

      if (parts.length < 4) {
        console.warn(`⚠️ ❌ ESTRUCTURA INVÁLIDA - Menos de 4 campos`);
        console.warn(`   Esperado: 4+ campos [CS*IMEI*LEN*CONTENT]`);
        console.warn(`   Recibido: ${parts.length} campos`);
        return null;
      }

      const protocol = parts[0]; // 3G / CS / SG etc
      const imei = parts[1];
      const third = parts[2];    // puede ser INDEX (0002) o HEX_LEN (00A2)

      // El payload real está desde parts[3]
      const payload = parts.slice(3).join('*');

      // 🧪 VALIDACIÓN 3: IMEI (10 dígitos)
      console.log(`🧪 [VALIDATE] IMEI: ${JSON.stringify(imei)}`);
      if (!imei.match(/^\d{10}$/)) {
        console.warn(`⚠️ ❌ IMEI INVÁLIDO - Debe ser 10 dígitos`);
        console.warn(`   Recibido: ${JSON.stringify(imei)}`);
        return null;
      }
      console.log(`✅ IMEI válido: ${imei}`);

      // 🧪 VALIDACIÓN 4: Detectar si es INDEX o HEX_LEN
      console.log(`🧪 [VALIDATE] Tercer campo (INDEX/LEN): ${JSON.stringify(third)}`);
      const isHexLen = /^[0-9A-Fa-f]{4}$/.test(third);
      const isIndex = /^\d{4}$/.test(third) && !isHexLen; // 0001-9999 típicamente

      let index = null;
      let hexLength = null;

      if (isHexLen) {
        hexLength = third;
        console.log(`✅ Detectado HEX_LEN: ${hexLength}`);

        // Validar longitud del contenido
        const expectedLength = parseInt(hexLength, 16);
        console.log(`🧪 [VALIDATE] Longitud: ${expectedLength} bytes (hex: ${hexLength}), actual: ${payload.length} bytes`);

        if (payload.length !== expectedLength) {
          console.warn(`⚠️ ⚠️ LONGITUD NO COINCIDE`);
          console.warn(`   Esperado: ${expectedLength} bytes`);
          console.warn(`   Actual:   ${payload.length} bytes`);
          console.warn(`   Payload: ${JSON.stringify(payload)}`);
        } else {
          console.log(`✅ Longitud correcta: ${payload.length} bytes`);
        }
      } else if (isIndex) {
        index = third;
        console.log(`✅ Detectado INDEX: ${index}`);
      } else {
        console.warn(`⚠️ Tercer campo no es válido HEX_LEN ni INDEX: ${third}`);
      }

      const payloadParts = payload.split(',');
      const commandType = (payloadParts[0] || '').toUpperCase();

      let typeDesc = commandType;
      if (['UD', 'UD2', 'AL', 'UD_LTE', 'UD_WCDMA', 'AL_LTE'].includes(commandType)) typeDesc = '📍 UBICACIÓN / POSICIÓN';
      if (['HR', 'BP', 'BT', 'BTEMP2', 'SPO2', 'BPHRT', 'HT'].includes(commandType)) typeDesc = '🩺 SALUD / BIOMETRÍA';
      if (['LK', 'HB'].includes(commandType)) typeDesc = '💓 HEARTBEAT (Conexión)';
      if (['TK', 'TKQ', 'TKQ2'].includes(commandType)) typeDesc = '💬 CHAT / VOZ';
      if (['CR', 'DW'].includes(commandType)) typeDesc = '🎯 SOLICITUD UBICACIÓN';
      if (['FIND', 'HRTSTART'].includes(commandType)) typeDesc = '🔔 ACCIÓN DE CONTROL';
      
      console.log(`✅ VALIDACIÓN COMPLETA`);
      console.log(`   Protocolo: ${protocol}, IMEI: ${imei}, IDX: ${index || '-'}, HEX_LEN: ${hexLength || '-'}, Comando: ${commandType} (${typeDesc})`);

      const attachMeta = (parsed) => {
        if (!parsed || typeof parsed !== 'object') return parsed;
        if (parsed.protocol === undefined) parsed.protocol = protocol;
        if (parsed.index === undefined) parsed.index = index;
        return parsed;
      };

      switch (commandType) {
        case 'LK':
          return this.parseLKMessage(protocol, imei, index, payloadParts);
        case 'UD':
        case 'UD_WCDMA':
        case 'UD_LTE':
          return attachMeta(this.parseUDMessage(imei, payloadParts, commandType));
        case 'UD2':
          return attachMeta(this.parseUD2Message(imei, payloadParts));
        case 'AL':
        case 'AL_LTE':
          return attachMeta(this.parseALMessage(imei, payloadParts));
        case 'CONFIG':
          return attachMeta(this.parseConfigMessage(imei, payloadParts));
        case 'BPHRT':
          return attachMeta(this.parseBPHRTMessage(imei, payloadParts));
        case 'HT': // 🔥 Health Total (Combined)
          return attachMeta(this.parseHTMessage(imei, payloadParts));
        case 'HR': // Heart Rate
        case 'BP': // Blood Pressure
        case 'BT': // Body Temperature
        case 'BTEMP2': // Some firmwares report temperature with BTEMP2
          return attachMeta(this.parseHealthGeneric(imei, commandType, payloadParts));
        case 'OXYGEN':
        case 'OXYGENO':
          return attachMeta(this.parseOxygenMessage(imei, payloadParts));
        case 'TK':
        case 'TKQ':
        case 'TKQ2':
          return attachMeta(this.parseTKMessage(imei, payloadParts));
        case 'PP':
          return attachMeta(this.parsePPMessage(imei, payloadParts));
        case 'TS':
          return attachMeta(this.parseTSMessage(imei, payloadParts));
        case 'CR':
          return attachMeta(this.parseCRMessage(imei, payloadParts));
        case 'FIND': // 🔥 Find Device Echo
          return { type: 'FIND', imei, timestamp: new Date() };
        case 'HRTSTART': // 🔥 Health measurement start echo
          return { type: 'HRTSTART', imei, timestamp: new Date() };
        case 'DEVICEFUNCCOUNT':
        case 'CALLLOG':
        case 'ICCID':
        case 'RYIMEI':
        case 'APPCONTACTTEL':
        case 'HB':
          return { type: commandType, imei, timestamp: new Date() };
        default:
          console.warn(`⚠️ Tipo de comando desconocido: ${commandType}`);
          return {
            type: 'UNKNOWN',
            command: commandType,
            protocol,
            imei,
            index,
            payload
          };
      }
    } catch (error) {
      console.error('❌ EXCEPTION en parse():', error.message);
      return null;
    }
  }


  /**
   * Parse mensaje LK (Heartbeat/Keep-Alive)
   * Formato: [CS*IMEI*LEN*LK]
   * o: [CS*IMEI*LEN*LK,steps,body_flips,battery]
   */
  static parseLKMessage(protocol, imei, index, payloadParts) {
    const parsed = {
      type: 'LK',
      protocol,
      imei,
      index, // ✅ clave para responder LK
      timestamp: new Date()
    };

    if (payloadParts.length > 1) parsed.steps = parseInt(payloadParts[1]) || 0;
    if (payloadParts.length > 2) parsed.bodyFlips = parseInt(payloadParts[2]) || 0;
    if (payloadParts.length > 3) parsed.battery = parseInt(payloadParts[3]) || 100;

    return parsed;
  }

  static generateLKResponse(parsed) {
    // Respuesta exacta que el dispositivo espera
    // [3G*IMEI*INDEX*LK]
    const proto = parsed.protocol || '3G';
    const imei10 = (parsed.imei || '').slice(-10);
    const idx = parsed.index || '0001';
    return `[${proto}*${imei10}*${idx}*LK]`;
  }

  /**
   * Parse mensaje UD (Ubicación)
   * Formato: [CS*IMEI*LEN*UD,date,time,status,lat,N/S,lng,E/W,speed,course,altitude,satellites,signal,battery,steps,body_flips,status_hex,local_bases,...]
   */
  static parseUDMessage(imei, payloadParts, commandType = 'UD') {
    try {
      const position = {
        type: 'UD',
        imei: imei,
        timestamp: new Date(),
        valid: 'V' // Por defecto inválido
      };

      if (payloadParts.length < 2) return position;

      let idx = 1; // Comenzar después de 'UD'

      // Fecha (DDMMYY)
      if (payloadParts[idx]) {
        position.date = payloadParts[idx];
        idx++;
      }

      // Hora (HHMMSS)
      if (payloadParts[idx]) {
        position.time = payloadParts[idx];
        position.timestamp = this.parseDateTime(position.date, position.time);
        idx++;
      }

      // Estado de posicionamiento (A=válido, V=inválido)
      if (payloadParts[idx]) {
        position.valid = payloadParts[idx];
        idx++;
      }

      // Latitud
      let latValue = 0;
      let latHemCheck = 'N';
      if (payloadParts[idx]) {
        latValue = payloadParts[idx];
        idx++;
      }

      // Hemisferio de latitud
      if (payloadParts[idx]) {
        latHemCheck = payloadParts[idx];
        idx++;
      }

      // Parsear latitud correctamente
      position.latitude = this.parseCoordinate(latValue, latHemCheck);
      position.latHemisphere = latHemCheck;

      // Longitud
      let lngValue = 0;
      let lngHemCheck = 'E';
      if (payloadParts[idx]) {
        lngValue = payloadParts[idx];
        idx++;
      }

      // Hemisferio de longitud
      if (payloadParts[idx]) {
        lngHemCheck = payloadParts[idx];
        idx++;
      }

      // Parsear longitud correctamente
      position.longitude = this.parseCoordinate(lngValue, lngHemCheck);
      position.lngHemisphere = lngHemCheck;

      // Velocidad
      if (payloadParts[idx]) {
        position.speed = parseFloat(payloadParts[idx]) || 0;
        idx++;
      }

      // Dirección (Course)
      if (payloadParts[idx]) {
        position.course = parseFloat(payloadParts[idx]) || 0;
        idx++;
      }

      // Altitud
      if (payloadParts[idx]) {
        position.altitude = parseFloat(payloadParts[idx]) || 0;
        idx++;
      }

      // Satélites
      if (payloadParts[idx]) {
        position.satellites = parseInt(payloadParts[idx]) || 0;
        idx++;
      }

      // Intensidad de señal GSM
      if (payloadParts[idx]) {
        position.signalStrength = parseInt(payloadParts[idx]) || 0;
        idx++;
      }

      // Batería
      if (payloadParts[idx]) {
        position.battery = parseInt(payloadParts[idx]) || 0;
        idx++;
      }

      // Pasos
      if (payloadParts[idx]) {
        position.steps = parseInt(payloadParts[idx]) || 0;
        idx++;
      }

      // Volteretas del cuerpo
      if (payloadParts[idx]) {
        position.bodyFlips = parseInt(payloadParts[idx]) || 0;
        idx++;
      }

      // Estado del dispositivo (hexadecimal) - Incluye códigos de alarma
      if (payloadParts[idx]) {
        position.deviceStatus = payloadParts[idx];
        
        // Determinar tipo de posicionamiento de forma más inteligente
        // Prioridad: GPS válido > WiFi > LBS
        if (position.valid === 'A' && position.satellites >= 4) {
          position.positionType = 'GPS';
          position.location_type = 'GPS';
        } else if (position.satellites > 0 && position.satellites < 4) {
          // GPS intentando pero sin suficientes satélites
          position.positionType = 'GPS_WEAK';
          position.location_type = 'TD'; // Tower Data (fallback)
        } else {
          // Sin GPS, determinar si es WiFi o LBS puro
          position.positionType = 'LBS';
          position.location_type = 'TD';
        }

        // Decodificar alarmas desde el campo hexadecimal
        position.alarms = this.decodeAlarmHex(payloadParts[idx]);
        position.alarm_type = this.getMainAlarmType(position.alarms);

        idx++;
      }

      // 🆕 Detectar campos adicionales (WiFi, LBS, GPS status)
      // Formato 1: Prefijados (UD,...,status_hex,GPS:TD,NET:NO(00),WiFi:...)
      // Formato 2: Posicionales (UD,...,status_hex,count,0,mcc,mnc,lac,cellid,signal,wificount,...)
      
      const isLteOrUd2 = commandType && (commandType.includes('LTE') || commandType === 'UD2');
      const hasPrefixes = !isLteOrUd2 && payloadParts.some(p => 
        p && p.includes(':') && 
        !p.match(/^\d+:\d+$/) && 
        !p.match(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/) // Excluir MAC addresses
      );
      
      if (!hasPrefixes && payloadParts.length > 22) {
        // Usar formato posicional (SmartwatchParser style)
        position.mcc = parseInt(payloadParts[19]) || 0;
        position.mnc = parseInt(payloadParts[20]) || 0;
        position.lac = parseInt(payloadParts[21]) || 0;
        position.cell_id = parseInt(payloadParts[22]) || 0;
        position.signal_strength = parseInt(payloadParts[23]) || 0;
        position.has_lbs = position.cell_id > 0;
        
        const wifiCount = parseInt(payloadParts[26]) || 0;
        if (wifiCount > 0) {
          position.has_wifi = true;
          // Reconstruir wifi_raw para el engine híbrido (mac,signal,ssid,...)
          // UD_LTE: date(0), time(1), valid(2), ..., mcc(18), mnc(19), lac(20), cell(21), ..., wifi_count(26)
          // El primer WiFi empieza en el índice 27.
          position.wifi_raw = payloadParts.slice(27).join(',');
          position.location_type = 'WiFi';
          position.positionType = 'WiFi';
        } else if (position.has_lbs) {
          position.location_type = 'TD';
          position.positionType = 'LBS';
        }
      } else {
        // Seguir con el formato de prefijos
        while (idx < payloadParts.length) {
          const part = payloadParts[idx];
          
          if (part && part.startsWith('GPS:')) {
            const gpsStatus = part.split(':')[1];
            position.gps_status = gpsStatus;
            if (gpsStatus === 'TD' || gpsStatus === 'NO') {
              position.location_type = 'TD';
              position.positionType = 'LBS';
            }
          }
          
          if (part && part.startsWith('NET:')) {
            position.net_status = part.split(':')[1];
          }
          
          if (part && part.startsWith('WiFi:')) {
            const wifiData = part.substring(5);
            position.wifi_raw = wifiData;
            position.has_wifi = true;
            if (position.location_type === 'TD' && wifiData.length > 10) {
              position.location_type = 'WiFi';
              position.positionType = 'WiFi';
            }
          }
          
          if (part && part.startsWith('LBS:')) {
            position.lbs_raw = part.substring(4);
            position.has_lbs = true;
          }
          
          idx++;
        }
      }

      return position;
    } catch (error) {
      console.error('❌ Error parseando UD:', error);
      return { type: 'UD', imei: imei };
    }
  }

  /**
   * Parse mensaje UD2 (Suplementos de datos de puntos ciegos)
   */
  static parseUD2Message(imei, payloadParts, commandType = 'UD2') {
    const ud = this.parseUDMessage(imei, payloadParts, commandType);
    ud.type = 'UD2';
    return ud;
  }

  /**
   * Parse mensaje AL (Alarma)
   * Formato: [CS*IMEI*LEN*AL,date,time,status,lat,N/S,lng,E/W,...]
   */
  static parseALMessage(imei, payloadParts, commandType = 'AL') {
    try {
      const alarm = this.parseUDMessage(imei, payloadParts, commandType);
      alarm.type = 'AL';
      return alarm;
    } catch (error) {
      console.error('❌ Error parseando AL:', error);
      return { type: 'AL', imei: imei };
    }
  }

  /**
   * Parse mensaje CONFIG
   * Formato: [CS*IMEI*LEN*CONFIG,TY:value,UL:value,...]
   */
  static parseConfigMessage(imei, payloadParts) {
    const config = {
      type: 'CONFIG',
      imei: imei,
      parameters: {}
    };

    for (let i = 1; i < payloadParts.length; i++) {
      const param = payloadParts[i];
      if (param.includes(':')) {
        const [key, value] = param.split(':');
        config.parameters[key.toLowerCase()] = value;
      }
    }

    return config;
  }

  /**
   * Parse mensaje BPHRT (Presión arterial y frecuencia cardíaca)
   * Formato: [CS*IMEI*LEN*bphrt,systolic,diastolic,heart_rate,height,gender,age,weight]
   */
  static parseBPHRTMessage(imei, payloadParts) {
    const health = {
      type: 'bphrt',
      imei: imei,
      timestamp: new Date()
    };

    if (payloadParts.length > 1) health.systolic = parseInt(payloadParts[1]) || 0;
    if (payloadParts.length > 2) health.diastolic = parseInt(payloadParts[2]) || 0;
    if (payloadParts.length > 3) health.heartRate = parseInt(payloadParts[3]) || 0;
    if (payloadParts.length > 4) health.height = parseInt(payloadParts[4]) || 0;
    if (payloadParts.length > 5) health.gender = parseInt(payloadParts[5]) || 0; // 1=M, 2=F
    if (payloadParts.length > 6) health.age = parseInt(payloadParts[6]) || 0;
    if (payloadParts.length > 7) health.weight = parseInt(payloadParts[7]) || 0;

    return health;
  }

  /**
   * Parse mensaje SPO2 (Oxígeno)
   * Formato: [CS*IMEI*LEN*oxygeno,type,spo2_value]
   */
  static parseOxygenMessage(imei, payloadParts) {
    return {
      type: 'SPO2',
      imei: imei,
      measurementType: parseInt(payloadParts[1]) || 0, // 0=manual
      spo2: parseInt(payloadParts[2]) || 0,
      timestamp: new Date()
    };
  }

  /**
   * Parse mensaje HT (Health Total / Combined)
   * Formato común: [CS*IMEI*LEN*HT,hr,bp_sys,bp_dia,spo2,temp]
   */
  static parseHTMessage(imei, payloadParts) {
    const healthData = {
      type: 'HT',
      imei: imei,
      heartRate: parseInt(payloadParts[1]) || 0,
      systolic: parseInt(payloadParts[2]) || 0,
      diastolic: parseInt(payloadParts[3]) || 0,
      spo2: parseInt(payloadParts[4]) || 0,
      temperature: parseFloat(payloadParts[5]) || 0,
      timestamp: new Date()
    };
    return healthData;
  }

  /**
   * Parse mensajes de salud genéricos (HR, BP, BT)
   */
  static parseHealthGeneric(imei, type, payloadParts) {
    // Inhibit empty or ACK BT messages (e.g., BT,1) from being processed as health data
    if (type === 'BTEMP2' && payloadParts.length > 1) {
      // Intentar leer de índice 2 (formato status,val) o índice 1 (formato val)
      const val2 = parseFloat(payloadParts[2]);
      const val1 = parseFloat(payloadParts[1]);
      const val = !isNaN(val2) && val2 > 1 ? val2 : val1;
      
      if (isNaN(val) || val <= 1 || val > 50) return null;
    } else if (type === 'BT' && payloadParts.length > 1) {
      const val = parseFloat(payloadParts[1]);
      if (isNaN(val) || val <= 1 || val > 50) return null;
    }
    
    if ((type === 'BT' || type === 'BTEMP2') && payloadParts.length <= 1) {
      return { type: 'IGNORE_ECHO', imei };
    }

    const data = {
      type: type === 'BTEMP2' ? 'BT' : type,
      imei: imei,
      timestamp: new Date()
    };

    if (type === 'HR') data.heartRate = parseInt(payloadParts[1]) || 0;
    if (type === 'BP') {
      data.systolic = parseInt(payloadParts[1]) || 0;
      data.diastolic = parseInt(payloadParts[2]) || 0;
    }
    if (type === 'BT') data.temperature = parseFloat(payloadParts[1]) || 0;
    if (type === 'BTEMP2') {
      const val2 = parseFloat(payloadParts[2]);
      const val1 = parseFloat(payloadParts[1]);
      data.temperature = (!isNaN(val2) && val2 > 1) ? val2 : (val1 || 0);
    }

    return data;
  }

  /**
   * Parse mensaje TK (Voz/Chat)
   */
  static parseTKMessage(imei, payloadParts) {
    return {
      type: 'TK',
      imei: imei,
      command: payloadParts[0],
      audioData: payloadParts.slice(1).join(','),
      timestamp: new Date()
    };
  }

  /**
   * Parse mensaje PP (Toque para agregar amigo)
   */
  static parsePPMessage(imei, payloadParts) {
    const position = this.parseUDMessage(imei, payloadParts);
    position.type = 'PP';
    return position;
  }

  /**
   * Parse mensaje TS (Terminal Status)
   * Formato: [CS*IMEI*LEN*TS,ver:...; ID:...; imei:...; url:...; port:...; upload:...; lk:...; batlevel:...; language:...; defaultlanguage:...; zone:...; profile:...; GPS:...; wifiOpen:...; wifiConnect:...; gprsOpen:...; NET:...]
   */
  static parseTSMessage(imei, payloadParts) {
    const parsed = {
      type: 'TS',
      imei: imei,
      timestamp: new Date(),
      deviceInfo: {}
    };

    // El payload completo está en payloadParts[1...N] después de 'TS'
    // Formato: key:value; key:value; ...
    const fullPayload = payloadParts.slice(1).join(',');

    // Dividir por punto y coma para obtener pares key:value
    const pairs = fullPayload.split(';').map(p => p.trim()).filter(p => p);

    pairs.forEach(pair => {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) return;

      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 1).trim();

      // Mapear los campos importantes
      switch (key.toLowerCase()) {
        case 'ver':
          parsed.deviceInfo.firmware_version = value;
          break;
        case 'id':
          parsed.deviceInfo.device_id = value;
          break;
        case 'imei':
          parsed.deviceInfo.full_imei = value;
          break;
        case 'url':
          parsed.deviceInfo.server_url = value;
          break;
        case 'port':
          parsed.deviceInfo.server_port = parseInt(value) || 0;
          break;
        case 'upload':
          parsed.deviceInfo.upload_interval = parseInt(value) || 0;
          break;
        case 'lk':
          parsed.deviceInfo.heartbeat_interval = parseInt(value) || 0;
          break;
        case 'batlevel':
          parsed.battery = parseInt(value) || 0;
          break;
        case 'language':
          parsed.deviceInfo.language = value;
          break;
        case 'defaultlanguage':
          parsed.deviceInfo.default_language = value;
          break;
        case 'zone':
          parsed.deviceInfo.timezone = value;
          break;
        case 'profile':
          parsed.deviceInfo.profile = parseInt(value) || 0;
          break;
        case 'gps':
          parsed.deviceInfo.gps_status = value;
          break;
        case 'wifiopen':
          parsed.deviceInfo.wifi_enabled = value.toLowerCase() === 'true';
          break;
        case 'wificonnect':
          parsed.deviceInfo.wifi_connected = value.toLowerCase() === 'true';
          break;
        case 'gprsopen':
          parsed.deviceInfo.gprs_enabled = value.toLowerCase() === 'true';
          break;
        case 'net':
          parsed.deviceInfo.network_status = value;
          // Extraer nivel de señal del formato NET:OK(100)
          const signalMatch = value.match(/\((\d+)\)/);
          if (signalMatch) {
            parsed.signal = parseInt(signalMatch[1]) || 0;
          }
          break;
        default:
          // Guardar otros campos no mapeados
          parsed.deviceInfo[key.toLowerCase()] = value;
      }
    });

    return parsed;
  }

  /**
   * Parse mensaje CR (Solicitud de ubicación inmediata)
   * Nota: el servidor puede ENVIAR CR al reloj; algunos firmwares lo "eco"-responden.
   * Cuando llega CR desde el reloj, se acepta sin responder.
   */
  static parseCRMessage(imei, payloadParts) {
    return {
      type: 'CR',
      imei: imei,
      timestamp: new Date()
    };
  }

  /**
   * Decodifica tipo de alarma
   */
  static decodeAlarm(alarmCode) {
    const alarms = {
      sos: false,
      lowBattery: false,
      fallDown: false,
      geofenceIn: false,
      geofenceOut: false,
      powerOff: false,
      vibration: false,
      movement: false
    };

    const code = alarmCode.toUpperCase();

    if (code.includes('SOS')) alarms.sos = true;
    if (code.includes('LOWBAT') || code.includes('LOW_BAT')) alarms.lowBattery = true;
    if (code.includes('FALL') || code.includes('FALLDOWN')) alarms.fallDown = true;
    if (code.includes('GEOIN')) alarms.geofenceIn = true;
    if (code.includes('GEOOUT')) alarms.geofenceOut = true;
    if (code.includes('POWEROFF')) alarms.powerOff = true;
    if (code.includes('VIBR')) alarms.vibration = true;
    if (code.includes('MOVE')) alarms.movement = true;

    return alarms;
  }

  /**
   * Calcula SpO2 estimado basado en frecuencia cardíaca
   */
  static calculateSpO2(heartRate) {
    if (!heartRate || heartRate < 40 || heartRate > 200) return 95;

    // Fórmula estimada: SpO2 normal entre 95-100%
    // Si HR está muy alto o bajo, puede indicar menor oxigenación
    if (heartRate > 100) {
      return Math.max(92, 100 - Math.floor((heartRate - 100) / 10));
    } else if (heartRate < 60) {
      return Math.max(93, 100 - Math.floor((60 - heartRate) / 5));
    }

    return 97; // Normal
  }

  /**
   * Parse coordenadas
   */
  static parseCoordinate(value, hemisphere, isLng = false) {
    if (!value) return 0;

    const coord = parseFloat(value);
    if (isNaN(coord)) return 0;

    let decimal = 0;

    // Heurística: Si el valor es muy grande, es NMEA (DDMM.MMMM)
    // Lat > 90 o Lon > 180 DEBE ser NMEA (porque Decimal no puede exceder esos limites)
    // Ejemplo NMEA para 6 deg: 600.0. Decimal: 6.0.
    // Ejemplo NMEA para 75 deg: 7500.0. Decimal: 75.0.
    // Umbral seguro: 180 (para cubrir ambos).
    // Si es UD_LTE, a menudo envían Decimal directo.

    if (Math.abs(coord) > 180) {
      // Formato NMEA: DDMM.MMMM
      const degrees = Math.floor(coord / 100);
      const minutes = coord - (degrees * 100);
      decimal = degrees + (minutes / 60);
    } else {
      // Formato Decimal Directo
      decimal = coord;
    }

    // Aplicar hemisferio
    if (hemisphere === 'S' || hemisphere === 'W') {
      decimal = -Math.abs(decimal); // Asegurar negativo
    } else {
      decimal = Math.abs(decimal);
    }

    return decimal;
  }

  /**
   * Parse fecha y hora
   */
  static parseDateTime(date, time) {
    try {
      // Formato: DDMMYY, HHMMSS
      const day = date.substring(0, 2);
      const month = date.substring(2, 4);
      const year = '20' + date.substring(4, 6);

      const hour = time.substring(0, 2);
      const minute = time.substring(2, 4);
      const second = time.substring(4, 6);

      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
    } catch (error) {
      return new Date();
    }
  }

  /**
   * Parse datos WiFi
   */
  static parseWiFiData(wifiParts) {
    const networks = [];
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

    for (let i = 0; i < wifiParts.length; i += 3) {
      const chunk = wifiParts.slice(i, i + 3);
      if (chunk.length === 0) continue;

      let mac = '';
      let signal = -70; // Default reasonable signal
      let ssid = '';

      // Identificación inteligente de campos por contenido (soporta SSID,MAC,SIGNAL y MAC,SIGNAL,SSID)
      chunk.forEach(part => {
        if (!part) return;
        
        if (macRegex.test(part)) {
          mac = part;
        } else if (part.match(/^-?\d+$/)) {
          signal = parseInt(part);
        } else {
          ssid = part;
        }
      });

      if (mac) {
        networks.push({ mac, signal, ssid });
      }
    }

    return networks;
  }

  /**
   * Calcula la longitud en hexadecimal con 4 dígitos
   * Ejemplo: 162 bytes = 00A2 en hex
   *
   * ⚠️ CRÍTICO: Esta función se usa para calcular LEN correctamente.
   * El dispositivo rechaza respuestas con LEN incorrecto.
   */
  static calculateHexLength(content) {
    const length = content.length;
    return length.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Genera respuesta para el dispositivo en formato Beesure
   * Formato: [3G*IMEI*HEX_LEN*RESPONSE]
   *
   * ⚠️ REGLA DE ORO DEL LK:
   * - Si recibe: [3G*8800000015*000D*LK,50,100,100]
   * - Debes responder: [3G*8800000015*0002*LK]
   * - NO reutilices el LEN recibido (000D)
   * - LK siempre tiene longitud 2 → hex(2) = 0002
   *
   * Dispositivo rechaza respuestas con LEN incorrecto.
   */
  static generateCommandResponse(imei, command) {
    // Extraer los últimos 10 dígitos del IMEI si es necesario
    const imei10 = imei.slice(-10);

    let responseContent = '';
    switch (command.toUpperCase()) {
      case 'LK':
        // ✅ SIEMPRE responder solo "LK" → longitud 2 → 0002
        responseContent = 'LK';
        break;
      case 'BT':
      case 'RYIMEI':
      case 'CR':
      case 'DW':
      case 'FIND':
      case 'HRTSTART':
      case 'ANYTIME':
      case 'MONITOR':
      case 'FALLDET':
      case 'IP':
      case 'UPLOAD':
      case 'RESET':
      case 'POWEROFF':
      case 'FACTORY':
      case 'CALLLOG':
      case 'DEVICEFUNCCOUNT':
      case 'ICCID':
      case 'RYIMEI':
      case 'APPCONTACTTEL':
        return null; // Evitar bucles de eco
      case 'UD':
      case 'UD_WCDMA':
      case 'UD_LTE':
        responseContent = 'UD';
        break;
      case 'UD2':
        responseContent = 'UD2';
        break;
      case 'AL':
      case 'AL_LTE':
        responseContent = 'AL';
        break;
      case 'CONFIG':
        responseContent = 'CONFIG,1'; // 1=OK, 0=Fail
        break;
      case 'BPHRT':
        responseContent = 'bphrt';
        break;
      case 'OXYGENO':
        responseContent = 'oxygeno,1'; // 1=normal, 0=abnormal, 2=error
        break;
      case 'TK':
        responseContent = 'TK,1'; // 1=success, 0=fail
        break;
      case 'TKQ':
        responseContent = 'TKQ';
        break;
      case 'TKQ2':
        responseContent = 'TKQ2';
        break;
      case 'PP':
        responseContent = imei10; // Responder con el IMEI si amigo agregado
        break;
      case 'TS':
        responseContent = 'TS'; // Dispositivo responderá con información
        break;
      case 'UNKNOWN':
        return null;
      default:
        responseContent = command;
    }

    // Calcular longitud en hexadecimal
    const hexLength = this.calculateHexLength(responseContent);

    // Construir respuesta completa
    return `[3G*${imei10}*${hexLength}*${responseContent}]`;
  }

  /**
   * Genera comando para enviar al dispositivo
   * Formato: [CS*IMEI*HEX_LEN*COMMAND]
   */
  static generateCommand(imei, command, params = {}) {
    const imei10 = imei.slice(-10);
    let commandContent = command;

    // Agregar parámetros específicos según el tipo de comando
    switch (command) {
      case 'IP':
        // Cambiar servidor IP y puerto
        // Formato: IP,IP_ADDRESS,PORT
        commandContent = `IP,${params.ip},${params.port}`;
        break;
      case 'UPLOAD':
        // Configurar intervalo de tiempo
        commandContent = `UPLOAD,${params.interval || 600}`;
        break;
      case 'PW':
        // Configurar contraseña de control
        commandContent = `PW,${params.password}`;
        break;
      case 'CALL':
        // Llamada saliente
        commandContent = `CALL,${params.phone}`;
        break;
      case 'CENTER':
        // Configurar número central
        commandContent = `CENTER,${params.phone}`;
        break;
      case 'SOS1':
      case 'SOS2':
      case 'SOS3':
        commandContent = `${command},${params.phone}`;
        break;
      case 'SOS':
        // Configurar 3 números SOS
        commandContent = `SOS,${params.phone1},${params.phone2},${params.phone3}`;
        break;
      case 'LZ':
        // Idioma y zona horaria
        commandContent = `LZ,${params.language},${params.timezone}`;
        break;
      case 'CR':
        // Solicitar ubicación inmediata
        commandContent = 'CR';
        break;
      case 'DW':
        // Demand Where - alternativa a CR según firmware
        commandContent = 'DW';
        break;
      case 'MONITOR':
        // Escucha remota (rellamada silenciosa)
        commandContent = `MONITOR,${params.phone}`;
        break;
      case 'ANYTIME':
        // Activación de monitoreo de salud continuo
        commandContent = `ANYTIME,${params.value || 1}`;
        break;
      case 'FALLDET':
        // Configurar detección de caída: FALLDET,enable(0/1),sensitivity(1-8)
        const enable = params.enable !== undefined ? params.enable : 1;
        const sensitivity = params.sensitivity || 3;
        commandContent = `FALLDET,${enable},${sensitivity}`;
        break;
      case 'RESET':
        // Reiniciar dispositivo
        commandContent = 'RESET';
        break;
      case 'FACTORY':
        // Restaurar a fábrica
        commandContent = 'FACTORY';
        break;
      case 'POWEROFF':
        // Apagar dispositivo
        commandContent = 'POWEROFF';
        break;
      case 'FIND':
        // Buscar dispositivo
        commandContent = 'FIND';
        break;
      case 'HR':
      case 'BP':
      case 'SPO2':
      case 'BT':
      case 'BTEMP2':
      case 'btemp2':
      case 'HT':
      case 'ht':
      case 'hrtstart':
      case 'HEALTHAUTOSET':
        // Para comandos de salud, si no se especifica value, por defecto usamos 1 (medición inmediata)
        const val = params.value !== undefined ? params.value : 1;
        commandContent = `${command},${val}`;
        break;
    }

    const hexLength = this.calculateHexLength(commandContent);
    return `[3G*${imei10}*${hexLength}*${commandContent}]`;
  }

  /**
   * Calcula precisión de la posición
   */
  static calculateAccuracy(position) {
    if (position.positionType === 'GPS' && position.satellites >= 6) {
      return 'HIGH'; // < 10m
    } else if (position.positionType === 'GPS' && position.satellites >= 4) {
      return 'MEDIUM'; // 10-50m
    } else if (position.positionType === 'WIFI') {
      return 'MEDIUM'; // 20-100m
    } else if (position.positionType === 'LBS') {
      return 'LOW'; // 100-1000m
    }
    return 'UNKNOWN';
  }

  /**
   * Decodifica alarmas desde campo hexadecimal
   * Formato: 8 dígitos hex, cada bit representa una alarma
   * 
   * SOPORTA DOS VARIANTES DE SOS:
   * - Bit 0 (0x00000001): SOS estándar (mayoría de dispositivos)
   * - Bit 16 (0x00010000): SOS alternativo (algunos modelos 4P Touch)
   */
  static decodeAlarmHex(hexString) {
    const alarms = {
      sos: false,
      lowBattery: false,
      fallDown: false,
      geofenceIn: false,
      geofenceOut: false,
      powerOff: false,
      powerOn: false,
      takeOff: false,
      vibration: false,
      movement: false
    };

    if (!hexString || hexString === '00000000') {
      return alarms;
    }

    try {
      const value = parseInt(hexString, 16);

      // SOS: Soporta AMBOS patrones (bit 0 estándar O bit 16 alternativo)
      if ((value & 0x00000001) || (value & 0x00010000)) {
        alarms.sos = true;           // Bit 0 O Bit 16: SOS
      }
      
      if (value & 0x00000002) alarms.lowBattery = true;    // Bit 1: Batería baja
      if (value & 0x00200000) alarms.fallDown = true;      // Bit 21: Caída
      if (value & 0x00000010) alarms.geofenceIn = true;    // Bit 4: Entrada geocerca
      if (value & 0x00000020) alarms.geofenceOut = true;   // Bit 5: Salida geocerca
      if (value & 0x00000100) alarms.powerOff = true;      // Bit 8: Apagado
      if (value & 0x00000200) alarms.powerOn = true;       // Bit 9: Encendido
      if (value & 0x00001000) alarms.takeOff = true;       // Bit 12: Se quitó el reloj
      if (value & 0x00000040) alarms.vibration = true;     // Bit 6: Vibración
      if (value & 0x00000080) alarms.movement = true;      // Bit 7: Movimiento

    } catch (error) {
      console.error('[PARSER] Error decodificando alarma hex:', error);
    }

    return alarms;
  }

  /**
   * Obtiene el tipo principal de alarma para mostrar
   */
  static getMainAlarmType(alarms) {
    if (alarms.sos) return 'SOS';
    if (alarms.fallDown) return 'FALL_DOWN';
    if (alarms.lowBattery) return 'LOW_BATTERY';
    if (alarms.geofenceIn) return 'GEOFENCE_IN';
    if (alarms.geofenceOut) return 'GEOFENCE_OUT';
    if (alarms.powerOff) return 'POWER_OFF';
    if (alarms.powerOn) return 'POWER_ON';
    if (alarms.takeOff) return 'TAKE_OFF';
    return 'OTHER';
  }
}

module.exports = ProtocolParser;
