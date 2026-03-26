const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/database');

const DeviceGeofenceStatus = sequelize.define('DeviceGeofenceStatus', {
  device_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  geofence_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'geofences',
      key: 'id'
    }
  },
  is_inside: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_check: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  last_event_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'geofence_events',
      key: 'id'
    }
  }
}, {
  tableName: 'device_geofence_status',
  timestamps: false
});

module.exports = DeviceGeofenceStatus;
