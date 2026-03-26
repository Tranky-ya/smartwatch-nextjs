const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const Device = require('./Device');

const Position = sequelize.define('Position', {
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
    },
    comment: 'ID del dispositivo'
  },
  message_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Tipo de mensaje: UD_LTE, AL_LTE, etc.'
  },
  // Datos de tiempo
  device_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Hora del dispositivo (DDMMYY,HHMMSS)'
  },
  server_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Hora de recepción en el servidor'
  },
  // Datos GPS
  gps_valid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    comment: 'true=A (válido), false=V (inválido)'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Latitud decimal'
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    comment: 'Longitud decimal'
  },
  lat_direction: {
    type: DataTypes.CHAR(1),
    allowNull: true,
    comment: 'N o S'
  },
  lon_direction: {
    type: DataTypes.CHAR(1),
    allowNull: true,
    comment: 'E o W'
  },
  speed: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    comment: 'Velocidad en km/h'
  },
  course: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Rumbo en grados'
  },
  altitude: {
    type: DataTypes.DECIMAL(7, 2),
    allowNull: true,
    comment: 'Altitud en metros'
  },
  satellites: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Número de satélites'
  },
  hdop: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Precisión horizontal'
  },
  // Datos LBS (celular)
  mcc: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Mobile Country Code'
  },
  mnc: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Mobile Network Code'
  },
  lac: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Location Area Code'
  },
  cell_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Cell Tower ID'
  },
  // Datos WiFi
  wifi_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array de APs WiFi detectados',
    defaultValue: []
  },
  // Estado del dispositivo
  battery_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Nivel de batería'
  },
  signal_strength: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Fuerza de señal GSM'
  },
  // Alarmas (bit flags)
  alarm_type: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Tipo de alarma hexadecimal'
  },
  alarm_decoded: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Alarmas decodificadas',
    defaultValue: {}
  },
  // Datos completos del mensaje original
  raw_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensaje original completo en ASCII'
  },
  // 🆕 Priorización de ubicación
  location_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Source prioritario: GPS, WiFi, LBS, GPS_WEAK, UNKNOWN',
    defaultValue: 'UNKNOWN'
  },
  accuracy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Precisión estimada en metros',
    defaultValue: 9999
  }
}, {
  tableName: 'positions',
  indexes: [
    { fields: ['device_id'] },
    { fields: ['device_time'] },
    { fields: ['server_time'] },
    { fields: ['gps_valid'] },
    { fields: ['message_type'] },
    { fields: ['device_id', 'device_time'] },
    // Índice geoespacial si usas PostGIS
    // { fields: ['latitude', 'longitude'] }
  ]
});

// Relación con Device
Position.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Device.hasMany(Position, { foreignKey: 'device_id', as: 'positions' });

module.exports = Position;
