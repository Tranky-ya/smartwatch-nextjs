"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DeviceManager from "@/components/DeviceManager";

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Estados para el modal de eliminación
  const [deleteModal, setDeleteModal] = useState({ show: false, device: null });
  const [deleteIMEI, setDeleteIMEI] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Función para formatear fechas en zona horaria de Colombia (UTC-5)
  const formatDateColombia = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/devices`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      } else if (response.status === 401) {
        router.push("/");
      }
    } catch (error) {
      console.error("Error cargando dispositivos:", error);
    }
  };

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  const handleDeleteClick = (device) => {
    setDeleteModal({ show: true, device });
    setDeleteIMEI("");
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.device) return;

    if (deleteIMEI !== deleteModal.device.imei) {
      setDeleteError("El IMEI no coincide");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/devices/${deleteModal.device.imei}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setDeleteModal({ show: false, device: null });
        setDeleteIMEI("");
        await loadDevices();
        alert("✅ Dispositivo eliminado correctamente");
      } else {
        const data = await response.json();
        setDeleteError(data.error || "Error al eliminar");
      }
    } catch (error) {
      setDeleteError("Error de conexión: " + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ show: false, device: null });
    setDeleteIMEI("");
    setDeleteError("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6ee" }}>
      <header style={{
        background: "linear-gradient(135deg, #9dc4d5 0%, #7db4ce 100%)",
        color: "white",
        padding: "20px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: "60px", filter: "brightness(0) invert(1)" }} />
            <div>
              <h1 style={{ margin: "0 0 5px 0", fontSize: "24px" }}>Gestión de Dispositivos</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
                Registro y administración de dispositivos
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={loadDevices}
              disabled={refreshing}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: refreshing ? "not-allowed" : "pointer",
                fontWeight: "bold"
              }}
            >
              {refreshing ? "🔄 Actualizando..." : "🔄 Actualizar"}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              📊 Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 20px",
                background: "#ff5e32",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        <DeviceManager />

        <div style={{ marginTop: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#333", margin: 0 }}>Dispositivos Registrados ({devices.length})</h2>
            <span style={{
              padding: "8px 16px",
              background: "#dbeafe",
              color: "#1e40af",
              borderRadius: "20px",
              fontSize: "13px"
            }}>
              🟢 Online: {devices.filter(d => d.is_online).length}
            </span>
          </div>

          {devices.length === 0 ? (
            <div style={{
              padding: "40px",
              background: "white",
              borderRadius: "10px",
              textAlign: "center",
              color: "#999",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              No hay dispositivos registrados aún. Usa el formulario de arriba para agregar uno.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {devices.map((device) => (
                <div key={device.id} style={{
                  background: "#ffffff",
                  borderRadius: "10px",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  border: device.is_online ? "3px solid #e1ff63" : "2px solid #d1d5db",
                  transition: "all 0.3s",
                  position: "relative"
                }}>
                  <div style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    display: "flex",
                    gap: "8px"
                  }}>
                    <button
                      onClick={() => router.push(`/devices/${device.imei}/edit`)}
                      style={{
                        background: "#9dc4d5",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#7db4ce"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#9dc4d5"}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(device)}
                      style={{
                        background: "#ff5e32",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#e64a21"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#ff5e32"}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>

                  <div style={{ marginBottom: "15px", paddingRight: "160px" }}>
                    <h3 style={{ margin: "0 0 5px 0", color: "#333", fontSize: "16px" }}>
                      {device.name || device.imei}
                    </h3>
                    <p style={{ margin: "5px 0", color: "#666", fontSize: "12px" }}>
                      📱 IMEI: <strong>{device.imei}</strong>
                    </p>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "15px",
                    fontSize: "13px"
                  }}>
                    <div>
                      <span style={{ color: "#666" }}>Estado</span>
                      <div style={{
                        padding: "6px",
                        borderRadius: "4px",
                        background: device.is_online ? "#d1fae5" : "#f3f4f6",
                        color: device.is_online ? "#065f46" : "#6b7280",
                        fontWeight: "bold",
                        marginTop: "5px"
                      }}>
                        {device.is_online ? "🟢 Online" : "🔴 Offline"}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#666" }}>Batería</span>
                      <div style={{
                        padding: "6px",
                        borderRadius: "4px",
                        background: device.battery_level > 20 ? "#dbeafe" : "#fee2e2",
                        color: device.battery_level > 20 ? "#1e40af" : "#991b1b",
                        fontWeight: "bold",
                        marginTop: "5px"
                      }}>
                        🔋 {device.battery_level}%
                      </div>
                    </div>
                  </div>

                  {/* Usuario Asignado */}
                  {device.assigned_user && (
                    <div style={{ 
                      padding: "10px 12px", 
                      background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                      border: "1px solid #667eea30",
                      borderRadius: "6px",
                      marginBottom: "10px"
                    }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: "#667eea", marginBottom: "3px" }}>
                        👤 Asignado a: {device.assigned_user.full_name}
                      </div>
                      <div style={{ fontSize: "10px", color: "#6b7280" }}>
                        {device.assigned_user.email}
                      </div>
                    </div>
                  )}

                  {device.last_latitude && device.last_longitude && (
                    <div style={{
                      padding: "10px",
                      background: "#eff6ff",
                      borderRadius: "5px",
                      fontSize: "12px",
                      color: "#1e40af",
                      marginBottom: "10px"
                    }}>
                      📍 {parseFloat(device.last_latitude).toFixed(4)}, {parseFloat(device.last_longitude).toFixed(4)}
                    </div>
                  )}

                  <div style={{ fontSize: "11px", color: "#999" }}>
                    Registrado: {formatDateColombia(device.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {deleteModal.show && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#ef4444" }}>
                ⚠️ Confirmar Eliminación
              </h2>

              <p style={{ marginBottom: "20px", color: "#666" }}>
                Estás a punto de eliminar el dispositivo:
              </p>

              <div style={{
                padding: "15px",
                background: "#f9fafb",
                borderRadius: "8px",
                marginBottom: "20px"
              }}>
                <p style={{ margin: "5px 0" }}>
                  <strong>Nombre:</strong> {deleteModal.device?.name || "Sin nombre"}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>IMEI:</strong> {deleteModal.device?.imei}
                </p>
              </div>

              <div style={{
                padding: "15px",
                background: "#fee2e2",
                borderRadius: "8px",
                marginBottom: "20px",
                color: "#991b1b",
                fontSize: "14px"
              }}>
                <strong>⚠️ Advertencia:</strong> Esta acción eliminará permanentemente:
                <ul style={{ margin: "10px 0 0 20px", paddingLeft: 0 }}>
                  <li>El dispositivo</li>
                  <li>Todas sus alertas</li>
                  <li>Todos sus eventos de geocercas</li>
                  <li>Todos sus datos de salud</li>
                </ul>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Para confirmar, escribe el IMEI del dispositivo:
                </label>
                <input
                  type="text"
                  value={deleteIMEI}
                  onChange={(e) => setDeleteIMEI(e.target.value)}
                  placeholder={deleteModal.device?.imei}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: deleteError ? "2px solid #ef4444" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontFamily: "monospace",
                    boxSizing: "border-box"
                  }}
                  disabled={deleteLoading}
                />
                {deleteError && (
                  <p style={{ color: "#ef4444", margin: "8px 0 0 0", fontSize: "14px" }}>
                    {deleteError}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleteLoading}
                  style={{
                    padding: "12px 24px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    cursor: deleteLoading ? "not-allowed" : "pointer",
                    fontWeight: "600"
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading || deleteIMEI !== deleteModal.device?.imei}
                  style={{
                    padding: "12px 24px",
                    background: deleteLoading || deleteIMEI !== deleteModal.device?.imei ? "#9ca3af" : "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: deleteLoading || deleteIMEI !== deleteModal.device?.imei ? "not-allowed" : "pointer",
                    fontWeight: "600"
                  }}
                >
                  {deleteLoading ? "Eliminando..." : "Eliminar Dispositivo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
