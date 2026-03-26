"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [currentUser, setCurrentUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "VIEWER",
    organization_id: "",
    phone: "",
    is_active: true
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

    // Verificar permisos (case-insensitive)
    const roleUpper = user.role?.toUpperCase();
    if (roleUpper !== 'ADMIN' && roleUpper !== 'MANAGER') {
      router.push("/dashboard");
      return;
    }

    loadOrganizations();
    loadUser();
  }, [userId]);

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
      }
    } catch (error) {
      console.error("Error cargando organizaciones:", error);
    }
  };

  const loadUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFormData({
          email: data.email || "",
          password: "",
          full_name: data.full_name || "",
          role: data.role || "VIEWER",
          organization_id: data.organization_id || "",
          phone: data.phone || "",
          is_active: data.is_active
        });
      } else {
        setError("Error cargando usuario");
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

      // Solo enviar password si se ingresó uno nuevo
      const dataToSend = { ...formData };
      if (!dataToSend.password) {
        delete dataToSend.password;
      }

      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Usuario actualizado correctamente");
        router.push("/admin/users");
      } else {
        setError(data.error || "Error actualizando usuario");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // DESACTIVAR (soft delete)
  const handleDeactivate = async () => {
    if (currentUser?.id === userId) {
      alert("❌ No puedes desactivarte a ti mismo");
      return;
    }

    const userName = userData?.full_name || userData?.email || "este usuario";

    if (!confirm(`⚠️ ¿Desactivar a ${userName}?\n\nEl usuario no podrá iniciar sesión pero sus datos se conservarán.`)) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Usuario desactivado correctamente");
        router.push("/admin/users");
      } else {
        setError(data.error || "Error desactivando usuario");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  // ELIMINAR PERMANENTEMENTE (hard delete)
  const handlePermanentDelete = async () => {
    if (currentUser?.id === userId) {
      alert("❌ No puedes eliminarte a ti mismo");
      return;
    }

    // Solo ADMIN puede eliminar permanentemente
    if (currentUser?.role?.toUpperCase() !== 'ADMIN') {
      alert("❌ Solo ADMIN puede eliminar usuarios permanentemente");
      return;
    }

    const userName = userData?.full_name || userData?.email || "este usuario";

    if (!confirm(`🚨 ELIMINAR PERMANENTEMENTE a ${userName}?\n\n⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER\n\n✅ Se eliminarán TODOS los datos del usuario\n✅ Esta acción es IRREVERSIBLE\n\n¿Estás ABSOLUTAMENTE SEGURO?`)) {
      return;
    }

    // Doble confirmación
    if (!confirm(`🚨 ÚLTIMA CONFIRMACIÓN\n\n¿Realmente quieres ELIMINAR PERMANENTEMENTE todos los datos de ${userName}?`)) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/users/${userId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Usuario eliminado permanentemente");
        router.push("/admin/users");
      } else {
        setError(data.error || "Error eliminando usuario");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#6b7280" }}>⏳ Cargando usuario...</div>
        </div>
      </div>
    );
  }

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
              <h1 style={{ margin: "0 0 5px 0" }}>Editar Usuario</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
                Modifica la información del usuario
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
                Nueva Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                minLength="6"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing: "border-box"
                }}
                placeholder="Dejar en blanco para no cambiar"
              />
              <small style={{ color: "#6b7280", fontSize: "13px" }}>
                Solo completa este campo si deseas cambiar la contraseña
              </small>
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
              />
            </div>

            {/* Rol - Solo si tiene permisos */}
            {(currentUser?.role?.toUpperCase() === 'ADMIN' || currentUser?.role?.toUpperCase() === 'MANAGER') && (
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
                  {currentUser?.role?.toUpperCase() === 'ADMIN' && (
                    <option value="ADMIN">🔴 Admin - Acceso total al sistema</option>
                  )}
                  <option value="MANAGER">🟠 Manager - Gestiona usuarios de su organización</option>
                  <option value="OPERATOR">🟡 Operator - Opera y configura dispositivos</option>
                  <option value="VIEWER">🟢 Viewer - Solo visualización de datos</option>
                </select>
              </div>
            )}

            {/* Organización - Solo ADMIN */}
            {currentUser?.role?.toUpperCase() === 'ADMIN' && (
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

            {/* Estado activo/inactivo */}
            {(currentUser?.role?.toUpperCase() === 'ADMIN' || currentUser?.role?.toUpperCase() === 'MANAGER') && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer"
                    }}
                  />
                  <span style={{ fontWeight: "600", color: "#374151" }}>
                    Usuario activo
                  </span>
                </label>
                <small style={{ color: "#6b7280", fontSize: "13px", marginLeft: "28px", display: "block", marginTop: "5px" }}>
                  Los usuarios inactivos no pueden iniciar sesión
                </small>
              </div>
            )}

            {/* Botones de acción */}
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "space-between",
              marginTop: "30px",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "20px"
            }}>
              {/* Botones de eliminación (izquierda) */}
              {(currentUser?.role?.toUpperCase() === 'ADMIN' || currentUser?.role?.toUpperCase() === 'MANAGER') && currentUser?.id !== userId && (
                <div style={{ display: "flex", gap: "12px" }}>
                  {/* Desactivar */}
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={deleting || saving}
                    style={{
                      padding: "12px 24px",
                      background: deleting ? "#9ca3af" : "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: (deleting || saving) ? "not-allowed" : "pointer",
                      fontWeight: "600"
                    }}
                  >
                    {deleting ? "Procesando..." : "🔒 Desactivar"}
                  </button>

                  {/* Eliminar permanentemente - SOLO ADMIN */}
                  {currentUser?.role?.toUpperCase() === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={handlePermanentDelete}
                      disabled={deleting || saving}
                      style={{
                        padding: "12px 24px",
                        background: deleting ? "#9ca3af" : "#ff5e32",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: (deleting || saving) ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      {deleting ? "Eliminando..." : "🗑️ Eliminar Permanentemente"}
                    </button>
                  )}
                </div>
              )}

              {/* Botones cancelar/guardar (derecha) */}
              <div style={{ display: "flex", gap: "12px", marginLeft: "auto" }}>
                <button
                  type="button"
                  onClick={() => router.push("/admin/users")}
                  disabled={saving || deleting}
                  style={{
                    padding: "12px 24px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    cursor: (saving || deleting) ? "not-allowed" : "pointer",
                    fontWeight: "600"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || deleting}
                  style={{
                    padding: "12px 24px",
                    background: (saving || deleting) ? "#9ca3af" : "#9dc4d5",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: (saving || deleting) ? "not-allowed" : "pointer",
                    fontWeight: "600"
                  }}
                >
                  {saving ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
