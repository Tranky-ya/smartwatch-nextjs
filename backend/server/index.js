require('dotenv').config();

const bcrypt = require('bcryptjs');

const TCPServer = require('./tcp-server');
const APIServer = require('./api-server');
const { syncDatabase } = require('./database');
const { Organization, User } = require('./models');
const ActiveLocationService = require('../services/active-location-service');

/**
 * Aplicación principal con TCP, API REST y WebSocket
 */
class SmartwatchAdminApp {
  constructor() {
    this.apiServer = new APIServer();
    this.tcpServer = new TCPServer();
    this.activeLocationService = null; // Se inicializa después del TCP
  }

  async start() {
    try {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║   🏥 Sistema de Administración de Smartwatches 4P     ║');
      console.log('║     Backend con TCP/IP + API REST + WebSocket         ║');
      console.log('║            Desarrollado para Telvoz                    ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      // Sincronizar base de datos
      console.log('📦 Inicializando base de datos...');
      await syncDatabase(false);
      await this.ensureDefaultAdmin();
      console.log('✅ Base de datos lista\n');

      // Iniciar API REST + WebSocket
      console.log('🚀 Iniciando API REST + WebSocket...');
      await this.apiServer.start();

      // Obtener el WebSocketServer del APIServer
      const websocketServer = this.apiServer.getWebSocketServer();

      // Vincular WebSocket al TCP Server
      this.tcpServer.setWebSocketServer(websocketServer);

      // Vincular TCP Server al API Server
      this.apiServer.setTCPServer(this.tcpServer);

      // Iniciar servidor TCP
      console.log('🚀 Iniciando servidor TCP...');
      await this.tcpServer.start();

      // ✨ NUEVO: Iniciar servicio de localización activa (tipo Beesure)
      console.log('📍 Iniciando servicio de localización activa...');
      this.activeLocationService = new ActiveLocationService(this.tcpServer);
      this.apiServer.setActiveLocationService(this.activeLocationService);
      this.tcpServer.setActiveLocationService(this.activeLocationService);
      console.log('✅ Servicio de localización activa iniciado\n');

      // Configurar eventos
      this.setupTCPEvents();

      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║                ✅ SISTEMA INICIADO                     ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
      
      console.log('📡 Configuración de dispositivos:');
      console.log(`   IP del servidor: ${this.getLocalIP()}`);
      console.log(`   Puerto TCP: ${process.env.TCP_SERVER_PORT || 7070}`);
      console.log(`   Puerto API: ${process.env.API_SERVER_PORT || 3001}\n`);

      console.log('🌐 URLs de acceso:');
      console.log(`   Frontend Next.js: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`   API REST: http://localhost:${process.env.API_SERVER_PORT || 3001}/api`);
      console.log(`   WebSocket: ws://localhost:${process.env.API_SERVER_PORT || 3001}\n`);

    } catch (error) {
      console.error('❌ Error iniciando aplicación:', error);
      process.exit(1);
    }
  }

  async ensureDefaultAdmin() {
    const defaultOrgId = process.env.DEFAULT_ORG_ID || 'e5998eca-315a-44c6-a352-90d22380c5e8';
    const defaultOrgName = process.env.DEFAULT_ORG_NAME || 'Telvoz';
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@telvoz.com';
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Barcelona537';

    // Crear organización por defecto (si no existe)
    const [org] = await Organization.findOrCreate({
      where: { id: defaultOrgId },
      defaults: { id: defaultOrgId, name: defaultOrgName, is_active: true }
    });

    // Crear usuario admin por defecto (si no existe)
    const existingUser = await User.findOne({ where: { email: defaultAdminEmail } });
    if (existingUser) return;

    const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);
    await User.create({
      organization_id: org.id,
      email: defaultAdminEmail,
      password_hash: passwordHash,
      full_name: 'Administrador',
      role: 'admin',
      is_active: true
    });

    console.log(`✅ Usuario admin por defecto creado: ${defaultAdminEmail}`);
  }

  setupTCPEvents() {
    const websocketServer = this.apiServer.getWebSocketServer();

    this.tcpServer.on('message', ({ device, parsed }) => {
      // Los eventos ya se emiten desde el TCP server
      // Aquí podrías agregar lógica adicional si es necesario
    });

    this.tcpServer.on('critical-alert', ({ device, alert }) => {
      console.log(`\n🚨 ¡ALERTA CRÍTICA! ${alert.alert_type} - Dispositivo: ${device.name || device.imei}`);
      
      // El WebSocket ya emitió la alerta, aquí podrías:
      // - Enviar SMS
      // - Enviar email
      // - Llamar webhook externo
      // - Etc.
    });
  }

  getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    
    return 'localhost';
  }

  stop() {
    console.log('\n🛑 Deteniendo aplicación...');
    this.tcpServer.stop();
    this.apiServer.getWebSocketServer().close();
    process.exit(0);
  }
}

// Iniciar aplicación
if (require.main === module) {
  const app = new SmartwatchAdminApp();
  app.start();

  // Manejo de señales de terminación
  process.on('SIGINT', () => {
    app.stop();
  });

  process.on('SIGTERM', () => {
    app.stop();
  });

  // Manejo de errores no capturados
  process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
  });
}

module.exports = SmartwatchAdminApp;
