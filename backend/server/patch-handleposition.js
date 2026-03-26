const fs = require('fs');
let content = fs.readFileSync('tcp-server.js', 'utf8');

const oldCode = `  async handlePosition(device, parsed) {
    try {
      // Parsear el mensaje completo con el nuevo parser
      const rawData = {`;

const newCode = `  async handlePosition(device, parsed) {
    try {
      // 🛡️ FILTRO DE SEGURIDAD: Rechazar todo lo que NO sea UD
      if (parsed.type !== 'UD') {
        console.log\`ℹ️ [\${device.imei}] Sin respuesta para tipo: \${parsed.type}\`;
        return;
      }
      
      // Parsear el mensaje completo con el nuevo parser
      const rawData = {`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('tcp-server.js', content);
console.log('✅ Filtro de seguridad agregado a handlePosition');
