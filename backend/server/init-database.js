require('dotenv').config();
const { sequelize, testConnection, syncDatabase } = require('./database');

/**
 * Script para inicializar la base de datos
 * Ejecutar con: npm run init-db
 */
async function initDatabase() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     Inicialización de Base de Datos PostgreSQL        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📡 Probando conexión a PostgreSQL...');
    const connected = await testConnection();

    if (!connected) {
      console.error('\n❌ No se pudo conectar a PostgreSQL');
      console.log('\nVerifica:');
      console.log('1. PostgreSQL está corriendo');
      console.log('2. Las credenciales en .env son correctas');
      console.log('3. La base de datos existe');
      process.exit(1);
    }

    console.log('\n¿Desea recrear las tablas? (esto BORRARÁ todos los datos)');
    console.log('Escribe "yes" para confirmar, cualquier otra cosa para solo sincronizar:\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('> ', async (answer) => {
      const force = answer.toLowerCase() === 'yes';

      if (force) {
        console.log('\n⚠️  RECREANDO tablas (todos los datos serán eliminados)...');
      } else {
        console.log('\n✅ Sincronizando tablas (sin borrar datos)...');
      }

      await syncDatabase(force);

      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║            ✅ BASE DE DATOS INICIALIZADA              ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      console.log('Tablas creadas:');
      console.log('  ✓ devices          - Dispositivos (smartwatches)');
      console.log('  ✓ positions        - Historial de posiciones GPS/LBS');
      console.log('  ✓ alerts           - Alertas y alarmas');
      console.log('  ✓ health_data      - Datos de salud (HR, BP, SpO2)');
      console.log('\nPuedes iniciar la aplicación con: npm start\n');

      await sequelize.close();
      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
}

initDatabase();
