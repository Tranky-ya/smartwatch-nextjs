"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditDevicePage() {
  const router = useRouter();
  const params = useParams();
  const imei = params.imei;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    user_id: ""
  });

  useEffect(() => {
    const userDataStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userDataStr || !token) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userDataStr);
    setCurrentUser(user);

    loadDevice();
    if (user.role?.toUpperCase() === 'ADMIN') {
      loadUsers();
    }
  }, [imei]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  };

  const loadDevice = async () => {
    try {
      const response = await fetch(`${API_URL}/api/devices/info/${imei}`);

      if (response.ok) {
        const data = await response.json();
        setDevice(data);
        setFormData({
          name: data.name || "",
          user_id: data.user_id || ""
        });
      } else {
        setError("Dispositivo no encontrado");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/api/devices/${imei}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Dispositivo actualizado correctamente");
        router.push("/devices");
      } else {
        setError(data.error || "Error actualizando dispositivo");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#6b7280" }}>⏳ Cargando dispositivo...</div>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#ef4444" }}>❌ Dispositivo no encontrado</div>
          <button
            onClick={() => router.push("/devices")}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Volver a dispositivos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6ee" }}>
      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #9dc4d5 0%, #7db4ce 100%)",
        color: "white",
        padding: "20px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: "0 0 5px 0" }}>✏️ Editar Dispositivo</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
              Modifica la información del dispositivo
            </p>
          </div>
          <button
            onClick={() => router.push("/devices")}
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
            ← Volver
          </button>
        </div>
      </header>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
        {error && (
          <div style={{
            padding: "15px",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "8px",
            marginBottom: "20px"
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "30px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          {/* Información del dispositivo */}
          <div style={{
            padding: "15px",
            background: "#f9fafb",
            borderRadius: "8px",
            marginBottom: "30px"
          }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#374151" }}>📱 Información del Dispositivo</h3>
            <p style={{ margin: "5px 0", color: "#6b7280" }}>
              <strong>IMEI:</strong> {device.imei}
            </p>
            <p style={{ margin: "5px 0", color: "#6b7280" }}>
              <strong>Estado:</strong> {device.is_online ? "🟢 Online" : "🔴 Offline"}
            </p>
            <p style={{ margin: "5px 0", color: "#6b7280" }}>
              <strong>Batería:</strong> 🔋 {device.battery_level}%
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Nombre del dispositivo */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Nombre del Dispositivo *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ej: Reloj de Juan"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Asignar a usuario - Solo ADMIN */}
            {currentUser?.role?.toUpperCase() === 'ADMIN' && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Asignar a Usuario
                </label>
                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "15px",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="">Sin asignar</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
                <small style={{ color: "#6b7280", fontSize: "13px", marginTop: "5px", display: "block" }}>
                  El dispositivo se asociará con el usuario seleccionado
                </small>
              </div>
            )}

            {/* Botones de acción */}
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              marginTop: "30px",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "20px"
            }}>
              <button
                type="button"
                onClick={() => router.push("/devices")}
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "600"
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  background: saving ? "#9ca3af" : "#9dc4d5",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "600"
                }}
              >
                {saving ? "Guardando..." : "💾 Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
