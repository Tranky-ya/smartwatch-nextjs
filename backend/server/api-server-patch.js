
    // 🆕 OBTENER ÚLTIMA POSICIÓN POR IMEI
    this.app.get('/api/positions/latest/:imei', async (req, res) => {
      try {
        const { imei } = req.params;
        
        const [position] = await sequelize.query(`
          SELECT p.*, d.imei, d.name as device_name
          FROM positions p
          JOIN devices d ON p.device_id = d.id
          WHERE d.imei = $1
          ORDER BY p.server_time DESC
          LIMIT 1
        `, { 
          bind: [imei], 
          type: QueryTypes.SELECT 
        });

        if (!position) {
          return res.status(404).json({ error: 'No se encontró ubicación para este dispositivo' });
        }

        res.json(position);
      } catch (error) {
        console.error('[API] Error obteniendo última posición:', error);
        res.status(500).json({ error: error.message });
      }
    });
