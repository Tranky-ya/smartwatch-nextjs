const fs = require('fs');
let content = fs.readFileSync('protocol-parser.js', 'utf8');

// Cambiar la lógica de identificación de tipo
const oldCode = `    type: result.messageType === 'LK' ? 'LK' : 'UD',`;
const newCode = `    type: result.messageType === 'HEARTBEAT' ? 'LK' : 'UD',`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('protocol-parser.js', content);
console.log('✅ Arreglada identificación de tipo LK en protocol-parser.js');
