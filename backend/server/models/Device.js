const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  imei: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'IMEI único del dispositivo'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nombre descriptivo del dispositivo'
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Número de teléfono de la SIM'
  },
  model: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: '4P Touch',
    comment: 'Modelo del dispositivo'
  },
  firmware_version: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Versión del firmware'
  },
  battery_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100,
    comment: 'Nivel de batería (0-100)'
  },
  signal_strength: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Intensidad de señal de red (0-100)'
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Idioma configurado en el dispositivo'
  },
  device_info: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Información adicional del dispositivo (firmware, URLs, intervalos, etc.)',
    defaultValue: {}
  },
  is_online: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Estado de conexión actual'
  },
  last_connection: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que se conectó'
  },
  last_heartbeat: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Último heartbeat (LK) recibido'
  },
  last_latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Última latitud conocida del dispositivo'
  },
  last_longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Última longitud conocida del dispositivo'
  },
  steps_today: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Pasos del día actual'
  },
  steps_total: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Pasos totales acumulados'
  },
  
  // Relaciones con usuarios y organizaciones
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Usuario al que está asignado el dispositivo',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organización a la que pertenece el dispositivo',
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  
  // Datos del usuario
  user_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nombre del usuario del reloj'
  },
  user_age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Edad del usuario'
  },
  user_gender: {
    type: DataTypes.ENUM('1', '2'), // 1=masculino, 2=femenino
    allowNull: true,
    comment: '1=masculino, 2=femenino'
  },
  user_height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Altura en cm'
  },
  user_weight: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Peso en kg'
  },
  
  // Configuración
  walktime_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Configuración de horarios de caminata',
    defaultValue: []
  },
  sos_numbers: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Números de emergencia SOS',
    defaultValue: []
  },
  geofence: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Configuración de geocercas',
    defaultValue: null
  },
  
  // Metadatos
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas adicionales sobre el dispositivo'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si el dispositivo está activo en el sistema'
  }
}, {
  tableName: 'devices',
  indexes: [
    { fields: ['imei'], unique: true },
    { fields: ['is_online'] },
    { fields: ['phone_number'] },
    { fields: ['last_connection'] },
    { fields: ['user_id'] },
    { fields: ['organization_id'] }
  ]
});

module.exports = Device;
