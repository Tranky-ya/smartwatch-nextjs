"use client";
import { useState } from "react";

export default function DeviceManager() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [activeTab, setActiveTab] = useState("register");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Registro de dispositivo
  const [registerForm, setRegisterForm] = useState({
    imei: "",
    name: ""
  });

  // Cambio de servidor
  const [serverForm, setServerForm] = useState({
    imei: "",
    serverIp: "3.224.68.233",
    serverPort: "7070"
  });

  // Registrar dispositivo
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error registrando dispositivo");
      }

      setMessage(`✅ Dispositivo registrado: ${registerForm.name || registerForm.imei}`);
      setRegisterForm({ imei: "", name: "" });
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar servidor
  const handleChangeServer = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/devices/${serverForm.imei}/change-server`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serverIp: serverForm.serverIp,
            serverPort: parseInt(serverForm.serverPort)
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error cambiando servidor");
      }

      setMessage(`📤 Comando enviado al dispositivo ${serverForm.imei}. El reloj se reconectará en 2-5 minutos.`);
      setServerForm({ imei: "", serverIp: "3.224.68.233", serverPort: "7070" });
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", padding: "20px" }}>
      <div style={{ 
        background: "white", 
        borderRadius: "10px", 
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid #eee" }}>
          <button
            onClick={() => setActiveTab("register")}
            style={{
              flex: 1,
              padding: "15px",
              border: "none",
              background: activeTab === "register" ? "#667eea" : "#f5f5f5",
              color: activeTab === "register" ? "white" : "#333",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s"
            }}
          >
            ➕ Registrar Dispositivo
          </button>
          <button
            onClick={() => setActiveTab("server")}
            style={{
              flex: 1,
              padding: "15px",
              border: "none",
              background: activeTab === "server" ? "#667eea" : "#f5f5f5",
              color: activeTab === "server" ? "white" : "#333",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s"
            }}
          >
            🔧 Cambiar Servidor
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "30px" }}>
          {/* Mensajes */}
          {message && (
            <div style={{
              padding: "15px",
              background: "#d1fae5",
              color: "#065f46",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px"
            }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              padding: "15px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px"
            }}>
              {error}
            </div>
          )}

          {/* REGISTRAR DISPOSITIVO */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                  IMEI del Reloj *
                </label>
                <input
                  type="text"
                  value={registerForm.imei}
                  onChange={(e) => setRegisterForm({ ...registerForm, imei: e.target.value })}
                  placeholder="Ej: 351266770069591"
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
                <small style={{ color: "#666", marginTop: "5px", display: "block" }}>
                  Envía SMS: pw,123456,ts# para obtener el IMEI
                </small>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                  Nombre del Dispositivo
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  placeholder="Ej: Mi Reloj GPS"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loading ? "#ccc" : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s"
                }}
              >
                {loading ? "Registrando..." : "✅ Registrar Dispositivo"}
              </button>
            </form>
          )}

          {/* CAMBIAR SERVIDOR */}
          {activeTab === "server" && (
            <form onSubmit={handleChangeServer}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                  IMEI del Reloj *
                </label>
                <input
                  type="text"
                  value={serverForm.imei}
                  onChange={(e) => setServerForm({ ...serverForm, imei: e.target.value })}
                  placeholder="Ej: 351266770069591"
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                  IP del Servidor
                </label>
                <input
                  type="text"
                  value={serverForm.serverIp}
                  onChange={(e) => setServerForm({ ...serverForm, serverIp: e.target.value })}
                  placeholder="3.224.68.233"
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                  Puerto
                </label>
                <input
                  type="number"
                  value={serverForm.serverPort}
                  onChange={(e) => setServerForm({ ...serverForm, serverPort: e.target.value })}
                  placeholder="7070"
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{
                padding: "15px",
                background: "#fef3c7",
                borderRadius: "5px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#92400e"
              }}>
                <strong>📢 Importante:</strong> El reloj debe estar online. Después de enviar el comando:
                <br/>1. Reinicia el reloj (Menú → Configuración → Reiniciar)
                <br/>2. Asegúrate que tenga conexión GPS/RED activa
                <br/>3. Espera 2-5 minutos para que se reconecte
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loading ? "#ccc" : "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s"
                }}
              >
                {loading ? "Enviando..." : "🔧 Cambiar Servidor"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
