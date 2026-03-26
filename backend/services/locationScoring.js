// Sistema de scoring de calidad de ubicación GPS

function haversineDistance(coord1, coord2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const toRad = x => x * Math.PI / 180;

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function scoreLocation(location, previousLocation = null) {
  let score = 0;
  const now = Date.now();

  // 1. Tipo de ubicación (40 puntos)
  const locType = (location.location_type || '').toUpperCase();
  if (locType === 'GPS' || locType === 'G') {
    score += 40;
  } else if (locType === 'WIFI' || locType === 'W') {
    score += 25;
  } else if (locType === 'LBS' || locType === 'L') {
    score += 10;
  } else {
    score += 5; // Desconocido
  }

  // 2. Precisión (20 puntos)
  if (location.accuracy) {
    const acc = parseFloat(location.accuracy);
    if (acc < 20) score += 20;
    else if (acc < 50) score += 15;
    else if (acc < 100) score += 10;
    else if (acc < 200) score += 5;
  }

  // 3. Edad de la ubicación (10 puntos)
  if (location.server_time) {
    const age = (now - new Date(location.server_time).getTime()) / 1000;
    if (age < 15) score += 10;
    else if (age < 30) score += 7;
    else if (age < 60) score += 4;
  }

  // 4. Número de satélites (10 puntos)
  if (location.satellites) {
    const sats = parseInt(location.satellites);
    if (sats >= 8) score += 10;
    else if (sats >= 5) score += 7;
    else if (sats >= 3) score += 4;
  }

  // 5. Comparación con ubicación anterior (20 puntos)
  if (previousLocation) {
    try {
      const distance = haversineDistance(
        { latitude: previousLocation.last_latitude, longitude: previousLocation.last_longitude },
        { latitude: location.latitude, longitude: location.longitude }
      );

      // Distancia razonable
      if (distance < 100) score += 15; // Muy cerca (probablemente válido)
      else if (distance < 500) score += 10; // Cerca
      else if (distance < 2000) score += 5; // Distancia media
      else if (distance > 5000) score -= 20; // Salto irreal (muy lejos muy rápido)

      // Velocidad implícita
      if (previousLocation.last_update_time) {
        const timeDiff = (new Date(location.server_time) - new Date(previousLocation.last_update_time)) / 1000;
        if (timeDiff > 0) {
          const speed = (distance / timeDiff) * 3.6; // km/h
          if (speed < 120) score += 5; // Velocidad razonable
          else score -= 10; // Velocidad imposible
        }
      }
    } catch (err) {
      console.error('[SCORING] Error calculando distancia:', err.message);
    }
  }

  return Math.max(0, Math.min(100, score));
}

function getLocationQuality(score) {
  if (score >= 80) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'poor';
  return 'bad';
}

module.exports = {
  scoreLocation,
  getLocationQuality,
  haversineDistance
};
