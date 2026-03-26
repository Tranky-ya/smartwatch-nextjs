// Servicio de forzado inteligente de GPS

class GPSForcer {
  constructor() {
    this.activeForcing = new Map(); // IMEI -> timestamp
    this.forcingHistory = new Map(); // IMEI -> array de timestamps
  }

  async forceGPS(tcpServer, imei) {
    const now = Date.now();
    
    // Verificar si ya está forzando
    if (this.activeForcing.has(imei)) {
      const lastForce = this.activeForcing.get(imei);
      if (now - lastForce < 60000) {
        console.log(`[GPS-FORCER] ${imei} - Ya hay forzado activo, saltando`);
        return false;
      }
    }

    console.log(`[GPS-FORCER] ${imei} - Iniciando secuencia de forzado GPS`);
    this.activeForcing.set(imei, now);

    try {
      // Secuencia Beesure: CR -> esperar -> DW -> esperar -> CR
      
      // 1. Primer CR (activar GPS)
      await this.sendCommand(tcpServer, imei, 'CR');
      console.log(`[GPS-FORCER] ${imei} - Comando CR enviado (1/3)`);
      await this.delay(8000);

      // 2. DW (solicitar ubicación)
      await this.sendCommand(tcpServer, imei, 'DW');
      console.log(`[GPS-FORCER] ${imei} - Comando DW enviado (2/3)`);
      await this.delay(5000);

      // 3. Segundo CR (reforzar GPS)
      await this.sendCommand(tcpServer, imei, 'CR');
      console.log(`[GPS-FORCER] ${imei} - Comando CR enviado (3/3)`);

      // Guardar en historial
      if (!this.forcingHistory.has(imei)) {
        this.forcingHistory.set(imei, []);
      }
      this.forcingHistory.get(imei).push(now);

      return true;
    } catch (error) {
      console.error(`[GPS-FORCER] ${imei} - Error:`, error.message);
      return false;
    } finally {
      // Limpiar después de 30 segundos
      setTimeout(() => {
        this.activeForcing.delete(imei);
      }, 30000);
    }
  }

  sendCommand(tcpServer, imei, command) {
    return new Promise((resolve, reject) => {
      try {
        const socket = tcpServer.getSocketByIMEI(imei);
        if (!socket) {
          reject(new Error('Socket no encontrado'));
          return;
        }

        const message = `[3G*${imei}*0002*${command}]\n`;
        socket.write(message);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shouldForceGPS(imei, currentScore, lastValidScore = 0) {
    // Forzar si:
    // 1. Score actual es bajo (<60)
    // 2. Ha pasado suficiente tiempo desde último forzado
    // 3. El score bajó significativamente
    
    const now = Date.now();
    const lastForce = this.activeForcing.get(imei) || 0;
    const timeSinceForce = now - lastForce;

    if (timeSinceForce < 60000) return false; // No forzar si ya se hizo recientemente

    if (currentScore < 60) return true;
    if (lastValidScore > 70 && currentScore < 40) return true;

    return false;
  }
}

module.exports = new GPSForcer();
