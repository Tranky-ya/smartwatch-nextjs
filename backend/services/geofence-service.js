const { QueryTypes } = require('sequelize');
const { sequelize } = require('../server/database');
const GeofenceEvent = require('../models/GeofenceEvent');
const DeviceGeofenceStatus = require('../models/DeviceGeofenceStatus');

class GeofenceService {
  /**
   * Verifica geocercas cuando llega una nueva posición
   */
  async checkGeofences(device, latitude, longitude) {
    try {
      // 1. Obtener todas las geocercas activas
      const geofences = await sequelize.query(
        'SELECT * FROM geofences WHERE is_active = true',
        { type: QueryTypes.SELECT }
      );

      for (const geofence of geofences) {
        await this.processGeofence(device, geofence, latitude, longitude);
      }
    } catch (error) {
      console.error('[GEOFENCE] Error verificando geocercas:', error);
    }
  }

  /**
   * Procesa una geocerca específica
   */
  async processGeofence(device, geofence, lat, lng) {
    try {
      // 2. Verificar si el dispositivo está dentro
      const isInside = this.isPointInGeofence(lat, lng, geofence);

      // 3. Obtener estado anterior
      const [status] = await sequelize.query(
        'SELECT * FROM device_geofence_status WHERE device_id = $1 AND geofence_id = $2',
        { 
          bind: [device.id, geofence.id],
          type: QueryTypes.SELECT 
        }
      );

      const wasInside = status ? status.is_inside : false;

      // 4. Detectar cambio de estado
      if (isInside !== wasInside) {
        const eventType = isInside ? 'ENTER' : 'EXIT';
        
        // Solo generar evento si la geocerca tiene alertas habilitadas
        if ((eventType === 'ENTER' && geofence.alert_on_enter) ||
            (eventType === 'EXIT' && geofence.alert_on_exit)) {
          
          await this.createGeofenceEvent(
            device.id,
            geofence.id,
            geofence.name,
            eventType,
            lat,
            lng
          );
        }

        // 5. Actualizar estado
        await this.updateStatus(device.id, geofence.id, isInside);
      } else {
        // Solo actualizar timestamp
        await sequelize.query(
          'UPDATE device_geofence_status SET last_check = NOW() WHERE device_id = $1 AND geofence_id = $2',
          { bind: [device.id, geofence.id] }
        );
      }
    } catch (error) {
      console.error(`[GEOFENCE] Error procesando geocerca ${geofence.name}:`, error);
    }
  }

  /**
   * Verifica si un punto está dentro de una geocerca
   */
  isPointInGeofence(lat, lng, geofence) {
    if (geofence.type === 'circle') {
      return this.isPointInCircle(lat, lng, geofence.coordinates);
    } else if (geofence.type === 'polygon') {
      return this.isPointInPolygon(lat, lng, geofence.coordinates);
    }
    return false;
  }

  /**
   * Verifica si un punto está dentro de un círculo
   */
  isPointInCircle(lat, lng, coordinates) {
    const centerLat = coordinates.center?.lat || coordinates.latitude;
    const centerLng = coordinates.center?.lng || coordinates.longitude;
    const radius = coordinates.radius;

    // Fórmula de Haversine para calcular distancia
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRad(lat - centerLat);
    const dLng = this.toRad(lng - centerLng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(centerLat)) * Math.cos(this.toRad(lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radius;
  }

  /**
   * Verifica si un punto está dentro de un polígono (Ray Casting)
   */
  isPointInPolygon(lat, lng, coordinates) {
    const points = coordinates.points || [];
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].lat, yi = points[i].lng;
      const xj = points[j].lat, yj = points[j].lng;

      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Crea un evento de geocerca
   */
  async createGeofenceEvent(deviceId, geofenceId, geofenceName, eventType, lat, lng) {
    try {
      const event = await sequelize.query(
        `INSERT INTO geofence_events 
         (device_id, geofence_id, event_type, event_time, latitude, longitude, notified) 
         VALUES ($1, $2, $3, NOW(), $4, $5, false) 
         RETURNING id`,
        {
          bind: [deviceId, geofenceId, eventType, lat, lng],
          type: QueryTypes.INSERT
        }
      );

      const eventId = event[0][0].id;

      console.log(`🚨 [GEOFENCE] ${eventType} - Dispositivo ${deviceId} ${eventType === 'ENTER' ? 'entró a' : 'salió de'} "${geofenceName}"`);
      console.log(`   📍 Posición: ${lat}, ${lng}`);
      console.log(`   🆔 Evento ID: ${eventId}`);
      // Enviar notificaciones
        const notificationService = require('./notification-service');
      notificationService.notifyGeofenceEvent(eventId).catch(err => {
        console.error('[GEOFENCE] Error enviando notificaciones:', err);
      });

      return eventId;
    } catch (error) {
      console.error('[GEOFENCE] Error creando evento:', error);
      return null;
    }
  }

  /**
   * Actualiza el estado de geocerca del dispositivo
   */
  async updateStatus(deviceId, geofenceId, isInside, eventId = null) {
    try {
      await sequelize.query(
        `INSERT INTO device_geofence_status (device_id, geofence_id, is_inside, last_check, last_event_id)
         VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT (device_id, geofence_id) 
         DO UPDATE SET is_inside = $3, last_check = NOW(), last_event_id = $4`,
        { bind: [deviceId, geofenceId, isInside, eventId] }
      );
    } catch (error) {
      console.error('[GEOFENCE] Error actualizando estado:', error);
    }
  }

  /**
   * Convierte grados a radianes
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new GeofenceService();
