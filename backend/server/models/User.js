const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Organización a la que pertenece el usuario'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'admin'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['organization_id'] },
    { fields: ['is_active'] }
  ]
});

module.exports = User;
