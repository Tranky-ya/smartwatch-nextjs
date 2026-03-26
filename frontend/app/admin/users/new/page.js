"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewUserPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [currentUser, setCurrentUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "viewer",
    organization_id: "",
    phone: ""
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userData || !token) {
      router.push("/");
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);

    // Verificar permisos (case-insensitive)
    const roleUpper = user.role?.toUpperCase();
    if (roleUpper !== 'SUPER_ADMIN' && roleUpper !== 'ADMIN') {
      router.push("/dashboard");
      return;
    }

    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);

        // Si es ADMIN, preseleccionar su organización
        if (currentUser?.role?.toUpperCase() === 'ADMIN' && data.length > 0) {
          setFormData(prev => ({ ...prev, organization_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error("Error cargando organizaciones:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // Preparar datos
      const dataToSend = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
        phone: formData.phone
      };

      // Solo agregar organization_id si tiene valor
      if (formData.organization_id) {
        dataToSend.organization_id = formData.organization_id;
      } else if (currentUser?.organization_id) {
        dataToSend.organization_id = currentUser.organization_id;
      }

      console.log('🔍 DEBUG - Role que se va a enviar:', formData.role);
      console.log('🔍 DEBUG - Objeto completo:', dataToSend);

      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Usuario creado correctamente");
        router.push("/admin/users");
      } else {
        setError(data.error || "Error creando usuario");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6ee" }}>
      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #ff5e32 0%, #e64a21 100%)",
        color: "white",
        padding: "20px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: "60px", filter: "brightness(0) invert(1)" }} />
            <div>
              <h1 style={{ margin: "0 0 5px 0" }}>Crear Nuevo Usuario</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
                Completa el formulario para crear un nuevo usuario
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
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🏠 Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 20px",
                background: "#202d35",
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
          <form onSubmit={handleSubmit}>

            {/* Nombre completo */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Nombre Completo *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing: "border-box"
                }}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing: "border-box"
                }}
                placeholder="usuario@ejemplo.com"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Contraseña *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing: "border-box"
                }}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {/* Teléfono */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing: "border-box"
                }}
                placeholder="+57 300 123 4567"
              />
            </div>

            {/* Rol */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing: "border-box"
                }}
              >
                <option value="admin">🔴 Admin - Acceso total</option>
                <option value="manager">🟠 Manager - Gestiona organización</option>
                <option value="operator">🟡 Operator - Opera dispositivos</option>
                <option value="viewer">🟢 Viewer - Solo visualización</option>
              </select>
            </div>

            {/* Organización */}
            {currentUser?.role?.toUpperCase() === 'SUPER_ADMIN' && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151"
                }}>
                  Organización *
                </label>
                <select
                  name="organization_id"
                  value={formData.organization_id}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "15px",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="">Seleccionar organización...</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Información de roles */}
            <div style={{
              padding: "15px",
              background: "#eff6ff",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
              color: "#1e40af"
            }}>
              <strong>ℹ️ Información:</strong>
              <ul style={{ margin: "8px 0 0 20px", paddingLeft: 0 }}>
                <li><strong>ADMIN:</strong> Acceso total al sistema</li>
                <li><strong>MANAGER:</strong> Gestiona usuarios de su organización</li>
                <li><strong>OPERATOR:</strong> Opera y configura dispositivos</li>
                <li><strong>VIEWER:</strong> Solo visualización de datos</li>
              </ul>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => router.push("/admin/users")}
                disabled={loading}
                style={{
                  padding: "12px 24px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "600"
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px 24px",
                  background: loading ? "#9ca3af" : "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "600"
                }}
              >
                {loading ? "Creando..." : "✅ Crear Usuario"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
