const SmartwatchParser = require('./protocol-parser');

// Trama real con 10 WiFi APs
const trama = "[3G*6677006956*0161*UD_LTE,050226,224740,V,6.156588,N,-75.5202830,W,0.00,0.0,0.0,0,67,67,120473,0,00000000,1,0,732,103,3127,46146413,153,10,,F4:F2:6D:E4:24:CF,-68,,F6:F2:6D:E4:24:CC,-68,,8C:90:2D:35:10:CD,-77,,58:CB:52:B1:E8:DC,-84,,00:00:00:00:00:00,-87,,F0:99:BF:0D:CB:FC,-87,,B4:61:8C:2D:BE:A1,-88,,3C:28:6D:C7:4A:EE,-89,,E4:F0:42:EE:58:24,-90,,B4:61:8C:2D:BE:A4,-92,0.0]";

console.log("Testing parser with real frame...\n");
console.log("Trama:", trama);
console.log("\n--- Resultado del parse ---");

const result = SmartwatchParser.parse(trama);

if (result) {
  console.log("✅ Parse exitoso");
  console.log("IMEI:", result.imei);
  console.log("Type:", result.type);
  console.log("WiFi APs:", result.wifiAccessPoints ? result.wifiAccessPoints.length : 0);
  
  if (result.wifiAccessPoints && result.wifiAccessPoints.length > 0) {
    console.log("\n📶 WiFi Access Points detectados:");
    result.wifiAccessPoints.forEach((ap, i) => {
      console.log(`  ${i+1}. ${ap.macAddress} (${ap.signalStrength} dBm)`);
    });
  } else {
    console.log("\n❌ NO se detectaron WiFi APs");
  }
} else {
  console.log("❌ Parse falló - resultado null");
}
