const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Geofence = sequelize.define('Geofence', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'ID de la organización'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID del usuario al que está asignada la geocerca'
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    comment: 'Nombre de la geocerca'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descripción de la geocerca'
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'circle',
    comment: 'Tipo de geocerca (circle, polygon, etc.)'
  },
  coordinates: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    comment: 'Coordenadas/propiedades de la geocerca'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  alert_on_enter: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  alert_on_exit: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'geofences',
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['user_id'] },
    { fields: ['is_active'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Geofence;
