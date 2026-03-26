"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

export default function StatsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [healthStats, setHealthStats] = useState(null);
  const [dailySteps, setDailySteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  
  // Estados para filtro de fechas
  const [dateRange, setDateRange] = useState('7days'); // 'today', '7days', '30days', '90days', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Calcular fechas según el preset seleccionado
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch(dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start.setDate(start.getDate() - 7);
        break;
      case '30days':
        start.setDate(start.getDate() - 30);
        break;
      case '90days':
        start.setDate(start.getDate() - 90);
        break;
      case 'custom':
        if (startDate && endDate) {
          return {
            start: new Date(startDate).toISOString(),
            end: new Date(endDate + 'T23:59:59').toISOString()
          };
        }
        start.setDate(start.getDate() - 7); // Default a 7 días si no hay fechas custom
        break;
    }
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  };

  // Cargar dispositivos primero
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    
    loadDevices();
  }, []);

  // Cargar datos cuando los dispositivos estén listos o cambie la selección o fechas
  useEffect(() => {
    if (devicesLoaded) {
      loadData();
      const interval = setInterval(loadData, 60000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice, devicesLoaded, dateRange, startDate, endDate]);

  const loadDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${API_URL}/api/devices`, { headers });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const userDevices = Array.isArray(data) ? data : [];
        setDevices(userDevices);

        // Si el usuario tiene un solo dispositivo, seleccionarlo automáticamente
        if (userDevices.length === 1) {
          setSelectedDevice(userDevices[0].id.toString());
        }
        // Si tiene múltiples dispositivos, dejar "all" (mostrará solo sus dispositivos)
        
        setDevicesLoaded(true);
      }
    } catch (error) {
      console.error("Error cargando dispositivos:", error);
      setDevicesLoaded(true);
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const dates = getDateRange();
      const deviceParam = selectedDevice !== 'all' ? `device_id=${selectedDevice}&` : '';
      const dateParams = `start_date=${dates.start}&end_date=${dates.end}`;
      
      // Calcular días para pasos según el rango
      const daysDiff = Math.ceil((new Date(dates.end) - new Date(dates.start)) / (1000 * 60 * 60 * 24));
      const stepsDeviceParam = selectedDevice !== 'all' ? `device_id=${devices.find(d => d.id === parseInt(selectedDevice))?.imei}&` : '';
      const stepsParam = `${stepsDeviceParam}days=${Math.min(daysDiff, 365)}`;
      
      const [statsRes, healthRes, stepsRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/dashboard?${deviceParam}${dateParams}`, { headers }),
        fetch(`${API_URL}/api/stats/health?${deviceParam}${dateParams}`, { headers }),
        fetch(`${API_URL}/api/stats/daily-steps?${stepsParam}`, { headers })
      ]);

      if (statsRes.status === 401 || healthRes.status === 401 || stepsRes.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const statsData = await statsRes.json();
      const healthData = await healthRes.json();
      const stepsData = await stepsRes.json();

      setStats(statsData);
      setHealthStats(healthData);
      setDailySteps(Array.isArray(stepsData) ? stepsData : []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Preparar datos para gráfica de severidad
  const severityData = stats ? [
    { name: 'Críticas', value: stats.alerts?.last24h?.critical || 0 },
    { name: 'Altas', value: stats.alerts?.last24h?.high || 0 },
    { name: 'Medias', value: (stats.alerts?.last24h?.total || 0) - (stats.alerts?.last24h?.critical || 0) - (stats.alerts?.last24h?.high || 0) }
  ].filter(item => item.value > 0) : [];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#6b7280", marginBottom: "8px" }}>⏳ Cargando estadísticas...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6ee", padding: "20px" }}>
      <div style={{ maxWidth: "1800px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #9dc4d5 0%, #7db4ce 100%)", padding: "20px 30px", borderRadius: "12px", marginBottom: "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: "60px", filter: "brightness(0) invert(1)" }} />
              <div>
                <h1 style={{ fontSize: "32px", fontWeight: "700", color: "white", margin: "0 0 8px 0" }}>
                  Estadísticas y Análisis
                </h1>
                <p style={{ color: "rgba(255,255,255,0.9)", margin: 0 }}>
                  Análisis detallado de actividad, alertas y datos de salud
                  {selectedDevice !== 'all' && (
                    <span style={{ color: "#e1ff63", fontWeight: "600", marginLeft: "8px" }}>
                      • Filtrado por dispositivo
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "15px" }}>
            {/* Selector de dispositivo */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "white" }}>
                Dispositivo:
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "white",
                  color: "#333",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  minWidth: "200px"
                }}
              >
                <option value="all">📊 Todos los dispositivos</option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>
                    📱 {device.name || device.imei}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de rango de fechas */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                Período:
              </label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setShowCustomDates(e.target.value === 'custom');
                }}
                style={{
                  padding: "8px 12px",
                  background: "white",
                  color: "#333",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  minWidth: "160px"
                }}
              >
                <option value="today">📅 Hoy</option>
                <option value="7days">📅 Últimos 7 días</option>
                <option value="30days">📅 Últimos 30 días</option>
                <option value="90days">📅 Últimos 90 días</option>
                <option value="custom">🗓️ Personalizado</option>
              </select>
            </div>

            {/* Date pickers para rango personalizado */}
            {showCustomDates && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                    Desde:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().split('T')[0]}
                    style={{
                      padding: "7px 10px",
                      background: "white",
                      color: "#333",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>
                    Hasta:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    style={{
                      padding: "7px 10px",
                      background: "white",
                      color: "#333",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}
                  />
                </div>
              </>
            )}

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
                background: "#ff5e32",
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

        {/* Sección: Actividad y Alertas */}
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", marginBottom: "20px" }}>
            🚨 Actividad y Alertas
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "20px" }}>

            {/* Gráfica de Actividad por Día */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                📈 Eventos por Día (7 días)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats?.activity?.eventsByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="count" stroke="#667eea" fill="#667eea" fillOpacity={0.3} name="Eventos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica de Alertas por Tipo */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                📊 Alertas por Tipo (7 días)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.alerts?.byType || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="alert_type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#f59e0b" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribución de Severidad */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                🎯 Distribución por Severidad (24h)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Batería Promedio */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                🔋 Tendencia de Batería (7 días)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={healthStats?.batteryTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg_battery" stroke="#f59e0b" strokeWidth={2} name="Batería Promedio (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>

        {/* Sección: Actividad Física - Pasos Diarios */}
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", marginBottom: "20px" }}>
            🚶 Actividad Física
          </h2>

          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                📊 Evolución de Pasos Diarios (Últimos 14 Días)
              </h3>
              {dailySteps.length > 0 && (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  Total: {dailySteps.reduce((sum, day) => sum + (day.steps || 0), 0).toLocaleString()} pasos
                </div>
              )}
            </div>

            {dailySteps.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚶</div>
                <div style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>
                  Sin datos de pasos disponibles
                </div>
                <div style={{ fontSize: "14px" }}>
                  Los datos aparecerán cuando el dispositivo envíe información
                </div>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dailySteps}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value.toLocaleString() + ' pasos', 'Pasos']}
                      labelFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('es-CO', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="steps" 
                      fill="#8b5cf6" 
                      name="Pasos del día"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* Estadísticas resumidas */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
                  gap: "16px", 
                  marginTop: "24px",
                  padding: "20px",
                  background: "#f9fafb",
                  borderRadius: "8px"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#8b5cf6" }}>
                      {Math.round(dailySteps.reduce((sum, day) => sum + (day.steps || 0), 0) / dailySteps.length).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      Promedio diario
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#10b981" }}>
                      {Math.max(...dailySteps.map(day => day.steps || 0)).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      Día más activo
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#f59e0b" }}>
                      {dailySteps.filter(day => (day.steps || 0) >= 10000).length}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      Días con 10k+ pasos
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#3b82f6" }}>
                      {dailySteps[0]?.steps?.toLocaleString() || 0}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      Hoy
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sección: Datos de Salud */}
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", marginBottom: "20px" }}>
            ❤️ Datos de Salud
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "20px" }}>

            {/* Frecuencia Cardíaca */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                💓 Frecuencia Cardíaca (24h)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={healthStats?.heartRate || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickFormatter={formatDateTime} />
                  <YAxis domain={[40, 180]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" strokeWidth={2} name="BPM" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Presión Arterial */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                🩺 Presión Arterial (24h)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={healthStats?.bloodPressure || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickFormatter={formatDateTime} />
                  <YAxis domain={[40, 180]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="systolic_pressure" stroke="#f59e0b" strokeWidth={2} name="Sistólica" dot={false} />
                  <Line type="monotone" dataKey="diastolic_pressure" stroke="#3b82f6" strokeWidth={2} name="Diastólica" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* SpO2 */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                🫁 Saturación de Oxígeno (24h)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={healthStats?.spo2 || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickFormatter={formatDateTime} />
                  <YAxis domain={[85, 100]} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="spo2" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="SpO2 (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Resumen de Salud */}
            <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                📋 Resumen de Salud (24h)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                <div style={{ padding: "16px", background: "#fef3c7", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
                  <div style={{ fontSize: "13px", color: "#92400e", fontWeight: "600", marginBottom: "4px" }}>Frecuencia Cardíaca</div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937" }}>
                    {healthStats?.summary?.avgHeartRate || '--'} BPM
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                    Promedio • Rango: {healthStats?.summary?.minHeartRate || '--'} - {healthStats?.summary?.maxHeartRate || '--'}
                  </div>
                </div>

                <div style={{ padding: "16px", background: "#dbeafe", borderRadius: "8px", borderLeft: "4px solid #3b82f6" }}>
                  <div style={{ fontSize: "13px", color: "#1e40af", fontWeight: "600", marginBottom: "4px" }}>Presión Arterial</div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937" }}>
                    {healthStats?.summary?.avgSystolic || '--'}/{healthStats?.summary?.avgDiastolic || '--'}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Promedio (mmHg)</div>
                </div>

                <div style={{ padding: "16px", background: "#d1fae5", borderRadius: "8px", borderLeft: "4px solid #10b981" }}>
                  <div style={{ fontSize: "13px", color: "#065f46", fontWeight: "600", marginBottom: "4px" }}>Saturación O2</div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937" }}>
                    {healthStats?.summary?.avgSpo2 || '--'}%
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                    Promedio • Mín: {healthStats?.summary?.minSpo2 || '--'}%
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Alertas Críticas Recientes */}
        {stats?.alerts?.recentCritical?.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>
              🆘 Alertas Críticas Recientes
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {stats.alerts.recentCritical.map((alert, idx) => (
                <div key={idx} style={{
                  padding: "16px",
                  background: "#fee2e2",
                  borderLeft: "4px solid #dc2626",
                  borderRadius: "6px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
                        {alert.message}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>
                        {alert.device_name} ({alert.imei})
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {new Date(alert.alert_time).toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
