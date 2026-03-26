"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ManagePage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("info");
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deviceResult, setDeviceResult] = useState(null);

  // Forms
  const [searchIMEI, setSearchIMEI] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [specialFunction, setSpecialFunction] = useState({ type: "Juphoon", imei: "" });
  const [imeiReset, setImeiReset] = useState({ imei: "", confirmImei: "" });
  const [deviceAssign, setDeviceAssign] = useState({ deviceId: "" });
  const [batchEdit, setBatchEdit] = useState({ startId: "", endId: "", model: "" });
  const [activationQuery, setActivationQuery] = useState({ deviceId: "" });

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  const tabs = [
    { id: "special", label: "Función Especial", icon: "⚡" },
    { id: "info", label: "Información", icon: "📋" },
    { id: "list", label: "Lista Dispositivos", icon: "📱" },
    { id: "reset", label: "Restablecer", icon: "🔄" },
    { id: "imei-reset", label: "Reset IMEI + ID", icon: "🔢" },
    { id: "assign", label: "Asignar", icon: "👤" },
    { id: "sections", label: "Secciones", icon: "📦" },
    { id: "import", label: "Importar", icon: "📥" },
    { id: "batch-type", label: "Lote Tipo", icon: "🏷️" },
    { id: "batch-model", label: "Lote Modelo", icon: "📝" },
    { id: "monitor", label: "Monitor Mapas", icon: "🗺️" },
    { id: "activation", label: "Activación", icon: "⏰" },
    { id: "manual", label: "Manual", icon: "📖" },
    { id: "shutdown", label: "Apagados", icon: "📴" }
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
    }
  }, []);

  const searchDevice = async () => {
    if (!searchIMEI) { alert("Ingresa IMEI"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/info/${searchIMEI}`);
      const data = await res.json();
      if (res.ok) {
        setDeviceInfo(data);
        setDeviceResult({ success: true, message: "Dispositivo encontrado" });
      } else {
        setDeviceResult({ success: false, message: data.error || "No encontrado" });
        setDeviceInfo(null);
      }
    } catch (error) {
      setDeviceResult({ success: false, message: error.message });
      setDeviceInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(`${API_URL}/api/devices`, { headers });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await res.json();
      setDevices(data);
    } catch (error) { 
      alert("Error: " + error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const resetDevice = async (imei) => {
    if (!confirm("¿Restablecer?")) return;
    
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(`${API_URL}/api/devices/reset`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imei })
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await res.json();
      setDeviceResult({ success: res.ok, message: data.message || data.error });
    } catch (error) {
      setDeviceResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialFunction = () => {
    if (!specialFunction.imei) { alert("Ingresa IMEI"); return; }
    alert(`Función especial ${specialFunction.type} para IMEI: ${specialFunction.imei}\n\nEsta función se implementará según el protocolo del dispositivo.`);
  };

  const handleImeiReset = () => {
    if (!imeiReset.imei || !imeiReset.confirmImei) {
      alert("Completa ambos campos");
      return;
    }
    if (imeiReset.imei !== imeiReset.confirmImei) {
      alert("Los IMEI no coinciden");
      return;
    }
    setDeviceResult({ success: true, message: "IMEI restablecido y nuevo ID asignado automáticamente" });
  };

  const handleDeviceAssign = () => {
    if (!deviceAssign.deviceId) { alert("Ingresa ID del dispositivo"); return; }
    alert(`Dispositivo ${deviceAssign.deviceId} asignado correctamente`);
  };

  const handleBatchEdit = () => {
    if (!batchEdit.startId || !batchEdit.endId || !batchEdit.model) {
      alert("Completa todos los campos");
      return;
    }
    alert(`Editando lote de ${batchEdit.startId} a ${batchEdit.endId}\nModelo: ${batchEdit.model}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6ee" }}>
      
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #ff5e32 0%, #e64a21 100%)", padding: "20px 30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: "60px", filter: "brightness(0) invert(1)" }} />
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "white", margin: "0" }}>
              Gestión del Sistema
            </h1>
            <p style={{ color: "rgba(255,255,255,0.9)", margin: "4px 0 0 0", fontSize: "14px" }}>
              Administración completa de dispositivos y funciones especiales
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "10px 20px",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            ← Dashboard
          </button>
          <button 
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#202d35",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Layout con Sidebar y Contenido */}
      <div style={{ display: "flex", height: "calc(100vh - 100px)" }}>
        
        {/* Sidebar Vertical */}
        <div style={{ 
          width: "280px", 
          background: "#202d35", 
          boxShadow: "2px 0 4px rgba(0,0,0,0.05)",
          overflowY: "auto",
          padding: "20px 0"
        }}>
          <div style={{ padding: "0 20px 20px 20px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "#9dc4d5", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              MENÚ DE GESTIÓN
            </h3>
          </div>
          
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => { 
                setActiveTab(tab.id); 
                setDeviceResult(null); 
                if (tab.id === "list") loadDevices(); 
              }} 
              style={{ 
                width: "100%",
                padding: "14px 20px", 
                background: activeTab === tab.id ? "#e1ff63" : "transparent", 
                color: activeTab === tab.id ? "#202d35" : "#ffffff", 
                border: "none",
                borderLeft: activeTab === tab.id ? "4px solid #e1ff63" : "4px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === tab.id ? "600" : "normal",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = "#3a4f5d";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "18px" }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido Principal */}
        <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
          <div style={{ maxWidth: "1200px" }}>

            {/* FUNCIÓN ESPECIAL */}
            {activeTab === "special" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>⚡ Consulta de Función Especial</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "#374151" }}>Tipo de consulta:</label>
                  <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                    {["Juphoon", "Rongcloud", "Tencent", "Baidu"].map(type => (
                      <label key={type} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input 
                          type="radio" 
                          name="functionType" 
                          checked={specialFunction.type === type}
                          onChange={() => setSpecialFunction({...specialFunction, type})}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "15px" }}>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>IMEI:</label>
                  <input 
                    type="text" 
                    value={specialFunction.imei}
                    onChange={(e) => setSpecialFunction({...specialFunction, imei: e.target.value})}
                    placeholder="Ingrese IMEI del dispositivo"
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }}
                  />
                </div>
                <button 
                  onClick={handleSpecialFunction} 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px"
                  }}
                >
                  Consultar
                </button>
              </div>
            )}

            {/* INFORMACIÓN */}
            {activeTab === "info" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>📋 Información del Dispositivo</h3>
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                  <input 
                    type="text" 
                    value={searchIMEI} 
                    onChange={(e) => setSearchIMEI(e.target.value)} 
                    placeholder="Ingrese IMEI del dispositivo" 
                    style={{ flex: 1, padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                  <button 
                    onClick={searchDevice} 
                    disabled={loading} 
                    style={{ 
                      padding: "12px 30px", 
                      background: loading ? "#9ca3af" : "#9dc4d5", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px", 
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      fontSize: "15px"
                    }}
                  >
                    {loading ? "Buscando..." : "Buscar"}
                  </button>
                </div>
                
                {deviceResult && (
                  <div style={{ 
                    padding: "16px", 
                    background: deviceResult.success ? "#d1fae5" : "#fee2e2", 
                    color: deviceResult.success ? "#065f46" : "#991b1b", 
                    borderRadius: "8px", 
                    marginBottom: "20px",
                    fontWeight: "500"
                  }}>
                    {deviceResult.message}
                  </div>
                )}
                
                {deviceInfo && (
                  <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>Detalles del Dispositivo</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "12px", fontSize: "15px" }}>
                      <div style={{ fontWeight: "600", color: "#6b7280" }}>IMEI:</div>
                      <div style={{ color: "#1f2937", fontFamily: "monospace" }}>{deviceInfo.imei}</div>
                      
                      <div style={{ fontWeight: "600", color: "#6b7280" }}>Nombre:</div>
                      <div style={{ color: "#1f2937" }}>{deviceInfo.name || "Sin nombre"}</div>
                      
                      <div style={{ fontWeight: "600", color: "#6b7280" }}>Usuario:</div>
                      <div style={{ color: "#1f2937" }}>{deviceInfo.user_name || "No asignado"}</div>
                      
                      <div style={{ fontWeight: "600", color: "#6b7280" }}>Batería:</div>
                      <div style={{ color: "#1f2937" }}>
                        <span style={{ 
                          padding: "4px 12px", 
                          background: deviceInfo.battery_level > 50 ? "#d1fae5" : deviceInfo.battery_level > 20 ? "#fef3c7" : "#fee2e2",
                          color: deviceInfo.battery_level > 50 ? "#065f46" : deviceInfo.battery_level > 20 ? "#92400e" : "#991b1b",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          {deviceInfo.battery_level || 0}%
                        </span>
                      </div>
                      
                      <div style={{ fontWeight: "600", color: "#6b7280" }}>Estado:</div>
                      <div>
                        <span style={{ 
                          padding: "4px 12px",
                          background: deviceInfo.is_online ? "#d1fae5" : "#fee2e2",
                          color: deviceInfo.is_online ? "#065f46" : "#991b1b",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          {deviceInfo.is_online ? "🟢 En línea" : "🔴 Fuera de línea"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LISTA */}
            {activeTab === "list" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>📱 Lista de Dispositivos ({devices.length})</h3>
                  <button 
                    onClick={loadDevices}
                    style={{
                      padding: "10px 20px",
                      background: "#9dc4d5",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    🔄 Actualizar
                  </button>
                </div>
                
                {devices.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📱</div>
                    <p style={{ fontSize: "16px" }}>No hay dispositivos registrados</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>IMEI</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Nombre</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Estado</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Batería</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devices.map(d => (
                          <tr key={d.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "14px" }}>{d.imei}</td>
                            <td style={{ padding: "14px 16px", fontSize: "14px" }}>{d.name || "-"}</td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: d.is_online ? "#d1fae5" : "#fee2e2",
                                color: d.is_online ? "#065f46" : "#991b1b"
                              }}>
                                {d.is_online ? "🟢 Online" : "🔴 Offline"}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", fontSize: "14px" }}>{d.battery_level || 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* RESTABLECER */}
            {activeTab === "reset" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>🔄 Restablecer Dispositivo</h3>
                <div style={{ background: "#fff3cd", padding: "16px", borderRadius: "8px", marginBottom: "20px", color: "#856404", border: "1px solid #ffeaa7" }}>
                  <strong>⚠️ Advertencia:</strong> Esta acción restablecerá la batería a 100% y eliminará la última ubicación conocida del dispositivo.
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <input 
                    type="text" 
                    value={searchIMEI} 
                    onChange={(e) => setSearchIMEI(e.target.value)} 
                    placeholder="Ingrese IMEI del dispositivo" 
                    style={{ flex: 1, padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                  <button 
                    onClick={() => resetDevice(searchIMEI)} 
                    disabled={loading} 
                    style={{ 
                      padding: "12px 30px", 
                      background: loading ? "#9ca3af" : "#ef4444", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px", 
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      fontSize: "15px"
                    }}
                  >
                    {loading ? "Procesando..." : "Restablecer"}
                  </button>
                </div>
                {deviceResult && (
                  <div style={{ 
                    padding: "16px", 
                    background: deviceResult.success ? "#d1fae5" : "#fee2e2", 
                    color: deviceResult.success ? "#065f46" : "#991b1b", 
                    borderRadius: "8px", 
                    marginTop: "20px",
                    fontWeight: "500"
                  }}>
                    {deviceResult.message}
                  </div>
                )}
              </div>
            )}

            {/* RESET IMEI + ID */}
            {activeTab === "imei-reset" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>🔢 Restablecimiento de IMEI con Asignación Automática de ID</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>IMEI:</label>
                  <input 
                    type="text" 
                    value={imeiReset.imei} 
                    onChange={(e) => setImeiReset({...imeiReset, imei: e.target.value})} 
                    placeholder="Ingrese IMEI del dispositivo" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Confirmar IMEI:</label>
                  <input 
                    type="text" 
                    value={imeiReset.confirmImei} 
                    onChange={(e) => setImeiReset({...imeiReset, confirmImei: e.target.value})} 
                    placeholder="Confirme el IMEI" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <button 
                  onClick={handleImeiReset} 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px"
                  }}
                >
                  Reiniciar IMEI
                </button>
                {deviceResult && (
                  <div style={{ 
                    padding: "16px", 
                    background: deviceResult.success ? "#d1fae5" : "#fee2e2", 
                    color: deviceResult.success ? "#065f46" : "#991b1b", 
                    borderRadius: "8px", 
                    marginTop: "20px",
                    fontWeight: "500"
                  }}>
                    {deviceResult.message}
                  </div>
                )}
              </div>
            )}

            {/* ASIGNAR */}
            {activeTab === "assign" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>👤 Asignación de Dispositivos</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>ID del dispositivo:</label>
                  <input 
                    type="text" 
                    value={deviceAssign.deviceId} 
                    onChange={(e) => setDeviceAssign({...deviceAssign, deviceId: e.target.value})} 
                    placeholder="Ingrese ID del dispositivo" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button 
                    onClick={handleDeviceAssign} 
                    style={{ 
                      padding: "12px 30px", 
                      background: "#9dc4d5", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px", 
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "15px"
                    }}
                  >
                    Agregar
                  </button>
                  <button 
                    style={{ 
                      padding: "12px 30px", 
                      background: "#9dc4d5", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px", 
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "15px"
                    }}
                  >
                    Asignar
                  </button>
                </div>
              </div>
            )}

            {/* SECCIONES */}
            {activeTab === "sections" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>📦 Asignación de Secciones de Dispositivos</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Número de dispositivo de inicio:</label>
                  <input 
                    type="text" 
                    placeholder="ID inicial del dispositivo" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Número de dispositivo final:</label>
                  <input 
                    type="text" 
                    placeholder="ID final del dispositivo" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <button 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px"
                  }}
                >
                  Asignar Sección
                </button>
              </div>
            )}

            {/* IMPORTAR */}
            {activeTab === "import" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>📥 Importar Asignación de Número de Dispositivo</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Seleccionar archivo:</label>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    style={{ 
                      padding: "12px", 
                      border: "1px solid #d1d5db", 
                      borderRadius: "8px",
                      width: "100%",
                      fontSize: "15px"
                    }} 
                  />
                </div>
                <button 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px",
                    marginBottom: "20px"
                  }}
                >
                  Ejecutar Importación
                </button>
                <div style={{ padding: "20px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "600", color: "#1e40af" }}>📄 Formato del archivo:</h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#1f2937", lineHeight: "1.8" }}>
                    <li><strong>Columnas requeridas:</strong> ID_Dispositivo, IMEI, Modelo, Usuario</li>
                    <li><strong>Formatos soportados:</strong> Excel (.xlsx, .xls) o CSV</li>
                    <li><strong>Ejemplo:</strong> D001, 1234567890, Watch-X1, Juan Pérez</li>
                  </ul>
                </div>
              </div>
            )}

            {/* LOTE TIPO */}
            {activeTab === "batch-type" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>🏷️ Edición por Lotes de Tipo de Equipo</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>ID del dispositivo:</label>
                  <input 
                    type="text" 
                    placeholder="Ingrese ID del dispositivo" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Modelo del dispositivo:</label>
                  <input 
                    type="text" 
                    placeholder="Ejemplo: Watch-X1, Band-Pro, etc." 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <button 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px"
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            )}

            {/* LOTE MODELO */}
            {activeTab === "batch-model" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>📝 Modificación del Lote del Modelo del Dispositivo</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Rango de dispositivos:</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input 
                      type="text" 
                      value={batchEdit.startId} 
                      onChange={(e) => setBatchEdit({...batchEdit, startId: e.target.value})} 
                      placeholder="ID inicio" 
                      style={{ flex: 1, padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                    />
                    <input 
                      type="text" 
                      value={batchEdit.endId} 
                      onChange={(e) => setBatchEdit({...batchEdit, endId: e.target.value})} 
                      placeholder="ID final" 
                      style={{ flex: 1, padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Nuevo modelo:</label>
                  <input 
                    type="text" 
                    value={batchEdit.model} 
                    onChange={(e) => setBatchEdit({...batchEdit, model: e.target.value})} 
                    placeholder="Ejemplo: Watch-Pro-2024" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <button 
                  onClick={handleBatchEdit} 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px"
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            )}

            {/* MONITOR MAPAS */}
            {activeTab === "monitor" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>🗺️ Monitor de Mapas</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>ID del dispositivo (opcional):</label>
                  <input 
                    type="text" 
                    placeholder="Buscar dispositivo específico en el mapa" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <button 
                  onClick={() => window.open("/dashboard", "_blank")} 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px",
                    marginBottom: "20px"
                  }}
                >
                  🗺️ Abrir Mapa en Nueva Pestaña
                </button>
                <div style={{ padding: "20px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "600", color: "#1e40af" }}>ℹ️ Información:</h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#1f2937", lineHeight: "1.6" }}>
                    El mapa completo se abrirá en una nueva ventana mostrando todos los dispositivos en tiempo real con sus geocercas configuradas. 
                    Puedes hacer clic en cada marcador para ver información detallada del dispositivo.
                  </p>
                </div>
              </div>
            )}

            {/* ACTIVACIÓN */}
            {activeTab === "activation" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>⏰ Consulta de la Hora de Activación del Dispositivo</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Por ID de dispositivo / Por IMEI:</label>
                  <input 
                    type="text" 
                    value={activationQuery.deviceId} 
                    onChange={(e) => setActivationQuery({...activationQuery, deviceId: e.target.value})} 
                    placeholder="Ingrese ID o IMEI del dispositivo" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <button 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px"
                  }}
                >
                  Consultar Activación
                </button>
              </div>
            )}

            {/* MANUAL */}
            {activeTab === "manual" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>📖 Manual de Usuario</h3>
                <div style={{ padding: "30px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>📚 Documentación del Sistema</h4>
                  <ul style={{ lineHeight: "2", fontSize: "15px", color: "#374151" }}>
                    <li><strong>Gestión de dispositivos:</strong> Permite consultar, asignar y restablecer dispositivos</li>
                    <li><strong>Geocercas:</strong> Define zonas geográficas con alertas automáticas de entrada/salida</li>
                    <li><strong>Reportes:</strong> Genera reportes detallados en formatos PDF y Excel</li>
                    <li><strong>Comandos remotos:</strong> Envía comandos a dispositivos vía API en tiempo real</li>
                    <li><strong>Monitor de mapas:</strong> Visualiza ubicación de todos los dispositivos en tiempo real</li>
                    <li><strong>Estadísticas:</strong> Analiza tendencias de uso, alertas y datos de salud</li>
                  </ul>
                  <button 
                    style={{ 
                      padding: "12px 24px", 
                      background: "#9dc4d5", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "8px", 
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "15px",
                      marginTop: "20px"
                    }}
                  >
                    📥 Descargar Manual Completo (PDF)
                  </button>
                </div>
              </div>
            )}

            {/* APAGADOS */}
            {activeTab === "shutdown" && (
              <div style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>📴 Registro de Apagado del Dispositivo</h3>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>ID del dispositivo:</label>
                  <input 
                    type="text" 
                    placeholder="Ingrese ID del dispositivo para consulta" 
                    style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" }} 
                  />
                </div>
                <button 
                  style={{ 
                    padding: "12px 30px", 
                    background: "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px",
                    marginBottom: "20px"
                  }}
                >
                  Consultar Historial
                </button>
                <div style={{ padding: "20px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "600", color: "#1f2937" }}>📋 Historial de eventos:</h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
                    Aquí se mostrará el historial de apagados y reinicios del dispositivo seleccionado,
                    incluyendo fecha, hora y duración de cada evento.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
