const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'organizations',
  indexes: [
    { fields: ['name'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Organization;
