const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const Device = require('./Device');

const DailySteps = sequelize.define('DailySteps', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha del registro (YYYY-MM-DD)'
  },
  steps: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de pasos en este día'
  },
  steps_total_at_end: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Contador total del reloj al final del día'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'daily_steps',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['device_id', 'date'], unique: true },
    { fields: ['device_id'] },
    { fields: ['date'] }
  ]
});

// Relación con Device
DailySteps.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Device.hasMany(DailySteps, { foreignKey: 'device_id', as: 'daily_steps' });

module.exports = DailySteps;
