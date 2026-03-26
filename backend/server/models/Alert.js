const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const Device = require('./Device');

const Alert = sequelize.define('Alert', {
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
  alert_type: {
    type: DataTypes.ENUM(
      'SOS',
      'LOW_BATTERY',
      'FALL_DOWN',
      'GEOFENCE_IN',
      'GEOFENCE_OUT',
      'POWER_OFF',
      'POWER_ON',
      'TAKE_OFF',
      'OTHER'
    ),
    allowNull: false,
    comment: 'Tipo de alerta'
  },
  severity: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false,
    defaultValue: 'MEDIUM',
    comment: 'Severidad de la alerta'
  },
  alert_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Hora en que ocurrió la alerta'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Latitud donde ocurrió la alerta'
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Longitud donde ocurrió la alerta'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Dirección geocodificada'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensaje descriptivo de la alerta'
  },
  battery_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Nivel de batería al momento de la alerta'
  },
  acknowledged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si la alerta fue reconocida por un operador'
  },
  acknowledged_by: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Usuario que reconoció la alerta'
  },
  acknowledged_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Hora en que fue reconocida'
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si la alerta fue resuelta'
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Hora en que fue resuelta'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas sobre la alerta'
  },
  raw_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Datos crudos del mensaje de alerta'
  }
}, {
  tableName: 'alerts',
  indexes: [
    { fields: ['device_id'] },
    { fields: ['alert_type'] },
    { fields: ['alert_time'] },
    { fields: ['severity'] },
    { fields: ['acknowledged'] },
    { fields: ['resolved'] },
    { fields: ['device_id', 'alert_time'] }
  ]
});

// Relación con Device
Alert.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Device.hasMany(Alert, { foreignKey: 'device_id', as: 'alerts' });

module.exports = Alert;
