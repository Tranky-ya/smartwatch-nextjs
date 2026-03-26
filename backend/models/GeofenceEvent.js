const { DataTypes } = require('sequelize');
const { sequelize } = require('../server/database');

const GeofenceEvent = sequelize.define('GeofenceEvent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  geofence_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'geofences',
      key: 'id'
    }
  },
  event_type: {
    type: DataTypes.ENUM('ENTER', 'EXIT'),
    allowNull: false
  },
  event_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7)
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7)
  },
  notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'geofence_events',
  timestamps: false
});

module.exports = GeofenceEvent;
