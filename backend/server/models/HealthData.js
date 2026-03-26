const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const Device = require('./Device');

const HealthData = sequelize.define('HealthData', {
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
  measurement_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Hora de la medición'
  },
  // Presión arterial
  systolic_pressure: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Presión sistólica (alta), 0=inválido'
  },
  diastolic_pressure: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Presión diastólica (baja), 0=inválido'
  },
  // Ritmo cardíaco
  heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Ritmo cardíaco en BPM, 0=inválido'
  },
  // SpO2 (calculado con algoritmo)
  spo2: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Saturación de oxígeno en % (calculado)'
  },
  temperature: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Temperatura corporal en °C'
  },
  // Datos del usuario al momento de la medición
  user_height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Altura en cm'
  },
  user_gender: {
    type: DataTypes.ENUM('1', '2'),
    allowNull: true,
    comment: '1=masculino, 2=femenino'
  },
  user_age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Edad del usuario'
  },
  user_weight: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Peso en kg'
  },
  // Indicadores de calidad
  measurement_quality: {
    type: DataTypes.ENUM('GOOD', 'FAIR', 'POOR'),
    allowNull: true,
    comment: 'Calidad de la medición'
  },
  // Metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas sobre la medición'
  },
  raw_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Datos crudos del mensaje'
  }
}, {
  tableName: 'health_data',
  indexes: [
    { fields: ['device_id'] },
    { fields: ['measurement_time'] },
    { fields: ['device_id', 'measurement_time'] }
  ]
});

// Relación con Device
HealthData.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Device.hasMany(HealthData, { foreignKey: 'device_id', as: 'health_data' });

module.exports = HealthData;
