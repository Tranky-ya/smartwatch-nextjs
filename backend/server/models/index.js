const Device = require('./Device');
const Position = require('./Position');
const Alert = require('./Alert');
const HealthData = require('./HealthData');
const Organization = require('./Organization');
const User = require('./User');
const Geofence = require('./Geofence');
const DailySteps = require('./DailySteps');

// ============================================
// ASOCIACIONES / RELACIONES
// ============================================

// Organization -> User
Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization -> Geofence
Organization.hasMany(Geofence, { foreignKey: 'organization_id', as: 'geofences' });
Geofence.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization -> Device
Organization.hasMany(Device, { foreignKey: 'organization_id', as: 'devices' });
Device.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// User -> Geofence (geocerca asignada a usuario)
User.hasMany(Geofence, { foreignKey: 'user_id', as: 'geofences' });
Geofence.belongsTo(User, { foreignKey: 'user_id', as: 'assigned_user' });

// User -> Device (dispositivo asignado a usuario)
User.hasMany(Device, { foreignKey: 'user_id', as: 'devices' });
Device.belongsTo(User, { foreignKey: 'user_id', as: 'assigned_user' });

// Exportar todos los modelos
module.exports = {
  Device,
  Position,
  Alert,
  HealthData,
  Organization,
  User,
  Geofence,
  DailySteps
};
