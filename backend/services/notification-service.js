const { QueryTypes } = require('sequelize');
const { sequelize } = require('../database');

class NotificationService {
  
  /**
   * Envía notificación cuando ocurre un evento de geocerca
   */
  async notifyGeofenceEvent(eventId) {
    try {
      // Obtener detalles del evento
      const [event] = await sequelize.query(`
        SELECT 
          ge.*,
          d.name as device_name,
          d.imei,
          d.phone_number,
          g.name as geofence_name,
          g.organization_id
        FROM geofence_events ge
        JOIN devices d ON ge.device_id = d.id
        JOIN geofences g ON ge.geofence_id = g.id
        WHERE ge.id = $1
      `, {
        bind: [eventId],
        type: QueryTypes.SELECT
      });

      if (!event) {
        console.error('[NOTIFY] Evento no encontrado:', eventId);
        return;
      }

      console.log(`📢 [NOTIFY] Procesando notificación para evento ${eventId}`);

      // Enviar por todos los canales configurados
      const results = await Promise.allSettled([
        this.sendWhatsApp(event),
        this.sendEmail(event),
        this.sendWebPush(event)
      ]);

      // Marcar como notificado
      await sequelize.query(`
        UPDATE geofence_events 
        SET notified = true 
        WHERE id = $1
      `, {
        bind: [eventId]
      });

      console.log(`✅ [NOTIFY] Evento ${eventId} notificado exitosamente`);
      
      return results;
    } catch (error) {
      console.error('[NOTIFY] Error enviando notificaciones:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación por WhatsApp
   */
  async sendWhatsApp(event) {
    try {
      const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
      const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
      const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'instance1';
      
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        console.log('[WHATSAPP] No configurado - saltando');
        return { success: false, reason: 'not_configured' };
      }

      // Números a notificar (de variables de entorno)
      const notifyNumbers = process.env.NOTIFY_WHATSAPP_NUMBERS?.split(',') || [];
      
      if (notifyNumbers.length === 0) {
        console.log('[WHATSAPP] No hay números configurados');
        return { success: false, reason: 'no_numbers' };
      }

      const eventType = event.event_type === 'ENTER' ? 'ENTRÓ A' : 'SALIÓ DE';
      const emoji = event.event_type === 'ENTER' ? '🟢' : '🔴';
      
      const message = `${emoji} *ALERTA DE GEOCERCA*\n\n` +
        `📱 *Dispositivo:* ${event.device_name}\n` +
        `📍 *Geocerca:* ${event.geofence_name}\n` +
        `⚡ *Evento:* ${eventType}\n` +
        `🕐 *Fecha:* ${new Date(event.event_time).toLocaleString('es-CO')}\n` +
        `📍 *Ubicación:* ${event.latitude}, ${event.longitude}`;

      // Enviar a todos los números
      const promises = notifyNumbers.map(number => 
        fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify({
            number: number.trim(),
            text: message
          })
        })
      );

      await Promise.all(promises);
      
      console.log(`✅ [WHATSAPP] Enviado a ${notifyNumbers.length} número(s)`);
      return { success: true, count: notifyNumbers.length };
    } catch (error) {
      console.error('[WHATSAPP] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar notificación por Email
   */
  async sendEmail(event) {
    try {
      const nodemailer = require('nodemailer');
      
      const SMTP_HOST = process.env.SMTP_HOST;
      const SMTP_PORT = process.env.SMTP_PORT || 587;
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;
      const NOTIFY_EMAILS = process.env.NOTIFY_EMAILS?.split(',') || [];

      if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.log('[EMAIL] No configurado - saltando');
        return { success: false, reason: 'not_configured' };
      }

      if (NOTIFY_EMAILS.length === 0) {
        console.log('[EMAIL] No hay emails configurados');
        return { success: false, reason: 'no_emails' };
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT == 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      const eventType = event.event_type === 'ENTER' ? 'ENTRÓ A' : 'SALIÓ DE';
      const emoji = event.event_type === 'ENTER' ? '🟢' : '🔴';

      const mailOptions = {
        from: SMTP_USER,
        to: NOTIFY_EMAILS.join(','),
        subject: `${emoji} Alerta: ${event.device_name} ${eventType} ${event.geofence_name}`,
        html: `
          <h2>${emoji} Alerta de Geocerca</h2>
          <p><strong>Dispositivo:</strong> ${event.device_name}</p>
          <p><strong>IMEI:</strong> ${event.imei}</p>
          <p><strong>Geocerca:</strong> ${event.geofence_name}</p>
          <p><strong>Evento:</strong> ${eventType}</p>
          <p><strong>Fecha:</strong> ${new Date(event.event_time).toLocaleString('es-CO')}</p>
          <p><strong>Ubicación:</strong> ${event.latitude}, ${event.longitude}</p>
          <p><a href="https://www.google.com/maps?q=${event.latitude},${event.longitude}">Ver en Google Maps</a></p>
        `
      };

      await transporter.sendMail(mailOptions);
      
      console.log(`✅ [EMAIL] Enviado a ${NOTIFY_EMAILS.length} email(s)`);
      return { success: true, count: NOTIFY_EMAILS.length };
    } catch (error) {
      console.error('[EMAIL] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar notificación Web Push
   */
  async sendWebPush(event) {
    try {
      // TODO: Implementar Web Push en una fase posterior
      console.log('[WEB_PUSH] No implementado aún - saltando');
      return { success: false, reason: 'not_implemented' };
    } catch (error) {
      console.error('[WEB_PUSH] Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();
