const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../database');

// GET /api/geofence-events - Obtener todos los eventos
router.get('/', async (req, res) => {
  try {
    const { device_id, geofence_id, event_type, limit = 50 } = req.query;
    
    let whereClause = '';
    const bindings = [];
    
    if (device_id) {
      whereClause += ' AND ge.device_id = $' + (bindings.length + 1);
      bindings.push(device_id);
    }
    
    if (geofence_id) {
      whereClause += ' AND ge.geofence_id = $' + (bindings.length + 1);
      bindings.push(geofence_id);
    }
    
    if (event_type) {
      whereClause += ' AND ge.event_type = $' + (bindings.length + 1);
      bindings.push(event_type);
    }
    
    bindings.push(limit);
    
    const events = await sequelize.query(`
      SELECT 
        ge.*,
        d.name as device_name,
        d.imei,
        g.name as geofence_name
      FROM geofence_events ge
      JOIN devices d ON ge.device_id = d.id
      JOIN geofences g ON ge.geofence_id = g.id
      WHERE 1=1 ${whereClause}
      ORDER BY ge.event_time DESC
      LIMIT $${bindings.length}
    `, {
      bind: bindings,
      type: QueryTypes.SELECT
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error obteniendo eventos de geocerca:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/geofence-events/:id - Obtener un evento específico
router.get('/:id', async (req, res) => {
  try {
    const [event] = await sequelize.query(`
      SELECT 
        ge.*,
        d.name as device_name,
        d.imei,
        g.name as geofence_name
      FROM geofence_events ge
      JOIN devices d ON ge.device_id = d.id
      JOIN geofences g ON ge.geofence_id = g.id
      WHERE ge.id = $1
    `, {
      bind: [req.params.id],
      type: QueryTypes.SELECT
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error obteniendo evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/geofence-events/:id/notify - Marcar evento como notificado
router.patch('/:id/notify', async (req, res) => {
  try {
    await sequelize.query(`
      UPDATE geofence_events 
      SET notified = true 
      WHERE id = $1
    `, {
      bind: [req.params.id]
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marcando evento:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
