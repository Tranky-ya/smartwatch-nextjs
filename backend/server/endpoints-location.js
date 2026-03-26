// ==================== ENDPOINTS DE UBICACIÓN ====================
    this.app.get('/api/positions/latest/:imei', authenticateToken, async (req, res) => {
      try {
        const query = 'SELECT d.*, p.* FROM devices d LEFT JOIN positions p ON p.device_id = d.id WHERE d.imei = $1 ORDER BY p.server_time DESC LIMIT 1';
        const result = await sequelize.query(query, { bind: [req.params.imei], type: QueryTypes.SELECT });
        if (!result || !result.length) return res.status(404).json({ error: 'Sin posiciones' });
        res.json(result[0]);
      } catch (e) { 
        console.error('Error /api/positions/latest:', e); 
        res.status(500).json({ error: e.message }); 
      }
    });

    this.app.post('/api/location/request', authenticateToken, async (req, res) => {
      try {
        const result = await sequelize.query('SELECT * FROM devices WHERE imei = $1', { bind: [req.body.imei], type: QueryTypes.SELECT });
        if (!result || !result.length) return res.status(404).json({ error: 'Dispositivo no encontrado' });
        const sock = this.tcpServer.getSocketByIMEI(req.body.imei);
        if (!sock) return res.status(404).json({ error: 'Dispositivo offline' });
        sock.write(`[3G*${req.body.imei}*0002*DW]\n`);
        console.log(`[API] ✅ Comando DW enviado a ${req.body.imei}`);
        res.json({ success: true });
      } catch (e) { 
        console.error('Error /api/location/request:', e); 
        res.status(500).json({ error: e.message }); 
      }
    });
