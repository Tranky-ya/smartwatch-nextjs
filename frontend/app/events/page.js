"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EventsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [filters, setFilters] = useState({
    device_id: "",
    event_type: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Verificar autenticación al montar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  // Cargar dispositivos primero y establecer filtro automático
  useEffect(() => {
    if (isAuthenticated && !initialLoadDone) {
      loadDevicesAndSetFilter();
    }
  }, [isAuthenticated, initialLoadDone]);

  useEffect(() => {
    if (isAuthenticated && initialLoadDone) {
      loadEvents();
      const interval = setInterval(loadEvents, 15000);
      return () => clearInterval(interval);
    }
  }, [filters, isAuthenticated, initialLoadDone]);

  const loadDevicesAndSetFilter = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const devicesRes = await fetch(`${API_URL}/api/devices`, { headers });

      if (devicesRes.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      if (!devicesRes.ok) {
        throw new Error('Error al cargar dispositivos');
      }

      const devicesData = await devicesRes.json();
      const userDevices = Array.isArray(devicesData) ? devicesData : [];
      setDevices(userDevices);

      // Si el usuario tiene dispositivos asignados, establecer filtro
      if (userDevices.length > 0) {
        // Si tiene un solo dispositivo, seleccionarlo automáticamente
        if (userDevices.length === 1) {
          setFilters(prev => ({ ...prev, device_id: userDevices[0].id.toString() }));
        }
        // Si tiene múltiples, dejar "Todos" pero solo mostrará sus dispositivos
        // porque la API ya filtra por usuario
      }

      setInitialLoadDone(true);
    } catch (error) {
      console.error("Error cargando dispositivos:", error);
      setError(error.message);
      setDevices([]);
      setInitialLoadDone(true);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }
      
      const params = new URLSearchParams();
      if (filters.device_id) params.append('device_id', filters.device_id);
      if (filters.event_type) params.append('event_type', filters.event_type);
      params.append('limit', '100');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const eventsRes = await fetch(`${API_URL}/api/geofence-events?${params}`, { headers });

      if (eventsRes.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      if (!eventsRes.ok) {
        throw new Error('Error al cargar eventos del servidor');
      }

      const eventsData = await eventsRes.json();
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error("Error cargando eventos:", error);
      setError(error.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventIcon = (event) => {
    if (event.source === 'GEOFENCE') {
      return event.event_type === 'ENTER' ? '🟢' : '🔴';
    }
    // Alertas
    if (event.event_type === 'SOS') return '🆘';
    if (event.event_type === 'FALL_DOWN') return '⚠️';
    if (event.event_type === 'LOW_BATTERY') return '🔋';
    if (event.event_type === 'TAKE_OFF') return '⌚';
    if (event.event_type === 'POWER_OFF') return '⚡';
    if (event.event_type === 'POWER_ON') return '🔌';
    return '📢';
  };

  const getEventColor = (event) => {
    if (event.source === 'GEOFENCE') {
      return event.event_type === 'ENTER' ? '#10b981' : '#ef4444';
    }
    // Alertas por severidad
    if (event.alert_severity === 'CRITICAL') return '#dc2626';
    if (event.alert_severity === 'HIGH') return '#f59e0b';
    if (event.alert_severity === 'MEDIUM') return '#eab308';
    return '#6b7280';
  };

  const getEventLabel = (event) => {
    if (event.source === 'GEOFENCE') {
      return event.event_type === 'ENTER' ? 'Entrada' : 'Salida';
    }
    // Etiquetas para alertas
    if (event.event_type === 'SOS') return 'SOS';
    if (event.event_type === 'FALL_DOWN') return 'CAÍDA';
    if (event.event_type === 'LOW_BATTERY') return 'Batería Baja';
    if (event.event_type === 'TAKE_OFF') return 'Removido';
    if (event.event_type === 'POWER_OFF') return 'Apagado';
    if (event.event_type === 'POWER_ON') return 'Encendido';
    return event.event_type;
  };

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6ee", padding: "20px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #ff5e32 0%, #ff7852 100%)", padding: "20px 30px", borderRadius: "12px", marginBottom: "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: "60px", filter: "brightness(0) invert(1)" }} />
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", margin: "0 0 8px 0" }}>
                  Eventos y Alertas
                </h1>
                <p style={{ color: "rgba(255,255,255,0.9)", margin: 0 }}>
                  Geocercas, caídas, SOS y alertas del sistema
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
                  fontWeight: "600"
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
                  fontWeight: "600"
                }}
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
            Filtros
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Dispositivo
              </label>
              <select
                value={filters.device_id}
                onChange={(e) => setFilters({ ...filters, device_id: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="">Todos los dispositivos</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Tipo de Evento
              </label>
              <select
                value={filters.event_type}
                onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="">Todos los eventos</option>
                <optgroup label="Geocercas">
                  <option value="ENTER">Entradas</option>
                  <option value="EXIT">Salidas</option>
                </optgroup>
                <optgroup label="Alertas">
                  <option value="SOS">SOS</option>
                  <option value="FALL_DOWN">Caídas</option>
                  <option value="LOW_BATTERY">Batería Baja</option>
                  <option value="TAKE_OFF">Removido</option>
                  <option value="POWER_OFF">Apagado</option>
                </optgroup>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={() => setFilters({ device_id: "", event_type: "" })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151"
                }}
              >
                Limpiar Filtros
              </button>
            </div>

          </div>
        </div>

        {/* Tabla de Eventos */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
              Eventos Recientes ({events.length})
            </h3>
          </div>

          {error ? (
            <div style={{ 
              padding: "60px", 
              textAlign: "center", 
              background: "#fef2f2",
              borderRadius: "8px",
              margin: "20px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
              <div style={{ color: "#991b1b", fontWeight: "600", marginBottom: "8px" }}>
                Error al cargar eventos
              </div>
              <div style={{ color: "#dc2626", fontSize: "14px" }}>
                {error}
              </div>
              <button
                onClick={loadData}
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
              Cargando eventos...
            </div>
          ) : events.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
              No se encontraron eventos
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                      Evento
                    </th>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                      Dispositivo
                    </th>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                      Detalles
                    </th>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                      Ubicación
                    </th>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                      Fecha y Hora
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={`${event.source}-${event.id}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "20px" }}>{getEventIcon(event)}</span>
                          <span style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: getEventColor(event)
                          }}>
                            {getEventLabel(event)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: "#1f2937" }}>
                          {event.device_name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                          {event.imei}
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {event.source === 'GEOFENCE' ? (
                          <span style={{ fontSize: "14px", color: "#1f2937" }}>
                            {event.geofence_name}
                          </span>
                        ) : (
                          <div>
                            <div style={{ fontSize: "13px", color: "#1f2937" }}>
                              {event.alert_message}
                            </div>
                            {event.alert_severity && (
                              <span style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: event.alert_severity === 'CRITICAL' ? '#fee2e2' : 
                                           event.alert_severity === 'HIGH' ? '#fef3c7' : '#f3f4f6',
                                color: event.alert_severity === 'CRITICAL' ? '#991b1b' : 
                                       event.alert_severity === 'HIGH' ? '#92400e' : '#374151',
                                marginTop: "4px",
                                display: "inline-block"
                              }}>
                                {event.alert_severity}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {event.latitude && event.longitude ? (
                          <div style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace" }}>
                            {parseFloat(event.latitude).toFixed(6)}, {parseFloat(event.longitude).toFixed(6)}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#9ca3af" }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ fontSize: "13px", color: "#6b7280" }}>
                          {formatDate(event.time)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
