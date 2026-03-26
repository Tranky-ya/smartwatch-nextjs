const fs = require('fs');

let content = fs.readFileSync('tcp-server.js', 'utf8');

const oldCode = `  handleConnection(socket) {
    const clientInfo = \`\${socket.remoteAddress}:\${socket.remotePort}\`;
    console.log\`🔌 Nueva conexión desde \${clientInfo}\`;
    let buffer = '';`;

const newCode = `  handleConnection(socket) {
    const clientInfo = \`\${socket.remoteAddress}:\${socket.remotePort}\`;
    console.log\`🔌 Nueva conexión desde \${clientInfo}\`;
    
    // ⏱️ Configurar keepalive y timeout
    socket.setKeepAlive(true, 30000); // Keepalive cada 30s
    socket.setTimeout(120000); // Timeout 2 minutos (120s)
    
    socket.on('timeout', () => {
      console.log\`⏰ [\${clientInfo}] Timeout - cerrando conexión inactiva\`;
      socket.end();
    });
    
    let buffer = '';`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('tcp-server.js', content);
console.log('✅ Parche aplicado correctamente');
