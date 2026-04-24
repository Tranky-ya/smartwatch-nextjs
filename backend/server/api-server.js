const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Device, User, Organization, Geofence, DailySteps } = require('./models');
const { testConnection, sequelize } = require('./database');
const { QueryTypes } = require('sequelize');
const WebSocketServer = require('./websocket-server');
const ProtocolParser = require('./protocol-parser');

const JWT_SECRET = process.env.JWT_SECRET || 'Barcelona537_Colombia_Bellomonte75';

class APIServer {
  constructor(port) {
    this.port = port || 3001;
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.websocketServer = new WebSocketServer(this.httpServer);
    this.tcpServer = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    const frontendUrl = process.env.FRONTEND_URL || 'https://fulltranki.com';
    console.log('\u2713 CORS permitido para:', frontendUrl);
    this.app.use(cors({ origin: frontendUrl, credentials: true }));
    this.app.use(express.json());
    this.app.use((req, res, next) => { console.log(req.method + ' ' + req.path); next(); });
  }

  setupRoutes() {
    this.app.get('/api/health', (req, res) => { res.json({ status: 'ok', timestamp: new Date() }); });

    // ============================================
    // RUTAS PÚBLICAS (sin autenticación)
    // ============================================

    // GET - Listar todos los dispositivos (público para dashboard)
    this.app.get('/api/public/devices', async (req, res) => {
      try {
        const { online, limit = 100 } = req.query;

        let whereClause = {};

        // Filtro por estado online si se especifica
        if (online !== undefined) {
          whereClause.is_online = online === 'true';
        }

        const devices = await Device.findAll({
          where: whereClause,
          include: [{
            model: User,
            as: 'assigned_user',
            attributes: ['id', 'full_name', 'email'],
            required: false
          }],
          limit: parseInt(limit),
          order: [['updated_at', 'DESC']]
        });

        console.log(`📊 [PUBLIC/DEVICES] Encontrados: ${devices.length} dispositivos`);
        res.json(devices);
      } catch (error) {
        console.error('Error listando dispositivos públicos:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Middleware de autenticación
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
      }

      try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
      }
    };


    // Endpoints de ubicación
    this.app.get('/api/positions/latest/:imei', authenticateToken, async (req, res) => {
      try {
        const imei = req.params.imei;
        const query = `SELECT d.*, p.* FROM devices d LEFT JOIN positions p ON p.device_id = d.id WHERE d.imei = '${imei}' ORDER BY p.server_time DESC LIMIT 1`;
        const [result] = await sequelize.query(query, { type: QueryTypes.SELECT });
        if (!result) return res.status(404).json({ error: 'Sin posiciones' });
        res.json(result);
      } catch (e) { console.error('Error:', e); res.status(500).json({ error: e.message }); }
    });

    this.app.post('/api/location/request', authenticateToken, async (req, res) => {
      try {
        const imei = req.body.imei;
        const success = await this.tcpServer.sendCommand(imei, 'CR');
        if (!success) {
          return res.status(404).json({ error: 'Dispositivo offline o no encontrado' });
        }
        res.json({ success: true });
      } catch (e) {
        console.error('Error:', e);
        res.status(500).json({ error: e.message });
      }
    });


    this.app.post('/api/devices/command', authenticateToken, async (req, res) => {
      try {
        const { imei, command, params = {} } = req.body;
        const validation = await this.tcpServer.validateCommandSupport(imei, command);

        if (!validation.ok) {
          return res.status(400).json({
            success: false,
            error: validation.reason,
            protocol: validation.protocol
          });
        }

        const success = await this.tcpServer.sendCommand(imei, command, params);

        if (!success) {
          return res.status(404).json({ error: 'Dispositivo offline o no encontrado' });
        }

        res.json({ success: true, message: `Comando ${command} enviado` });
      } catch (e) {
        console.error('Error comando:', e);
        res.status(500).json({ error: e.message });
      }
    });

    // ⭐ NUEVO: Endpoint para migrar dispositivo a otro servidor
    this.app.post('/api/devices/:imei/change-server', authenticateToken, async (req, res) => {
      try {
        const { imei } = req.params;
        const { ip, port } = req.body;

        if (!ip || !port) {
          return res.status(400).json({
            error: 'Faltan parámetros requeridos: ip y port'
          });
        }

        const success = await this.tcpServer.changeServerIP(imei, ip, port);

        if (!success) {
          return res.status(404).json({
            error: 'Dispositivo offline o no encontrado'
          });
        }

        res.json({
          success: true,
          message: `Comando IP enviado a ${imei}`,
          warning: '⚠️ IMPORTANTE: El dispositivo debe reiniciarse OUTDOORS varias veces para confirmar el cambio de servidor',
          next_steps: [
            '1. El dispositivo se desconectará de este servidor',
            '2. Reiniciar el dispositivo outdoors (donde tenga señal GPS)',
            '3. Repetir el reinicio 2-3 veces si es necesario',
            '4. Verificar conexión en el nuevo servidor',
            '5. Si no conecta después de 6-8 min, enviar SMS: pw,123456,ts#'
          ]
        });
      } catch (e) {
        console.error('[API] Error cambiando servidor:', e);
        res.status(500).json({ error: e.message });
      }
    });


    this.app.get('/api/devices/:imei/location-history', authenticateToken, async (req, res) => {
      try {
        const imei = req.params.imei;

        // Obtener la hora actual en Colombia (GMT-5)
        const now = new Date();
        const colombiaOffsetMs = -5 * 60 * 60 * 1000; // -5 horas en milisegundos
        const colombiaTime = new Date(now.getTime() + colombiaOffsetMs);

        // Calcular inicio del día en Colombia (00:00:00 Colombia)
        const year = colombiaTime.getUTCFullYear();
        const month = colombiaTime.getUTCMonth();
        const day = colombiaTime.getUTCDate();

        // Crear fecha en UTC que representa medianoche en Colombia
        const startOfDayCol = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        // Ajustar a UTC (sumar 5 horas porque Colombia está 5 horas atrás)
        const startOfDayUTC = new Date(startOfDayCol.getTime() - colombiaOffsetMs);

        // Fin del día en Colombia
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000) - 1);

        console.log('[LOCATION-HISTORY] Ruta del día para ' + imei);
        console.log('   Hora actual UTC: ' + now.toISOString());
        console.log('   Hora Colombia: ' + colombiaTime.toISOString());
        console.log('   Inicio día (UTC): ' + startOfDayUTC.toISOString());
        console.log('   Fin día (UTC): ' + endOfDayUTC.toISOString());

        const query = `
          SELECT p.* FROM positions p
          JOIN devices d ON p.device_id = d.id
          WHERE d.imei = '${imei}'
          AND p.server_time >= '${startOfDayUTC.toISOString()}'
          AND p.server_time <= '${endOfDayUTC.toISOString()}'
          ORDER BY p.server_time ASC
        `;

        const positions = await sequelize.query(query, { type: QueryTypes.SELECT });

        console.log('   Puntos encontrados: ' + positions.length);

        res.json({
          count: positions.length,
          locations: positions,
          date: colombiaTime.toISOString().split('T')[0]
        });
      } catch (e) {
        console.error('[LOCATION-HISTORY] Error:', e);
        res.status(500).json({ error: e.message });
      }
    });

    // Middleware de autorización por rol (case-insensitive)
    const authorizeRoles = (...roles) => {
      return (req, res, next) => {
        const userRoleUpper = req.user.role?.toUpperCase();
        const rolesUpper = roles.map(r => r.toUpperCase());

        if (!rolesUpper.includes(userRoleUpper)) {
          return res.status(403).json({
            error: 'No tienes permisos para realizar esta acción',
            requiredRoles: roles,
            yourRole: req.user.role
          });
        }
        next();
      };
    };

    // AUTH
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await User.findOne({
          where: { email },
          include: [{ model: Organization, as: 'organization' }]
        });
        if (!user || !user.is_active) return res.status(401).json({ error: 'Credenciales invalidas' });
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) return res.status(401).json({ error: 'Credenciales invalidas' });
        await user.update({ last_login: new Date() });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, organization_id: user.organization_id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login exitoso', user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, organization_id: user.organization_id }, token });
      } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesion' });
      }
    });

    // ============================================
    // GESTIÓN DE USUARIOS
    // ============================================

    // GET - Listar usuarios (SUPER_ADMIN ve todos, ADMIN ve solo su organización)
    this.app.get('/api/users', authenticateToken, async (req, res) => {
      console.log('=== DEBUG GET /api/users ===');
      console.log('req.user:', req.user);
      console.log('req.user.role:', req.user.role);
      console.log('req.user.role?.toUpperCase():', req.user.role?.toUpperCase());

      try {
        let whereClause = {};
        const userRole = req.user.role?.toUpperCase();

        console.log('userRole después de uppercase:', userRole);
        console.log('Comparación userRole === ADMIN:', userRole === 'ADMIN');

        // Si es ADMIN, solo ve usuarios de su organización
        if (userRole === 'ADMIN') {
          console.log('✅ Usuario es ADMIN, filtrando por organization_id:', req.user.organization_id);
          whereClause.organization_id = req.user.organization_id;
        }
        // Cualquier otro rol no tiene acceso (solo ADMIN puede ver usuarios)
        else {
          console.log('❌ Usuario NO es ADMIN, denegando acceso. Rol:', userRole);
          return res.status(403).json({ error: 'No tienes permisos para ver usuarios' });
        }

        console.log('whereClause:', whereClause);

        const users = await User.findAll({
          where: whereClause,
          include: [{
            model: Organization,
            as: 'organization',
            attributes: ['id', 'name']
          }],
          attributes: { exclude: ['password_hash'] },
          order: [['created_at', 'DESC']]
        });

        res.json(users);
      } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET - Obtener usuarios VIEWER (DEBE IR ANTES de /api/users/:id)
    this.app.get('/api/users/viewers', authenticateToken, async (req, res) => {
      try {
        const userRole = req.user.role?.toUpperCase();
        console.log('✅ [VIEWERS] Solicitado por:', req.user.email, 'Rol:', userRole);

        // Solo ADMIN, MANAGER, OPERATOR pueden ver la lista de VIEWERS
        if (userRole === 'VIEWER') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }

        const users = await User.findAll({
          where: sequelize.where(
            sequelize.fn('UPPER', sequelize.col('role')),
            'VIEWER'
          ),
          attributes: ['id', 'full_name', 'email'],
          order: [['full_name', 'ASC']]
        });

        console.log(`✅ [VIEWERS] Usuarios VIEWER encontrados: ${users.length}`);
        res.json(users);
      } catch (error) {
        console.error('❌ [VIEWERS] Error listando viewers:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET - Ver un usuario específico (SIN AUTENTICACIÓN)
    this.app.get('/api/users/:id', async (req, res) => {
      try {
        console.log('🔍 [DEBUG] GET /api/users/:id iniciado');
        console.log('🔍 [DEBUG] ID solicitado:', req.params.id);

        const user = await User.findByPk(req.params.id, {
          include: [{
            model: Organization,
            as: 'organization',
            attributes: ['id', 'name']
          }],
          attributes: { exclude: ['password_hash'] }
        });

        console.log('🔍 [DEBUG] Usuario encontrado en BD:', user ? 'SÍ' : 'NO');

        if (!user) {
          console.log('❌ [DEBUG] Usuario NO encontrado, devolviendo 404');
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        console.log('✅ [DEBUG] Usuario encontrado, enviando respuesta');
        console.log('✅ [DEBUG] User ID:', user.id);
        console.log('✅ [DEBUG] User email:', user.email);

        res.json(user);
      } catch (error) {
        console.error('❌ [DEBUG] Error en handler:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // POST - Crear usuario
    this.app.post('/api/users', authenticateToken, async (req, res) => {
      try {
        const { email, password, full_name, role, organization_id, phone } = req.body;

        // Validar campos requeridos
        if (!email || !password || !full_name || !role) {
          return res.status(400).json({ error: 'Email, password, full_name y role son requeridos' });
        }

        // ADMIN solo puede crear usuarios de su organización
        let finalOrgId = organization_id;
        if (req.user.role?.toUpperCase() === 'ADMIN') {
          finalOrgId = req.user.organization_id;

          // ADMIN no puede crear SUPER_ADMIN
          if (role === 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'No puedes crear usuarios SUPER_ADMIN' });
          }
        }

        // Si no tiene organization_id, usar el del usuario que crea
        if (!finalOrgId || finalOrgId === '') {
          finalOrgId = req.user.organization_id;
        }

        // Verificar que el email no exista
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(409).json({ error: 'El email ya está registrado' });
        }

        // Hash de password
        const password_hash = await bcrypt.hash(password, 10);

        // Crear usuario
        const newUser = await User.create({
          email,
          password_hash,
          full_name,
          role,
          organization_id: finalOrgId,
          phone,
          is_active: true
        });

        // Obtener usuario con organización
        const userWithOrg = await User.findByPk(newUser.id, {
          include: [{
            model: Organization,
            as: 'organization',
            attributes: ['id', 'name']
          }],
          attributes: { exclude: ['password_hash'] }
        });

        console.log(`✅ Usuario creado: ${email} (${role})`);
        res.status(201).json({
          message: 'Usuario creado correctamente',
          user: userWithOrg
        });
      } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // PUT - Editar usuario
    this.app.put('/api/users/:id', authenticateToken, async (req, res) => {
      try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar permisos
        const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
        const isAdmin = req.user.role === 'ADMIN' && user.organization_id === req.user.organization_id;
        const isSelf = req.user.id === user.id;

        if (!isSuperAdmin && !isAdmin && !isSelf) {
          return res.status(403).json({ error: 'No tienes permisos para editar este usuario' });
        }

        const { email, password, full_name, role, organization_id, phone, is_active } = req.body;

        // Preparar datos a actualizar
        const updateData = {};
        if (email) updateData.email = email;
        if (full_name) updateData.full_name = full_name;
        if (phone !== undefined) updateData.phone = phone;

        // Solo ciertos roles pueden cambiar el rol y organización
        if (isSuperAdmin) {
          if (role) updateData.role = role;
          if (organization_id) updateData.organization_id = organization_id;
          if (is_active !== undefined) updateData.is_active = is_active;
        } else if (isAdmin) {
          // ADMIN no puede cambiar a SUPER_ADMIN
          if (role && role !== 'SUPER_ADMIN') {
            updateData.role = role;
          }
          if (is_active !== undefined) updateData.is_active = is_active;
        }

        // Solo el mismo usuario puede cambiar su password
        if (password && isSelf) {
          updateData.password_hash = await bcrypt.hash(password, 10);
        }

        // Actualizar
        await user.update(updateData);

        // Obtener usuario actualizado con organización
        const updatedUser = await User.findByPk(user.id, {
          include: [{
            model: Organization,
            as: 'organization',
            attributes: ['id', 'name']
          }],
          attributes: { exclude: ['password_hash'] }
        });

        console.log(`✅ Usuario actualizado: ${user.email}`);
        res.json({
          message: 'Usuario actualizado correctamente',
          user: updatedUser
        });
      } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE - Eliminar/Desactivar usuario
    this.app.delete('/api/users/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
      try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // ADMIN solo puede eliminar usuarios de su organización
        if (req.user.role === 'ADMIN' && user.organization_id !== req.user.organization_id) {
          return res.status(403).json({ error: 'No tienes permisos para eliminar este usuario' });
        }

        // No se puede eliminar a sí mismo
        if (req.user.id === user.id) {
          return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        }

        // Desactivar en lugar de eliminar
        await user.update({ is_active: false });

        console.log(`✅ Usuario desactivado: ${user.email}`);
        res.json({
          message: 'Usuario desactivado correctamente',
          user: {
            id: user.id,
            email: user.email,
            is_active: false
          }
        });
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE PERMANENTE - Eliminar usuario físicamente de la BD
    this.app.delete('/api/users/:id/permanent', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
      try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Solo ADMIN puede eliminar permanentemente
        if (req.user.role?.toUpperCase() !== 'ADMIN') {
          return res.status(403).json({ error: 'Solo ADMIN puede eliminar usuarios permanentemente' });
        }

        // No se puede eliminar a sí mismo
        if (req.user.id === user.id) {
          return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const userEmail = user.email;
        const userId = user.id;

        // Eliminar físicamente de la base de datos
        await user.destroy();

        console.log(`🗑️ Usuario eliminado PERMANENTEMENTE: ${userEmail} (${userId})`);
        res.json({
          message: 'Usuario eliminado permanentemente',
          user: {
            id: userId,
            email: userEmail
          }
        });
      } catch (error) {
        console.error('Error eliminando usuario permanentemente:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET - Listar organizaciones (para dropdowns)
    this.app.get('/api/organizations', authenticateToken, async (req, res) => {
      try {
        let whereClause = {};

        // ADMIN solo ve su organización
        if (req.user.role === 'ADMIN') {
          whereClause.id = req.user.organization_id;
        }

        const organizations = await Organization.findAll({
          where: whereClause,
          attributes: ['id', 'name', 'created_at'],
          order: [['name', 'ASC']]
        });

        res.json(organizations);
      } catch (error) {
        console.error('Error listando organizaciones:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // DEVICES
    this.app.post('/api/devices/register', async (req, res) => {
      try {
        const { imei, name, organization_id } = req.body;

        if (!imei) {
          return res.status(400).json({ error: 'IMEI es requerido' });
        }

        const existingDevice = await Device.findOne({ where: { imei } });
        if (existingDevice) {
          return res.status(409).json({ error: 'Dispositivo ya registrado' });
        }

        const device = await Device.create({
          imei,
          name: name || `Device ${imei}`,
          organization_id: organization_id || 'e5998eca-315a-44c6-a352-90d22380c5e8',
          is_online: false,
          battery_level: 100
        });

        console.log(`✅ Dispositivo registrado: ${imei}`);
        res.status(201).json({ message: 'Dispositivo registrado correctamente', device });
      } catch (error) {
        console.error('Error registrando dispositivo:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // PUT - Actualizar dispositivo
    this.app.put('/api/devices/:imei', authenticateToken, async (req, res) => {
      try {
        const { imei } = req.params;
        const { name, user_id } = req.body;

        console.log('📝 [UPDATE DEVICE] IMEI:', imei);
        console.log('📝 [UPDATE DEVICE] Body:', { name, user_id });

        const device = await Device.findOne({ where: { imei } });
        if (!device) {
          return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        // Preparar datos a actualizar
        const updateData = {};
        if (name !== undefined) updateData.name = name;

        // Solo ADMIN puede asignar usuarios
        if (user_id !== undefined && req.user.role?.toUpperCase() === 'ADMIN') {
          // Si user_id es string vacío, convertir a null
          updateData.user_id = user_id === "" ? null : user_id;
        }

        console.log('📝 [UPDATE DEVICE] Update data:', updateData);

        // Actualizar dispositivo
        await device.update(updateData);

        // Obtener dispositivo actualizado con usuario asignado
        const updatedDevice = await Device.findOne({
          where: { imei },
          include: [{
            model: User,
            as: 'assigned_user',
            attributes: ['id', 'full_name', 'email'],
            required: false
          }]
        });

        console.log(`✅ [UPDATE DEVICE] Dispositivo actualizado: ${imei}`);
        res.json({
          message: 'Dispositivo actualizado correctamente',
          device: updatedDevice
        });
      } catch (error) {
        console.error('❌ [UPDATE DEVICE] Error actualizando dispositivo:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/devices', authenticateToken, async (req, res) => {
      try {
        const { online, limit = 100 } = req.query;
        const userRole = req.user.role?.toUpperCase();

        let whereClause = {};

        // Filtro por estado online si se especifica
        if (online !== undefined) {
          whereClause.is_online = online === 'true';
        }

        // VIEWER solo ve dispositivos asignados a él
        if (userRole === 'VIEWER') {
          whereClause.user_id = req.user.id;
          console.log('✅ [DEVICES] VIEWER - Filtrando por user_id:', req.user.id);
        }
        // ADMIN/MANAGER/OPERATOR ven todos los dispositivos de su organización
        else {
          whereClause.organization_id = req.user.organization_id;
          console.log('✅ [DEVICES] Rol privilegiado - Filtrando por organization_id:', whereClause.organization_id);
        }

        const devices = await Device.findAll({
          where: whereClause,
          include: [{
            model: User,
            as: 'assigned_user',
            attributes: ['id', 'full_name', 'email'],
            required: false
          }],
          limit: parseInt(limit),
          order: [['updated_at', 'DESC']]
        });

        console.log(`📊 [DEVICES] Encontrados: ${devices.length} dispositivos para ${req.user.email}`);
        res.json(devices);
      } catch (error) {
        console.error('Error listando dispositivos:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/devices/info/:imei', async (req, res) => {
      try {
        const device = await Device.findOne({ where: { imei: req.params.imei } });
        if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
        res.json(device);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/devices/reset', async (req, res) => {
      try {
        const { imei } = req.body;
        const device = await Device.findOne({ where: { imei } });
        if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
        await device.update({ battery_level: 100, last_latitude: null, last_longitude: null, is_online: false });
        res.json({ success: true, message: 'Dispositivo restablecido correctamente' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Eliminar dispositivo
    this.app.delete('/api/devices/:imei', async (req, res) => {
      try {
        const { imei } = req.params;
        const device = await Device.findOne({ where: { imei } });
        if (!device) {
          return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }
        const deviceId = device.id;
        await sequelize.query('DELETE FROM positions WHERE device_id = $1', { bind: [deviceId] });
        await sequelize.query('DELETE FROM alerts WHERE device_id = $1', { bind: [deviceId] });
        await sequelize.query('DELETE FROM geofence_events WHERE device_id = $1', { bind: [deviceId] });
        await sequelize.query('DELETE FROM health_data WHERE device_id = $1', { bind: [deviceId] });
        await device.destroy();
        console.log(`[API] ✅ Dispositivo eliminado: ${imei} (${deviceId})`);
        res.json({ success: true, message: 'Dispositivo eliminado correctamente' });
      } catch (error) {
        console.error('[API] Error eliminando dispositivo:', error);
        res.status(500).json({ error: 'Error eliminando dispositivo: ' + error.message });
      }
    });

    this.app.get('/api/stats/dashboard', authenticateToken, async (req, res) => {
      try {
        const { device_id, start_date, end_date } = req.query;

        // Calcular rango de fechas
        const endDate = end_date ? new Date(end_date) : new Date();
        const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Obtener dispositivos del usuario
        const userRole = req.user.role?.toUpperCase();
        let userDeviceIds = [];

        if (userRole === 'VIEWER') {
          const userDevices = await Device.findAll({
            where: { user_id: req.user.id },
            attributes: ['id']
          });
          userDeviceIds = userDevices.map(d => d.id);
        } else {
          const orgDevices = await Device.findAll({
            where: { organization_id: req.user.organization_id },
            attributes: ['id']
          });
          userDeviceIds = orgDevices.map(d => d.id);
        }

        if (userDeviceIds.length === 0) {
          return res.json({
            devices: { total: 0, online: 0, offline: 0, lowBattery: 0 },
            alerts: { last24h: { total: 0, critical: 0, high: 0 }, byType: [], recentCritical: [] },
            geofences: { eventsLast24h: 0 },
            activity: { eventsByDay: [] },
            filteredBy: device_id || 'all',
            dateRange: { start: startDate, end: endDate }
          });
        }

        const totalDevices = userDeviceIds.length;
        const onlineDevices = await Device.count({ where: { id: userDeviceIds, is_online: true } });
        const deviceFilter = device_id ? `AND a.device_id = ${parseInt(device_id)}` : `AND a.device_id = ANY(ARRAY[${userDeviceIds.join(',')}])`;
        const deviceFilterGeo = device_id ? `AND ge.device_id = ${parseInt(device_id)}` : `AND ge.device_id = ANY(ARRAY[${userDeviceIds.join(',')}])`;

        const dateFilter = `AND alert_time >= '${startDate.toISOString()}' AND alert_time <= '${endDate.toISOString()}'`;
        const dateFilterGeo = `AND event_time >= '${startDate.toISOString()}' AND event_time <= '${endDate.toISOString()}'`;

        const [criticalAlerts] = await sequelize.query(`SELECT COUNT(*) as count FROM alerts a WHERE severity = 'CRITICAL' ${dateFilter} ${deviceFilter}`, { type: QueryTypes.SELECT });
        const [highAlerts] = await sequelize.query(`SELECT COUNT(*) as count FROM alerts a WHERE severity = 'HIGH' ${dateFilter} ${deviceFilter}`, { type: QueryTypes.SELECT });
        const [totalAlerts] = await sequelize.query(`SELECT COUNT(*) as count FROM alerts a WHERE 1=1 ${dateFilter} ${deviceFilter}`, { type: QueryTypes.SELECT });
        const [geofenceEvents] = await sequelize.query(`SELECT COUNT(*) as count FROM geofence_events ge WHERE 1=1 ${dateFilterGeo} ${deviceFilterGeo}`, { type: QueryTypes.SELECT });
        const alertsByType = await sequelize.query(`SELECT alert_type, COUNT(*) as count FROM alerts a WHERE 1=1 ${dateFilter} ${deviceFilter} GROUP BY alert_type ORDER BY count DESC`, { type: QueryTypes.SELECT });
        const eventsByDay = await sequelize.query(`SELECT DATE(time) as date, COUNT(*) as count FROM (SELECT event_time as time FROM geofence_events ge WHERE 1=1 ${dateFilterGeo} ${deviceFilterGeo} UNION ALL SELECT alert_time as time FROM alerts a WHERE 1=1 ${dateFilter} ${deviceFilter}) combined GROUP BY DATE(time) ORDER BY date ASC`, { type: QueryTypes.SELECT });
        const deviceBatteryFilter = device_id ? `AND id = ${parseInt(device_id)}` : `AND id = ANY(ARRAY[${userDeviceIds.join(',')}])`;
        const [lowBatteryDevices] = await sequelize.query(`SELECT COUNT(*) as count FROM devices WHERE battery_level < 20 AND battery_level > 0 ${deviceBatteryFilter}`, { type: QueryTypes.SELECT });
        const recentCriticalAlerts = await sequelize.query(`SELECT a.*, d.name as device_name, d.imei FROM alerts a JOIN devices d ON a.device_id = d.id WHERE a.severity = 'CRITICAL' ${dateFilter} ${deviceFilter} ORDER BY a.alert_time DESC LIMIT 5`, { type: QueryTypes.SELECT });

        res.json({
          devices: { total: totalDevices, online: onlineDevices, offline: totalDevices - onlineDevices, lowBattery: parseInt(lowBatteryDevices.count) },
          alerts: { last24h: { total: parseInt(totalAlerts.count), critical: parseInt(criticalAlerts.count), high: parseInt(highAlerts.count) }, byType: alertsByType, recentCritical: recentCriticalAlerts },
          geofences: { eventsLast24h: parseInt(geofenceEvents.count) },
          activity: { eventsByDay: eventsByDay },
          filteredBy: device_id || 'all',
          dateRange: { start: startDate, end: endDate }
        });
      } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/stats/health', authenticateToken, async (req, res) => {
      try {
        const { device_id, start_date, end_date } = req.query;

        // Calcular rango de fechas
        const endDate = end_date ? new Date(end_date) : new Date();
        const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Obtener dispositivos del usuario
        const userRole = req.user.role?.toUpperCase();
        let userDeviceIds = [];

        if (userRole === 'VIEWER') {
          const userDevices = await Device.findAll({
            where: { user_id: req.user.id },
            attributes: ['id']
          });
          userDeviceIds = userDevices.map(d => d.id);
        } else {
          const orgDevices = await Device.findAll({
            where: { organization_id: req.user.organization_id },
            attributes: ['id']
          });
          userDeviceIds = orgDevices.map(d => d.id);
        }

        if (userDeviceIds.length === 0) {
          return res.json({
            heartRate: [],
            bloodPressure: [],
            spo2: [],
            batteryTrend: [],
            summary: { avgHeartRate: null, minHeartRate: null, maxHeartRate: null, avgSystolic: null, avgDiastolic: null, avgSpo2: null, minSpo2: null },
            filteredBy: device_id || 'all',
            dateRange: { start: startDate, end: endDate }
          });
        }

        const deviceFilterDirect = device_id ? `AND device_id = ${parseInt(device_id)}` : `AND device_id = ANY(ARRAY[${userDeviceIds.join(',')}])`;
        const batteryFilter = device_id ? `AND id = ${parseInt(device_id)}` : `AND id = ANY(ARRAY[${userDeviceIds.join(',')}])`;

        const dateFilterHealth = `AND measurement_time >= '${startDate.toISOString()}' AND measurement_time <= '${endDate.toISOString()}'`;
        const dateFilterBattery = `AND last_heartbeat >= '${startDate.toISOString()}' AND last_heartbeat <= '${endDate.toISOString()}'`;

        const heartRate = await sequelize.query(`SELECT TO_CHAR(measurement_time, 'YYYY-MM-DD HH24:MI') as time, AVG(heart_rate) as heart_rate FROM health_data WHERE heart_rate > 0 ${dateFilterHealth} ${deviceFilterDirect} GROUP BY TO_CHAR(measurement_time, 'YYYY-MM-DD HH24:MI') ORDER BY time ASC`, { type: QueryTypes.SELECT });
        const bloodPressure = await sequelize.query(`SELECT TO_CHAR(measurement_time, 'YYYY-MM-DD HH24:MI') as time, AVG(systolic_pressure) as systolic_pressure, AVG(diastolic_pressure) as diastolic_pressure FROM health_data WHERE systolic_pressure > 0 ${dateFilterHealth} ${deviceFilterDirect} GROUP BY TO_CHAR(measurement_time, 'YYYY-MM-DD HH24:MI') ORDER BY time ASC`, { type: QueryTypes.SELECT });
        const spo2 = await sequelize.query(`SELECT TO_CHAR(measurement_time, 'YYYY-MM-DD HH24:MI') as time, AVG(spo2) as spo2 FROM health_data WHERE spo2 > 0 ${dateFilterHealth} ${deviceFilterDirect} GROUP BY TO_CHAR(measurement_time, 'YYYY-MM-DD HH24:MI') ORDER BY time ASC`, { type: QueryTypes.SELECT });
        const batteryTrend = await sequelize.query(`SELECT DATE(last_heartbeat) as date, AVG(battery_level) as avg_battery FROM devices WHERE battery_level > 0 ${dateFilterBattery} ${batteryFilter} GROUP BY DATE(last_heartbeat) ORDER BY date ASC`, { type: QueryTypes.SELECT });
        const [healthSummary] = await sequelize.query(`SELECT ROUND(AVG(heart_rate)) as avgHeartRate, MIN(heart_rate) as minHeartRate, MAX(heart_rate) as maxHeartRate, ROUND(AVG(systolic_pressure)) as avgSystolic, ROUND(AVG(diastolic_pressure)) as avgDiastolic, ROUND(AVG(spo2)) as avgSpo2, MIN(spo2) as minSpo2 FROM health_data WHERE 1=1 ${dateFilterHealth} ${deviceFilterDirect}`, { type: QueryTypes.SELECT });

        res.json({
          heartRate: heartRate.map(row => ({ time: row.time, heart_rate: Math.round(parseFloat(row.heart_rate)) })),
          bloodPressure: bloodPressure.map(row => ({ time: row.time, systolic_pressure: Math.round(parseFloat(row.systolic_pressure)), diastolic_pressure: Math.round(parseFloat(row.diastolic_pressure)) })),
          spo2: spo2.map(row => ({ time: row.time, spo2: Math.round(parseFloat(row.spo2)) })),
          batteryTrend: batteryTrend.map(row => ({ date: row.date, avg_battery: Math.round(parseFloat(row.avg_battery)) })),
          summary: { avgHeartRate: healthSummary.avgheartrate, minHeartRate: healthSummary.minheartrate, maxHeartRate: healthSummary.maxheartrate, avgSystolic: healthSummary.avgsystolic, avgDiastolic: healthSummary.avgdiastolic, avgSpo2: healthSummary.avgspo2, minSpo2: healthSummary.minspo2 },
          filteredBy: device_id || 'all',
          dateRange: { start: startDate, end: endDate }
        });
      } catch (error) {
        console.error('Error obteniendo estadísticas de salud:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Histórico de pasos diarios
    this.app.get('/api/stats/daily-steps', authenticateToken, async (req, res) => {
      try {
        const { device_id, days = 30 } = req.query;

        // Obtener dispositivos del usuario
        const userRole = req.user.role?.toUpperCase();
        let userDeviceIds = [];

        if (userRole === 'VIEWER') {
          const userDevices = await Device.findAll({
            where: { user_id: req.user.id },
            attributes: ['id', 'imei']
          });
          userDeviceIds = userDevices.map(d => d.id);
        } else {
          const orgDevices = await Device.findAll({
            where: { organization_id: req.user.organization_id },
            attributes: ['id', 'imei']
          });
          userDeviceIds = orgDevices.map(d => d.id);
        }

        if (userDeviceIds.length === 0) {
          return res.json([]);
        }

        const whereClause = { device_id: userDeviceIds };

        if (device_id) {
          const device = await Device.findOne({
            where: {
              imei: device_id,
              id: userDeviceIds // Asegurarse que el dispositivo pertenece al usuario
            }
          });
          if (device) {
            whereClause.device_id = device.id;
          } else {
            return res.json([]); // Dispositivo no pertenece al usuario
          }
        }

        // Obtener histórico de pasos de los últimos N días
        const dailySteps = await DailySteps.findAll({
          where: whereClause,
          include: [{
            model: Device,
            as: 'device',
            attributes: ['id', 'name', 'imei']
          }],
          order: [['date', 'DESC']],
          limit: parseInt(days)
        });

        // Agrupar por dispositivo si no hay filtro
        const result = {};
        dailySteps.forEach(record => {
          const deviceKey = record.device.imei;
          if (!result[deviceKey]) {
            result[deviceKey] = {
              device_name: record.device.name,
              device_imei: record.device.imei,
              data: []
            };
          }
          result[deviceKey].data.push({
            date: record.date,
            steps: record.steps,
            steps_total: record.steps_total_at_end
          });
        });

        // Si hay filtro de dispositivo, devolver solo ese
        if (device_id) {
          const deviceData = Object.values(result)[0];
          res.json(deviceData ? deviceData.data.reverse() : []);
        } else {
          res.json(result);
        }
      } catch (error) {
        console.error('Error obteniendo histórico de pasos:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GEOCERCAS
    this.app.get('/api/geofences', authenticateToken, async (req, res) => {
      try {
        console.log('🔍 [GEOFENCES] Usuario:', req.user.email, 'Rol:', req.user.role);

        const { organization_id } = req.query;
        const userRole = req.user.role?.toUpperCase();

        let whereClause = {};

        // VIEWER solo ve geocercas asignadas ESPECÍFICAMENTE a él
        if (userRole === 'VIEWER') {
          whereClause.user_id = req.user.id;
          console.log('✅ [GEOFENCES] VIEWER - Filtrando por user_id:', req.user.id);
        }
        // ADMIN, MANAGER, OPERATOR ven todas las geocercas de su organización
        else {
          whereClause.organization_id = req.user.organization_id;

          // Si hay filtro de organización específica (solo ADMIN)
          if (organization_id && userRole === 'ADMIN') {
            whereClause.organization_id = organization_id;
          }

          console.log('✅ [GEOFENCES] Rol privilegiado - Filtrando por organization_id:', whereClause.organization_id);
        }

        const geofences = await Geofence.findAll({
          where: whereClause,
          include: [{
            model: User,
            as: 'assigned_user',
            attributes: ['id', 'full_name', 'email'],
            required: false
          }],
          order: [['created_at', 'DESC']]
        });

        console.log(`📊 [GEOFENCES] Encontradas: ${geofences.length} geocercas`);

        const transformed = geofences.map(f => {
          const g = f.toJSON();
          const coords = g.coordinates || {};
          return {
            ...g,
            fence_type: g.type,
            center_lat: coords.latitude,
            center_lng: coords.longitude,
            radius_meters: coords.radius || 500,
            assigned_user_name: g.assigned_user?.full_name || null,
            assigned_user_email: g.assigned_user?.email || null
          };
        });

        res.json(transformed);
      } catch (error) {
        console.error('❌ [GEOFENCES] Error listando geocercas:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/geofences', authenticateToken, async (req, res) => {
      try {
        const { organization_id, name, description, center_lat, center_lng, radius_meters, user_id } = req.body;
        const userRole = req.user.role?.toUpperCase();

        const coordinates = { latitude: center_lat, longitude: center_lng, radius: radius_meters || 500 };

        let finalUserId = null;
        let finalOrgId = organization_id || req.user.organization_id;

        // VIEWER: La geocerca se asigna automáticamente a sí mismo
        if (userRole === 'VIEWER') {
          finalUserId = req.user.id;
        }
        // ADMIN/MANAGER/OPERATOR: Pueden asignar a un usuario específico
        else {
          finalUserId = user_id || null;
        }

        const geofence = await Geofence.create({
          organization_id: finalOrgId,
          user_id: finalUserId,
          name,
          description,
          type: 'circle',
          coordinates,
          is_active: true,
          alert_on_enter: true,
          alert_on_exit: true
        });

        console.log(`✅ Geocerca creada: ${name} (asignada a usuario: ${finalUserId || 'ninguno'})`);
        res.json({ success: true, geofence: geofence.toJSON() });
      } catch (error) {
        console.error('Error creando geocerca:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/geofences/:id', authenticateToken, async (req, res) => {
      try {
        const { organization_id, name, description, center_lat, center_lng, radius_meters, user_id } = req.body;
        const geofence = await Geofence.findByPk(req.params.id);

        if (!geofence) return res.status(404).json({ error: 'Geocerca no encontrada' });

        const userRole = req.user.role?.toUpperCase();

        // VIEWER solo puede editar sus propias geocercas
        if (userRole === 'VIEWER' && geofence.user_id !== req.user.id) {
          return res.status(403).json({ error: 'No tienes permisos para editar esta geocerca' });
        }

        const coordinates = { latitude: center_lat, longitude: center_lng, radius: radius_meters || 500 };

        const updateData = {
          name,
          description,
          type: 'circle',
          coordinates
        };

        // Solo ADMIN/MANAGER/OPERATOR pueden cambiar la asignación de usuario
        if (userRole !== 'VIEWER' && user_id !== undefined) {
          updateData.user_id = user_id || null;
        }

        // Solo ADMIN puede cambiar la organización
        if (userRole === 'ADMIN' && organization_id) {
          updateData.organization_id = organization_id;
        }

        await geofence.update(updateData);

        console.log(`✅ Geocerca actualizada: ${name}`);
        res.json({ success: true, geofence: geofence.toJSON() });
      } catch (error) {
        console.error('Error actualizando geocerca:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.delete('/api/geofences/:id', authenticateToken, async (req, res) => {
      try {
        const geofence = await Geofence.findByPk(req.params.id);
        if (!geofence) return res.status(404).json({ error: 'Geocerca no encontrada' });

        const userRole = req.user.role?.toUpperCase();

        // VIEWER solo puede eliminar sus propias geocercas
        if (userRole === 'VIEWER' && geofence.user_id !== req.user.id) {
          return res.status(403).json({ error: 'No tienes permisos para eliminar esta geocerca' });
        }

        const deleted = await Geofence.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Geocerca no encontrada' });

        console.log(`✅ Geocerca eliminada: ${geofence.name}`);
        res.json({ success: true });
      } catch (error) {
        console.error('Error eliminando geocerca:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // REPORTES
    this.app.post('/api/reports/devices/pdf', async (req, res) => {
      try {
        const PDFDocument = require('pdfkit');
        const devices = await Device.findAll({ order: [['name', 'ASC']] });
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte.pdf');
        doc.pipe(res);
        doc.fontSize(20).text('Reporte de Dispositivos', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('Fecha: ' + new Date().toLocaleString('es-CO'));
        doc.text('Total: ' + devices.length);
        doc.moveDown(2);
        devices.forEach((d, i) => {
          doc.fontSize(10).text((i + 1) + '. ' + (d.name || d.imei)).text('   IMEI: ' + d.imei).text('   Estado: ' + (d.is_online ? 'En linea' : 'Fuera')).moveDown(0.5);
        });
        doc.end();
      } catch (error) {
        res.status(500).json({ error: 'Error generando PDF' });
      }
    });

    this.app.post('/api/reports/devices/excel', async (req, res) => {
      try {
        const ExcelJS = require('exceljs');
        const devices = await Device.findAll({ order: [['name', 'ASC']] });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Dispositivos');
        worksheet.columns = [
          { header: 'Nombre', key: 'name', width: 20 },
          { header: 'IMEI', key: 'imei', width: 20 },
          { header: 'Usuario', key: 'user', width: 20 },
          { header: 'Estado', key: 'status', width: 15 },
          { header: 'Bateria', key: 'battery', width: 12 }
        ];
        devices.forEach(d => {
          worksheet.addRow({ name: d.name || d.imei, imei: d.imei, user: d.user_name || 'N/A', status: d.is_online ? 'En linea' : 'Fuera', battery: d.battery_level || 0 });
        });
        worksheet.getRow(1).font = { bold: true };
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte.xlsx');
        await workbook.xlsx.write(res);
        res.end();
      } catch (error) {
        res.status(500).json({ error: 'Error generando Excel' });
      }
    });

    // DEVICES - CAMBIAR SERVIDOR
    this.app.post('/api/devices/:imei/change-server', async (req, res) => {
      try {
        const { imei } = req.params;
        const { serverIp, serverPort } = req.body;
        if (!serverIp || !serverPort) {
          return res.status(400).json({ error: 'serverIp y serverPort son requeridos' });
        }
        const device = await Device.findOne({ where: { imei } });
        if (!device) {
          return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }
        if (!device.is_online) {
          return res.status(400).json({ error: 'Dispositivo no está online. Conéctalo a internet primero.' });
        }
        const success = await this.tcpServer.changeServerIP(imei, serverIp, parseInt(serverPort));
        if (!success) {
          return res.status(500).json({ error: 'No se pudo enviar el comando. Intenta de nuevo.' });
        }
        console.log(`📤 [${imei}] Comando de cambio de servidor enviado a ${serverIp}:${serverPort}`);
        res.json({ success: true, message: 'Comando enviado. El dispositivo cambiará de servidor en los próximos minutos.', newServer: { ip: serverIp, port: serverPort }, nextSteps: ['1. El dispositivo desconectará del servidor actual', '2. Se conectará al nuevo servidor (pueden tardar 5-8 minutos)', '3. Espera a que el estado cambie a "Online" en la lista de dispositivos', '4. Si no aparece, reinicia el reloj manualmente (Menú > Configuración > Reiniciar)'] });
      } catch (error) {
        console.error('Error enviando comando:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // COMANDOS
    this.app.post('/api/commands/send', async (req, res) => {
      try {
        const { imei, command, params } = req.body;
        if (!this.tcpServer) {
          return res.status(503).json({ error: 'Servidor TCP no disponible' });
        }
        let success = false;
        let message = '';
        switch (command) {
          case 'location':
            success = await this.tcpServer.requestLocation(imei);
            message = success ? 'Solicitud de ubicación enviada' : 'No se pudo enviar la solicitud (Dispositivo offline?)';
            break;
          case 'setServer':
            const { ip, port } = params || {};
            if (!ip || !port) throw new Error('IP y Puerto requeridos para setServer');
            success = await this.tcpServer.changeServerIP(imei, ip, port);
            message = success ? 'Comando de cambio de servidor enviado' : 'Error enviando comando';
            break;
          case 'setInterval':
            const { interval } = params || {};
            if (!interval) throw new Error('Intervalo requerido');
            success = await this.tcpServer.setUploadInterval(imei, interval);
            message = success ? 'Configuración de intervalo enviada' : 'Error enviando comando';
            break;
          case 'reboot':
            success = await this.tcpServer.rebootDevice(imei);
            message = success ? 'Comando de reinicio enviado' : 'Error enviando comando';
            break;
          case 'find':
            success = await this.tcpServer.findDevice(imei);
            message = success ? 'Comando de búsqueda enviado' : 'Error enviando comando';
            break;
          default:
            return res.status(400).json({ error: 'Comando no válido o no implementado' });
        }
        if (success) {
          res.json({ success: true, message });
        } else {
          res.status(400).json({ success: false, error: message });
        }
      } catch (error) {
        console.error('Error procesando comando:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ALERTAS
    this.app.get('/api/alerts', async (req, res) => {
      try {
        const { device_id, status, severity, limit = 50 } = req.query;
        const alerts = await sequelize.query('SELECT a.*, d.imei, d.name as device_name FROM alerts a JOIN devices d ON a.device_id = d.id WHERE ($1::uuid IS NULL OR a.device_id = $1::uuid) AND ($2::text IS NULL OR a.status = $2) AND ($3::text IS NULL OR a.severity = $3) ORDER BY a.triggered_at DESC LIMIT $4', { bind: [device_id || null, status || null, severity || null, parseInt(limit)], type: QueryTypes.SELECT });
        res.json(alerts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/alerts/:id/status', async (req, res) => {
      try {
        const { status } = req.body;
        if (!['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
          return res.status(400).json({ error: 'Estado invalido' });
        }
        await sequelize.query('UPDATE alerts SET status = $1, updated_at = NOW() WHERE id = $2', { bind: [status, req.params.id], type: QueryTypes.UPDATE });
        res.json({ success: true, message: 'Estado actualizado' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // DATOS DE SALUD
    this.app.get('/api/devices/:imei/health', async (req, res) => {
      try {
        const { days = 7 } = req.query;
        const device = await Device.findOne({ where: { imei: req.params.imei } });
        if (!device) {
          return res.status(404).json({ error: 'Device not found' });
        }
        const healthData = await sequelize.query('SELECT * FROM health_data WHERE device_id = $1 AND measurement_time >= NOW() - INTERVAL \'1 day\' * $2 ORDER BY measurement_time DESC', { bind: [device.id, parseInt(days)], type: QueryTypes.SELECT });
        res.json(healthData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/health-data/:device_id', async (req, res) => {
      try {
        const { days = 7 } = req.query;
        const healthData = await sequelize.query('SELECT * FROM health_data WHERE device_id = $1 AND measurement_time >= NOW() - INTERVAL \'1 day\' * $2 ORDER BY measurement_time DESC', { bind: [req.params.device_id, parseInt(days)], type: QueryTypes.SELECT });
        res.json(healthData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // HISTORIAL DE UBICACIONES
    this.app.get('/api/location-history/:device_id', async (req, res) => {
      try {
        const { hours = 24, limit = 100 } = req.query;
        const positions = await sequelize.query('SELECT * FROM positions WHERE device_id = $1 AND server_time >= NOW() - INTERVAL \'1 hour\' * $2 ORDER BY server_time DESC LIMIT $3', { bind: [req.params.device_id, parseInt(hours), parseInt(limit)], type: QueryTypes.SELECT });
        res.json(positions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // EVENTOS UNIFICADOS
    this.app.get('/api/geofence-events', authenticateToken, async (req, res) => {
      try {
        const { device_id, event_type, limit = 50 } = req.query;
        const geofenceTypes = ['ENTER', 'EXIT'];
        const alertTypes = ['SOS', 'FALL_DOWN', 'LOW_BATTERY', 'TAKE_OFF', 'POWER_OFF', 'POWER_ON'];

        // Obtener dispositivos del usuario
        const userRole = req.user.role?.toUpperCase();
        let userDeviceIds = [];
        let userGeofenceIds = [];

        if (userRole === 'VIEWER') {
          // VIEWER solo ve sus dispositivos asignados
          const userDevices = await Device.findAll({
            where: { user_id: req.user.id },
            attributes: ['id']
          });
          userDeviceIds = userDevices.map(d => d.id);

          // VIEWER solo ve sus geocercas asignadas
          const userGeofences = await Geofence.findAll({
            where: { user_id: req.user.id },
            attributes: ['id']
          });
          userGeofenceIds = userGeofences.map(g => g.id);
        } else {
          // ADMIN, MANAGER, OPERATOR ven dispositivos de su organización
          const orgDevices = await Device.findAll({
            where: { organization_id: req.user.organization_id },
            attributes: ['id']
          });
          userDeviceIds = orgDevices.map(d => d.id);

          // ADMIN, MANAGER, OPERATOR ven geocercas de su organización
          const orgGeofences = await Geofence.findAll({
            where: { organization_id: req.user.organization_id },
            attributes: ['id']
          });
          userGeofenceIds = orgGeofences.map(g => g.id);
        }

        // Si el usuario no tiene dispositivos O geocercas asignados, retornar array vacío
        if (userDeviceIds.length === 0 || userGeofenceIds.length === 0) {
          return res.json([]);
        }

        let geofenceEvents = [];
        let alerts = [];

        if (!event_type || geofenceTypes.includes(event_type)) {
          let geofenceWhere = '';
          const geofenceBindings = [];

          // Filtrar por dispositivos del usuario
          geofenceWhere += ' AND ge.device_id = ANY($' + (geofenceBindings.length + 1) + ')';
          geofenceBindings.push(userDeviceIds);

          // Filtrar por geocercas del usuario
          geofenceWhere += ' AND ge.geofence_id = ANY($' + (geofenceBindings.length + 1) + ')';
          geofenceBindings.push(userGeofenceIds);

          if (device_id) {
            geofenceWhere += ' AND ge.device_id = $' + (geofenceBindings.length + 1);
            geofenceBindings.push(device_id);
          }
          if (event_type && geofenceTypes.includes(event_type)) {
            geofenceWhere += ' AND ge.event_type = $' + (geofenceBindings.length + 1);
            geofenceBindings.push(event_type);
          }
          geofenceEvents = await sequelize.query(`SELECT 'GEOFENCE' as source, ge.id, ge.device_id, ge.event_type, ge.event_time as time, ge.latitude, ge.longitude, ge.notified, d.name as device_name, d.imei, g.name as geofence_name, NULL as alert_severity, NULL as alert_message FROM geofence_events ge JOIN devices d ON ge.device_id = d.id JOIN geofences g ON ge.geofence_id = g.id WHERE 1=1 ${geofenceWhere}`, { bind: geofenceBindings, type: QueryTypes.SELECT });
        }

        if (!event_type || alertTypes.includes(event_type)) {
          let alertWhere = '';
          const alertBindings = [];

          // Filtrar por dispositivos del usuario
          alertWhere += ' AND a.device_id = ANY($' + (alertBindings.length + 1) + ')';
          alertBindings.push(userDeviceIds);

          if (device_id) {
            alertWhere += ' AND a.device_id = $' + (alertBindings.length + 1);
            alertBindings.push(device_id);
          }
          if (event_type && alertTypes.includes(event_type)) {
            alertWhere += ' AND a.alert_type = $' + (alertBindings.length + 1);
            alertBindings.push(event_type);
          }
          alerts = await sequelize.query(`SELECT 'ALERT' as source, a.id, a.device_id, a.alert_type as event_type, a.alert_time as time, a.latitude, a.longitude, a.acknowledged as notified, d.name as device_name, d.imei, NULL as geofence_name, a.severity as alert_severity, a.message as alert_message FROM alerts a JOIN devices d ON a.device_id = d.id WHERE 1=1 ${alertWhere}`, { bind: alertBindings, type: QueryTypes.SELECT });
        }

        const allEvents = [...geofenceEvents, ...alerts].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, parseInt(limit));
        res.json(allEvents);
      } catch (error) {
        console.error('Error obteniendo eventos:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.patch('/api/geofence-events/:id/notify', async (req, res) => {
      try {
        await sequelize.query(`UPDATE geofence_events SET notified = true WHERE id = $1`, { bind: [req.params.id] });
        res.json({ success: true });
      } catch (error) {
        console.error('Error marcando evento:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  setTCPServer(tcpServer) { this.tcpServer = tcpServer; }
  setActiveLocationService(s) { this.activeLocationService = s; }
  getWebSocketServer() { return this.websocketServer; }

  async start() {
    try {
      await testConnection();
      this.httpServer.listen(this.port, () => {
        console.log('\n🌐 API REST iniciado en http://0.0.0.0:' + this.port);
        console.log('📍 Endpoints: Auth | Users | Devices | Geofences | Reports | Commands | Alerts | Health\n');
      });
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }
}

module.exports = APIServer;
