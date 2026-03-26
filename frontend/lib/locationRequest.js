const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const solicitarUbicacionActual = async (imei) => {
  console.log('=============================================================');
  console.log('[SOLICITUD UBICACION] Iniciando...');
  console.log('IMEI:', imei);
  console.log('Hora:', new Date().toLocaleString('es-CO'));
  console.log('=============================================================');

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay sesion activa');
    }

    console.log('\n[PASO 1] Obteniendo ubicacion ANTES de solicitar...');
    const ubicacionAntes = await obtenerUltimaUbicacion(imei, token);
    if (ubicacionAntes) {
      console.log('   Tipo anterior:', ubicacionAntes.location_type || 'DESCONOCIDO');
      console.log('   Precision anterior:', ubicacionAntes.accuracy || '?', 'm');
      console.log('   Timestamp:', new Date(ubicacionAntes.server_time).toLocaleString('es-CO'));
    }

    console.log('\n[PASO 2] Enviando comando TCP al reloj...');
    const response = await fetch(API_URL + '/api/location/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ imei: imei, force: false })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'HTTP ' + response.status);
    }

    const result = await response.json();
    console.log('   Comando enviado:', result.command || 'CR/DW');
    console.log('   Estado:', result.success ? 'Enviado' : 'Fallo');

    if (result.success) {
      console.log('\n[PASO 3] Esperando respuesta del reloj (max 30s)...');
      return await esperarNuevaUbicacion(imei, token, ubicacionAntes, 30000);
    }

    if (result.reason === 'cooldown') {
      console.log('\n[COOLDOWN] Debe esperar', result.waitSeconds, 'segundos');
      return {
        success: false,
        reason: 'cooldown',
        message: 'Espera ' + result.waitSeconds + 's antes de solicitar nuevamente',
        waitSeconds: result.waitSeconds
      };
    }

    if (result.reason === 'offline') {
      console.log('\n[OFFLINE] El dispositivo esta desconectado');
      return {
        success: false,
        reason: 'offline',
        message: 'El dispositivo esta desconectado'
      };
    }

    console.log('\n[ERROR]', result.message);
    return {
      success: false,
      reason: 'error',
      message: result.message || 'Error desconocido'
    };

  } catch (error) {
    console.error('\n[ERROR FATAL]', error);
    return {
      success: false,
      reason: 'error',
      message: error.message || 'Error de conexion'
    };
  }
};

const esperarNuevaUbicacion = async (imei, token, ultimaUbicacionAntes, timeout) => {
  const startTime = Date.now();
  let intentos = 0;

  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      intentos++;
      const elapsed = Date.now() - startTime;

      console.log('   Intento', intentos, '- Esperando... (' + Math.round(elapsed / 1000) + 's / 30s)');

      if (elapsed > timeout) {
        clearInterval(checkInterval);
        console.log('\n[TIMEOUT] El dispositivo no respondio en 30 segundos');
        console.log('=============================================================\n');
        resolve({
          success: false,
          reason: 'timeout',
          message: 'El dispositivo no respondio en 30 segundos',
          timeout: true
        });
        return;
      }

      const ultimaUbicacionAhora = await obtenerUltimaUbicacion(imei, token);

      if (esUbicacionNueva(ultimaUbicacionAntes, ultimaUbicacionAhora)) {
        clearInterval(checkInterval);

        console.log('\n[EXITO] Nueva ubicacion recibida!');
        console.log('-------------------------------------------------------------');
        console.log('TIPO DE UBICACION:', ultimaUbicacionAhora.location_type);
        console.log('-------------------------------------------------------------');

        if (ultimaUbicacionAhora.location_type === 'GPS') {
          console.log('GPS - Alta precision');
          console.log('   Satelites:', ultimaUbicacionAhora.satellites);
          console.log('   Precision:', ultimaUbicacionAhora.accuracy, 'm');
          console.log('   Confianza: 95%');
        } else if (ultimaUbicacionAhora.location_type === 'WiFi') {
          console.log('WiFi - Buena precision');
          console.log('   Precision:', ultimaUbicacionAhora.accuracy, 'm');
          console.log('   Confianza: 80%');
        } else if (ultimaUbicacionAhora.location_type === 'LBS') {
          console.log('Torre Celular (LBS) - Baja precision');
          console.log('   Precision:', ultimaUbicacionAhora.accuracy, 'm');
          console.log('   Confianza: 30%');
        } else if (ultimaUbicacionAhora.location_type === 'GPS_WEAK') {
          console.log('GPS Debil - Precision media');
          console.log('   Satelites:', ultimaUbicacionAhora.satellites);
          console.log('   Precision:', ultimaUbicacionAhora.accuracy, 'm');
          console.log('   Confianza: 60-70%');
        }

        console.log('-------------------------------------------------------------');
        console.log('Coordenadas:');
        console.log('   Latitud:', ultimaUbicacionAhora.latitude);
        console.log('   Longitud:', ultimaUbicacionAhora.longitude);
        console.log('   Timestamp:', new Date(ultimaUbicacionAhora.server_time).toLocaleString('es-CO'));
        console.log('-------------------------------------------------------------');
        console.log('Tiempo de respuesta:', Math.round(elapsed / 1000), 'segundos');
        console.log('=============================================================\n');

        resolve({
          success: true,
          location: ultimaUbicacionAhora,
          responseTime: elapsed,
          message: 'Ubicacion actualizada correctamente'
        });
      }
    }, 2000);
  });
};

const obtenerUltimaUbicacion = async (imei, token) => {
  try {
    const response = await fetch(API_URL + '/api/positions/latest/' + imei, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo ubicacion:', error);
    return null;
  }
};

const esUbicacionNueva = (anterior, nueva) => {
  if (!anterior || !nueva) return false;

  const timeAnterior = new Date(anterior.server_time || anterior.device_time).getTime();
  const timeNueva = new Date(nueva.server_time || nueva.device_time).getTime();

  return timeNueva > timeAnterior;
};
