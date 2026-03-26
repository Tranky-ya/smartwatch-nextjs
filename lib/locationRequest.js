/**
 * ----------------------------------------------------------------------------
 * SERVICIO: Solicitar Ubicación Actual (Estilo Beesure GPS) - CON LOGS
 * ----------------------------------------------------------------------------
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Solicitar ubicación actual al dispositivo
 */
export const solicitarUbicacionActual = async (imei) => {
  console.log('-----------------------------------------------------------');
  console.log('?? [SOLICITUD UBICACIÓN] Iniciando...');
  console.log('?? IMEI:', imei);
  console.log('?? Hora:', new Date().toLocaleString('es-CO'));
  console.log('-----------------------------------------------------------');

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay sesión activa');
    }

    // PASO 1: Obtener ubicación ANTES de solicitar
    console.log('\n?? [PASO 1] Obteniendo ubicación ANTES de solicitar...');
    const ubicacionAntes = await obtenerUltimaUbicacion(imei, token);
    if (ubicacionAntes) {
      console.log('   +- Tipo anterior:', ubicacionAntes.location_type || 'DESCONOCIDO');
      console.log('   +- Precisión anterior:', ubicacionAntes.accuracy || '?', 'm');
      console.log('   +- Coordenadas:', {
        lat: ubicacionAntes.latitude,
        lng: ubicacionAntes.longitude
      });
      console.log('   +- Timestamp:', new Date(ubicacionAntes.server_time).toLocaleString('es-CO'));
    } else {
      console.log('   +- ?? No hay ubicación previa');
    }

    // PASO 2: Enviar comando TCP
    console.log('\n?? [PASO 2] Enviando comando TCP al reloj...');
    const response = await fetch(`${API_URL}/api/location/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imei, force: false })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('   +- Comando enviado:', result.command || 'CR/DW');
    console.log('   +- Estado:', result.success ? '? Enviado' : '? Falló');

    // CASO 1: Comando enviado exitosamente
    if (result.success) {
      console.log('\n? [PASO 3] Esperando respuesta del reloj (máx 30s)...');
      return await esperarNuevaUbicacion(imei, token, 30000);
    }

    // CASO 2: En cooldown
    if (result.reason === 'cooldown') {
      console.log('\n? [COOLDOWN] Debe esperar', result.waitSeconds, 'segundos');
      return {
        success: false,
        reason: 'cooldown',
        message: `Espera ${result.waitSeconds}s antes de solicitar nuevamente`,
        waitSeconds: result.waitSeconds
      };
    }

    // CASO 3: Dispositivo offline
    if (result.reason === 'offline') {
      console.log('\n?? [OFFLINE] El dispositivo está desconectado');
      return {
        success: false,
        reason: 'offline',
        message: 'El dispositivo está desconectado'
      };
    }

    // CASO 4: Otro error
    console.log('\n? [ERROR]', result.message);
    return {
      success: false,
      reason: 'error',
      message: result.message || 'Error desconocido'
    };

  } catch (error) {
    console.error('\n? [ERROR FATAL]', error);
    return {
      success: false,
      reason: 'error',
      message: error.message || 'Error de conexión'
    };
  }
};

/**
 * Esperar a que llegue una nueva ubicación
 */
const esperarNuevaUbicacion = async (imei, token, timeout = 30000) => {
  const startTime = Date.now();
  const ultimaUbicacionAntes = await obtenerUltimaUbicacion(imei, token);
  let intentos = 0;

  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      intentos++;
      const elapsed = Date.now() - startTime;

      console.log(`   ? Intento ${intentos} - Esperando... (${Math.round(elapsed / 1000)}s / 30s)`);

      // TIMEOUT
      if (elapsed > timeout) {
        clearInterval(checkInterval);
        console.log('\n?? [TIMEOUT] El dispositivo no respondió en 30 segundos');
        console.log('-----------------------------------------------------------\n');
        resolve({
          success: false,
          reason: 'timeout',
          message: 'El dispositivo no respondió en 30 segundos',
          timeout: true
        });
        return;
      }

      // Verificar nueva ubicación
      const ultimaUbicacionAhora = await obtenerUltimaUbicacion(imei, token);

      if (esUbicacionNueva(ultimaUbicacionAntes, ultimaUbicacionAhora)) {
        clearInterval(checkInterval);

        console.log('\n? [ÉXITO] Nueva ubicación recibida!');
        console.log('-----------------------------------------------------------');
        console.log('?? TIPO DE UBICACIÓN:', ultimaUbicacionAhora.location_type);
        console.log('-----------------------------------------------------------');

        // Mostrar detalles según el tipo
        if (ultimaUbicacionAhora.location_type === 'GPS') {
          console.log('??? GPS - Alta precisión');
          console.log('   +- Satélites:', ultimaUbicacionAhora.satellites);
          console.log('   +- Precisión:', ultimaUbicacionAhora.accuracy, 'm (~10m)');
          console.log('   +- Confianza: 95%');
        } else if (ultimaUbicacionAhora.location_type === 'WiFi') {
          console.log('?? WiFi - Buena precisión');
          console.log('   +- Redes WiFi detectadas: 2+');
          console.log('   +- Precisión:', ultimaUbicacionAhora.accuracy, 'm (~30m)');
          console.log('   +- Confianza: 80%');
        } else if (ultimaUbicacionAhora.location_type === 'LBS') {
          console.log('?? Torre Celular (LBS) - Baja precisión');
          console.log('   +- Torre celular triangulación');
          console.log('   +- Precisión:', ultimaUbicacionAhora.accuracy, 'm (~500m)');
          console.log('   +- Confianza: 30%');
        } else if (ultimaUbicacionAhora.location_type === 'GPS_WEAK') {
          console.log('????? GPS Débil - Precisión media');
          console.log('   +- Satélites:', ultimaUbicacionAhora.satellites, '(1-3)');
          console.log('   +- Precisión:', ultimaUbicacionAhora.accuracy, 'm (~30m)');
          console.log('   +- Confianza: 60-70%');
        } else {
          console.log('? Tipo desconocido:', ultimaUbicacionAhora.location_type);
        }

        console.log('-----------------------------------------------------------');
        console.log('?? Coordenadas:');
        console.log('   +- Latitud:', ultimaUbicacionAhora.latitude);
        console.log('   +- Longitud:', ultimaUbicacionAhora.longitude);
        console.log('   +- Timestamp:', new Date(ultimaUbicacionAhora.server_time).toLocaleString('es-CO'));
        console.log('-----------------------------------------------------------');
        console.log('?? Tiempo de respuesta:', Math.round(elapsed / 1000), 'segundos');
        console.log('-----------------------------------------------------------\n');

        resolve({
          success: true,
          location: ultimaUbicacionAhora,
          responseTime: elapsed,
          message: 'Ubicación actualizada correctamente'
        });
      }
    }, 2000); // Verificar cada 2 segundos
  });
};

/**
 * Obtener última ubicación del dispositivo
 */
const obtenerUltimaUbicacion = async (imei, token) => {
  try {
    const response = await fetch(`${API_URL}/api/positions/latest/${imei}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('? Error obteniendo ubicación:', error);
    return null;
  }
};

/**
 * Verificar si una ubicación es nueva
 */
const esUbicacionNueva = (anterior, nueva) => {
  if (!anterior || !nueva) return false;

  const timeAnterior = new Date(anterior.server_time || anterior.device_time).getTime();
  const timeNueva = new Date(nueva.server_time || nueva.device_time).getTime();

  return timeNueva > timeAnterior;
};