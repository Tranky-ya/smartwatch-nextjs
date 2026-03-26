const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

// Test de conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
};

// Sincronizar modelos (crear tablas)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log(`✅ Base de datos sincronizada ${force ? '(FORCE - tablas recreadas)' : ''}`);
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};
