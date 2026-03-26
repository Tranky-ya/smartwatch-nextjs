"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function GeofencesPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const [geofences, setGeofences] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFence, setEditingFence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    center_lat: "6.244203",
    center_lng: "-75.581215",
    radius_meters: 500,
    user_id: ""
  });

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const circleRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const userDataStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userDataStr || !token) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userDataStr);
    setCurrentUser(user);

    loadGeofences();

    // Solo cargar usuarios VIEWER si NO es VIEWER
    if (user.role?.toUpperCase() !== 'VIEWER') {
      loadViewers();
    }
  }, []);

  useEffect(() => {
    if (showForm && mapRef.current && !mapInstance.current) {
      initMap();
    }
  }, [showForm]);

  useEffect(() => {
    if (mapInstance.current) {
      updateMapPreview();
    }
  }, [formData.center_lat, formData.center_lng, formData.radius_meters]);

  const loadViewers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users/viewers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setViewers(data);
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  };

  const initMap = async () => {
    try {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const lat = parseFloat(formData.center_lat) || 6.244203;
      const lng = parseFloat(formData.center_lng) || -75.581215;

      const map = L.map(mapRef.current).setView([lat, lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19
      }).addTo(map);

      mapInstance.current = map;

      map.on("click", (e) => {
        setFormData(prev => ({
          ...prev,
          center_lat: e.latlng.lat.toFixed(6),
          center_lng: e.latlng.lng.toFixed(6)
        }));
      });

      updateMapPreview();
    } catch (error) {
      console.error("Error inicializando mapa:", error);
    }
  };

  const updateMapPreview = async () => {
    if (!mapInstance.current) return;

    try {
      const L = await import("leaflet");

      const lat = parseFloat(formData.center_lat);
      const lng = parseFloat(formData.center_lng);
      const radius = parseInt(formData.radius_meters) || 500;

      if (isNaN(lat) || isNaN(lng)) return;

      if (circleRef.current) circleRef.current.remove();
      if (markerRef.current) markerRef.current.remove();

      circleRef.current = L.circle([lat, lng], {
        color: "#667eea",
        fillColor: "#667eea",
        fillOpacity: 0.3,
        weight: 3,
        radius: radius
      }).addTo(mapInstance.current);

      markerRef.current = L.marker([lat, lng]).addTo(mapInstance.current)
        .bindPopup("<b>" + (formData.name || "Nueva Geocerca") + "</b><br>Radio: " + radius + "m");

      mapInstance.current.setView([lat, lng], 14);

      setTimeout(() => {
        if (circleRef.current) {
          mapInstance.current.fitBounds(circleRef.current.getBounds(), { padding: [50, 50] });
        }
      }, 100);

    } catch (error) {
      console.error("Error actualizando preview:", error);
    }
  };

  const loadGeofences = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/geofences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setGeofences(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      const payload = {
        organization_id: user.organization_id || "e5998eca-315a-44c6-a352-90d22380c5e8",
        name: formData.name,
        description: formData.description,
        center_lat: parseFloat(formData.center_lat),
        center_lng: parseFloat(formData.center_lng),
        radius_meters: parseInt(formData.radius_meters)
      };

      // Solo enviar user_id si NO es VIEWER (VIEWER se asigna automáticamente en backend)
      if (user.role?.toUpperCase() !== 'VIEWER' && formData.user_id) {
        payload.user_id = formData.user_id;
      }

      const url = editingFence
        ? `${API_URL}/api/geofences/${editingFence.id}`
        : `${API_URL}/api/geofences`;

      const res = await fetch(url, {
        method: editingFence ? "PUT" : "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingFence ? "✅ Geocerca actualizada" : "✅ Geocerca creada");
        closeForm();
        loadGeofences();
      } else {
        const error = await res.json();
        alert("❌ Error: " + error.error);
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingFence(null);
    setFormData({
      name: "",
      description: "",
      center_lat: "6.244203",
      center_lng: "-75.581215",
      radius_meters: 500,
      user_id: ""
    });

    if (circleRef.current) circleRef.current.remove();
    if (markerRef.current) markerRef.current.remove();
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
  };

const editGeofence = (fence) => {
    console.log("🔍 Editando geocerca:", fence); // Debug
    console.log("🔍 User ID de la geocerca:", fence.user_id); // Debug
    
    setEditingFence(fence);
    setFormData({
      name: fence.name,
      description: fence.description || "",
      center_lat: fence.center_lat.toString(),
      center_lng: fence.center_lng.toString(),
      radius_meters: fence.radius_meters,
      user_id: fence.user_id || "" // <-- Esto debe estar
    });
    setShowForm(true);
  };

  const deleteGeofence = async (id) => {
    if (!confirm("¿Eliminar esta geocerca?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/geofences/${id}`, { 
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      loadGeofences();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  const isViewer = currentUser?.role?.toUpperCase() === 'VIEWER';

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6ee" }}>
      <div style={{ background: "linear-gradient(135deg, #e1ff63 0%, #d1ef53 100%)", color: "#202d35", padding: "20px 30px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: "60px" }} />
            <div>
              <h1 style={{ margin: "0 0 5px 0", fontSize: "28px" }}>Gestión de Geocercas</h1>
              <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>Define zonas geográficas</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "10px 20px", background: "#202d35", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🏠 Dashboard</button>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "10px 20px", background: "#202d35", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🗺️ Mapa</button>
            <button onClick={handleLogout} style={{ padding: "10px 20px", background: "#ff5e32", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🚪 Cerrar Sesión</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px" }}>
        <button onClick={() => showForm ? closeForm() : setShowForm(true)} style={{ padding: "12px 24px", background: showForm ? "#ff5e32" : "#202d35", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", marginBottom: "20px" }}>
          {showForm ? "✕ Cancelar" : "➕ Nueva Geocerca"}
        </button>

        {showForm && (
          <div style={{ background: "white", padding: "30px", borderRadius: "10px", marginBottom: "30px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            <h2 style={{ marginTop: 0 }}>{editingFence ? "✏️ Editar" : "🆕 Nueva"} Geocerca</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "450px 1fr", gap: "30px" }}>
                <div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Nombre *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Descripción</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", minHeight: "80px" }} />
                  </div>

                  {/* Selector de usuario - Solo para ADMIN/MANAGER/OPERATOR */}
                  {!isViewer && (
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Asignar a Usuario VIEWER</label>
                      <select 
                        value={formData.user_id} 
                        onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                        style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                      >
                        <option value="">Sin asignar</option>
                        {viewers.map(viewer => (
                          <option key={viewer.id} value={viewer.id}>
                            {viewer.full_name} ({viewer.email})
                          </option>
                        ))}
                      </select>
                      <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "5px" }}>
                        La geocerca se asignará al usuario seleccionado
                      </small>
                    </div>
                  )}

                  {/* Información para VIEWER */}
                  {isViewer && (
                    <div style={{ 
                      marginBottom: "20px", 
                      padding: "12px", 
                      background: "#dbeafe", 
                      borderRadius: "6px",
                      border: "1px solid #60a5fa"
                    }}>
                      <div style={{ fontSize: "13px", color: "#1e40af" }}>
                        👤 Esta geocerca se asignará automáticamente a ti
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Radio (m) *</label>
                    <input type="number" value={formData.radius_meters} onChange={(e) => setFormData({...formData, radius_meters: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} min="50" max="5000" step="50" />
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Latitud *</label>
                    <input type="number" step="0.000001" required value={formData.center_lat} onChange={(e) => setFormData({...formData, center_lat: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Longitud *</label>
                    <input type="number" step="0.000001" required value={formData.center_lng} onChange={(e) => setFormData({...formData, center_lng: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
                  </div>
                  <button type="submit" disabled={loading} style={{ 
                    width: "100%", 
                    padding: "15px", 
                    background: loading ? "#ccc" : "#9dc4d5", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "6px", 
                    cursor: loading ? "not-allowed" : "pointer", 
                    fontWeight: "bold" 
                  }}>
                    {loading ? "⏳ Guardando..." : editingFence ? "✓ Actualizar" : "✓ Crear"}
                  </button>
                </div>
                <div>
                  <div style={{ background: "#f5f6ee", padding: "15px", borderRadius: "8px", marginBottom: "15px", border: "2px solid #e1ff63" }}>
                    <strong>🗺️ Mapa Interactivo</strong>
                    <div style={{ fontSize: "13px", marginTop: "5px", color: "#202d35" }}>Haz clic para seleccionar ubicación</div>
                  </div>
                  <div ref={mapRef} style={{ width: "100%", height: "500px", border: "3px solid #e1ff63", borderRadius: "8px", background: "#e5e7eb" }} />
                </div>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
          {geofences.map(fence => (
            <div key={fence.id} style={{ 
              background: "white", 
              padding: "20px", 
              borderRadius: "10px", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)", 
              border: fence.is_active ? "3px solid #e1ff63" : "2px solid #d1d5db" 
            }}>
              <div style={{ marginBottom: "15px" }}>
                <h3 style={{ margin: "0 0 5px 0", color: "#202d35" }}>{fence.name}</h3>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{fence.description || "Sin descripción"}</p>
              </div>

              {/* Mostrar usuario asignado */}
              {fence.assigned_user_name && (
                <div style={{
                  padding: "10px",
                  background: "#f5f6ee",
                  borderRadius: "6px",
                  marginBottom: "15px",
                  fontSize: "13px",
                  border: "1px solid #9dc4d5"
                }}>
                  <div style={{ color: "#202d35", fontWeight: "600" }}>
                    👤 Asignado a: {fence.assigned_user_name}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "3px" }}>
                    {fence.assigned_user_email}
                  </div>
                </div>
              )}

              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "15px" }}>
                <div>📍 {fence.center_lat?.toFixed(6)}, {fence.center_lng?.toFixed(6)}</div>
                <div>📏 Radio: {fence.radius_meters}m</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button onClick={() => editGeofence(fence)} style={{ 
                  padding: "8px", 
                  background: "#9dc4d5", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px", 
                  cursor: "pointer", 
                  fontWeight: "bold" 
                }}>✏️ Editar</button>
                <button onClick={() => deleteGeofence(fence.id)} style={{ 
                  padding: "8px", 
                  background: "#ff5e32", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px", 
                  cursor: "pointer", 
                  fontWeight: "bold" 
                }}>🗑️ Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
