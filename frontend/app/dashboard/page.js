"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { solicitarUbicacionActual } from "@/lib/locationRequest";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── Icons (inline SVG to avoid any import issues) ─────────────────────────
const Icon = ({ d, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d={d} />
  </svg>
);

const ICONS = {
  pulse:     "M22 12 18 12 15 21 9 3 6 12 2 12",
  map:       "M3 11l19-9-9 19-2-8-8-2z",
  pin:       "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10 A2 2 0 1 1 10 10",
  heart:     "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  bell:      "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  grid:      "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  bar:       "M18 20V10 M12 20V4 M6 20v-6",
  logout:    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  x:         "M18 6 6 18 M6 6l12 12",
  settings:  "M12 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7",
  search:    "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  zap:       "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  battery:   "M23 7v10H7V7h16z M1 10v4",
  activity:  "M22 12h-4l-3 9L9 3l-3 9H2",
  radio:     "M2 20H22 M7.41 9.76A2 2 0 0 1 7 11 5 5 0 0 0 17 11a2 2 0 0 1-.41-1.24M9.91 7.34A5 5 0 0 1 17 11M12 12 A1 1 0 1 1 11 12",
  arrow:     "M19 12H5 M12 5l-7 7 7 7",
  menu:      "M3 12h18 M3 6h18 M3 18h18",
  plus:      "M12 5v14 M5 12h14",
  clock:     "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z M12 6v6l4 2",
  footprint: "M4 16s-1-4 0-5 5-3 6.5-4.5S14 2 14 2 M12.5 14c.5-1 1-3 2-3s2.5 1 2.5 1 M4 21c.5-1 3-2 4-1s1 2 1 2",
};

export default function MapPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────────────────
  const [devices, setDevices] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("map");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [healthHistory, setHealthHistory] = useState({ intraday: [], daily: [], monthly: [] });
  const [healthRange, setHealthRange] = useState("intraday"); // 'intraday', 'daily', 'monthly'

  // Command states
  const [locReq, setLocReq] = useState({ loading: false, status: "" });
  const [healthReq, setHealthReq] = useState({ loading: false, status: "" });
  const [healthAutoReq, setHealthAutoReq] = useState({ loading: false, status: "" });
  const [findReq, setFindReq] = useState({ loading: false, status: "" });
  const [tempReq, setTempReq] = useState({ loading: false, status: "" });
  
  // Safety states
  const [fallSens, setFallSens] = useState(3);
  const [fallReq, setFallReq] = useState({ loading: false, status: "" });

  // Command feedback toast
  const [cmdNotif, setCmdNotif] = useState(null);
  const cmdNotifTimer = useRef(null);

  // Route + Geofence + Events state
  const [routeDevice, setRouteDevice] = useState(null);
  const [geoForm, setGeoForm] = useState({ visible: false, name: '', lat: '', lng: '', radius: 500, device_id: '' });
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Map
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});
  const routeLayerRef = useRef(null);

  // ─── Nav items ────────────────────────────────────────────────────────────
  const NAV = [
    { id: "dashboard", label: "Dashboard",      icon: ICONS.grid    },
    { id: "map",       label: "Mapa en Vivo",   icon: ICONS.map     },
    { id: "health",    label: "Salud",           icon: ICONS.heart   },
    { id: "safety",    label: "Seguridad",       icon: ICONS.shield  },
    { id: "geofences", label: "Geocercas",       icon: ICONS.pin     },
    { id: "events",    label: "Eventos",         icon: ICONS.bell    },
    { id: "reports",   label: "Reportes",        icon: ICONS.bar     },
    { id: "settings",  label: "Configuración",   icon: ICONS.settings},
  ];

  // ─── Utilities ────────────────────────────────────────────────────────────
  const fmt = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("es-CO", {
      timeZone: "America/Bogota", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  const ago = (d) => {
    if (!d) return "—";
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return "Ahora";
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  };

  const battColor = (v) => v > 50 ? "#22c55e" : v > 20 ? "#f97316" : "#ef4444";

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    initMap();
    loadData();
    const t = setInterval(loadData, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (mapInstance.current) updateMapMarkers(devices, geofences);
  }, [selectedDevice]);

  // Fix: Force Leaflet map resize when switching to Map tab so map tiles load properly
  useEffect(() => {
    if (activeView === "map" && mapInstance.current) {
      setTimeout(() => {
        mapInstance.current.invalidateSize();
      }, 50);
    }
    if (activeView === "events") loadEvents();
  }, [activeView]);

  // ─── Data Loading ─────────────────────────────────────────────────────────
  const loadData = async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    try {
      const [dR, gR] = await Promise.all([
        fetch(`${API_URL}/api/devices`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/geofences`, { headers: authHeaders() }),
      ]);
      if (dR.status === 401) { router.push("/"); return; }
      const dData = await dR.json();
      const gData = await gR.json();
      setDevices(Array.isArray(dData) ? dData : []);
      setGeofences(Array.isArray(gData) ? gData : []);
      updateMapMarkers(Array.isArray(dData) ? dData : [], Array.isArray(gData) ? gData : []);
      
      // Auto-refresh health if a device is selected and we are on the health tab
      if (selectedDevice && activeView === "health") {
        loadHealth(selectedDevice.imei, true);
      }
    } catch {}
  };

  const loadHealth = async (imei, background = false) => {
    try {
      if (!background) {
        setHealthData(null);
        setHealthHistory({ intraday: [], daily: [], monthly: [] });
      }
      const r = await fetch(`${API_URL}/api/devices/${imei}/health`, { headers: authHeaders() });
      if (!r.ok) { setHealthData(null); setHealthHistory({ intraday: [], daily: [], monthly: [] }); return; }
      const data = await r.json();
      if (!data.length) { setHealthData(null); setHealthHistory({ intraday: [], daily: [], monthly: [] }); return; }

      // 1. Current Health Status (Merged latest)
      const merged = { spo2: 0, heart_rate: 0, systolic_pressure: 0, diastolic_pressure: 0, temperature: 0, measurement_time: data[0].measurement_time };
      for (const row of data) {
        if (!merged.spo2 && row.spo2 > 0) merged.spo2 = Number(row.spo2);
        if (!merged.heart_rate && row.heart_rate > 0) merged.heart_rate = Number(row.heart_rate);
        if (!merged.temperature && row.temperature > 0) merged.temperature = Number(row.temperature);
        if (!merged.systolic_pressure && row.systolic_pressure > 0) { 
          merged.systolic_pressure = Number(row.systolic_pressure); 
          merged.diastolic_pressure = Number(row.diastolic_pressure); 
        }
      }
      setHealthData(merged);
      
      const chrono = [...data].reverse();

      // 2. Intraday - Group by minute to avoid fragmented Pulse/Oxygen dots
      const intradayMap = {};
      chrono.forEach(d => {
        // Use a 1-minute bucket for grouping
        const date = new Date(d.measurement_time);
        const minuteKey = date.toISOString().substring(0, 16); // "YYYY-MM-DDTHH:mm"
        
        if (!intradayMap[minuteKey]) {
          intradayMap[minuteKey] = {
            timestamp: date,
            label: date.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: true }),
            bpm: null, sys: null, dia: null, spo2: null, temp: null
          };
        }
        
        if (d.heart_rate > 0) intradayMap[minuteKey].bpm = Number(d.heart_rate);
        if (d.systolic_pressure > 0) intradayMap[minuteKey].sys = Number(d.systolic_pressure);
        if (d.diastolic_pressure > 0) intradayMap[minuteKey].dia = Number(d.diastolic_pressure);
        if (d.spo2 > 0) intradayMap[minuteKey].spo2 = Number(d.spo2);
        if (d.temperature > 0) intradayMap[minuteKey].temp = Number(d.temperature);
      });

      // Convert to array and filter out empty sessions
      const intraday = Object.values(intradayMap)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-40) // Keep last 40 minutes of activity
        .filter(d => d.bpm || d.sys || d.spo2 || d.temp);

      const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + Number(b), 0) / arr.length) : null;

      // 3. Daily - Group by day
      const dailyMap = {};
      chrono.forEach(d => {
        const day = new Date(d.measurement_time).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short" });
        if (!dailyMap[day]) dailyMap[day] = { label: day, bpm: [], sys: [], dia: [], spo2: [], temp: [] };
        if (d.heart_rate > 0) dailyMap[day].bpm.push(d.heart_rate);
        if (d.systolic_pressure > 0) dailyMap[day].sys.push(d.systolic_pressure);
        if (d.diastolic_pressure > 0) dailyMap[day].dia.push(d.diastolic_pressure);
        if (d.spo2 > 0) dailyMap[day].spo2.push(d.spo2);
        if (d.temperature > 0) dailyMap[day].temp.push(d.temperature);
      });
      const daily = Object.values(dailyMap).map(d => ({
        label: d.label, bpm: avg(d.bpm), sys: avg(d.sys), dia: avg(d.dia), spo2: avg(d.spo2), temp: avg(d.temp)
      }));

      // 4. Monthly - Group by month
      const monthlyMap = {};
      chrono.forEach(d => {
        const month = new Date(d.measurement_time).toLocaleDateString("es-CO", { timeZone: "America/Bogota", month: "long" });
        if (!monthlyMap[month]) monthlyMap[month] = { label: month, bpm: [], sys: [], dia: [], spo2: [], temp: [] };
        if (d.heart_rate > 0) monthlyMap[month].bpm.push(d.heart_rate);
        if (d.systolic_pressure > 0) monthlyMap[month].sys.push(d.systolic_pressure);
        if (d.diastolic_pressure > 0) monthlyMap[month].dia.push(d.diastolic_pressure);
        if (d.spo2 > 0) monthlyMap[month].spo2.push(d.spo2);
        if (d.temperature > 0) monthlyMap[month].temp.push(d.temperature);
      });
      const monthly = Object.values(monthlyMap).map(d => ({
        label: d.label, bpm: avg(d.bpm), sys: avg(d.sys), dia: avg(d.dia), spo2: avg(d.spo2), temp: avg(d.temp)
      }));

      setHealthHistory({ intraday, daily, monthly });
    } catch (error) { 
      console.error("Error loading health:", error);
      setHealthData(null); 
      setHealthHistory({ intraday: [], daily: [], monthly: [] }); 
    }
  };

  // ─── Map ──────────────────────────────────────────────────────────────────
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
      const map = L.map(mapRef.current).setView([6.244203, -75.581215], 12);
      // Google Maps style tiles
      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
        maxZoom: 20
      }).addTo(map);
      mapInstance.current = map;
    } catch {}
  };

  const updateMapMarkers = async (devs, geos) => {
    if (!mapInstance.current) return;
    const L = await import("leaflet");
    Object.values(markersRef.current).forEach(m => m.remove());
    Object.values(circlesRef.current).forEach(c => c.remove());
    markersRef.current = {}; circlesRef.current = {};

    geos.forEach(f => {
      if (!f.center_lat || !f.center_lng) return;
      const c = L.circle([f.center_lat, f.center_lng], { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 1.5, radius: f.radius_meters || 500 }).addTo(mapInstance.current);
      circlesRef.current[f.id] = c;
    });

    devs.forEach(d => {
      const lat = parseFloat(d.last_latitude), lng = parseFloat(d.last_longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const sel = selectedDevice?.id === d.id;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${sel?36:26}px;height:${sel?36:26}px;background:${d.is_online?"#22c55e":"#475569"};border:2px solid ${sel?"#3b82f6":"rgba(255,255,255,0.3)"};border-radius:50%;box-shadow:${sel?"0 0 12px rgba(59,130,246,0.5)":"none"};transition:all 0.2s;"></div>`,
        iconSize: [40, 40], iconAnchor: [20, 20],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(mapInstance.current);
      marker.on("click", () => { setSelectedDevice(d); loadHealth(d.imei); if (mapInstance.current) mapInstance.current.setView([lat, lng], 15); });
      markersRef.current[d.id] = marker;
    });
  };

  // ─── Commands ─────────────────────────────────────────────────────────────
  const showNotif = (type, message) => {
    setCmdNotif({ type, message });
    if (cmdNotifTimer.current) clearTimeout(cmdNotifTimer.current);
    cmdNotifTimer.current = setTimeout(() => setCmdNotif(null), 4500);
  };

  const sendCmd = async (imei, command, extra = {}) => {
    try {
      const r = await fetch(`${API_URL}/api/devices/command`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ imei, command, params: extra }) });
      const json = await r.json();
      const healthCmds = ['HR', 'BP', 'SPO2'];
      if (json.success) {
        const note = healthCmds.includes(command.toUpperCase()) ? ` — revisa Salud en ~30s` : '';
        showNotif('success', `${command} enviado${note}`);
      } else {
        showNotif('error', json.error || `Error enviando ${command}`);
      }
      return json;
    } catch {
      showNotif('error', 'Error de conexión con el servidor');
      return { success: false };
    }
  };

  const reqLocation = async (imei) => {
    setLocReq({ loading: true, status: "sending" });
    try {
      const result = await solicitarUbicacionActual(imei);
      if (result.success) {
        setDevices(prev => prev.map(d => d.imei === imei ? { ...d, last_latitude: result.location.latitude, last_longitude: result.location.longitude, updatedAt: result.location.server_time } : d));
        setSelectedDevice(prev => prev ? { ...prev, last_latitude: result.location.latitude, last_longitude: result.location.longitude, updatedAt: result.location.server_time } : prev);
        if (mapInstance.current && result.location.latitude) mapInstance.current.setView([parseFloat(result.location.latitude), parseFloat(result.location.longitude)], 16, { animate: true });
        setLocReq({ loading: false, status: "success" });
      } else {
        setLocReq({ loading: false, status: "error" });
      }
    } catch {
      setLocReq({ loading: false, status: "error" });
    }
    setTimeout(() => setLocReq({ loading: false, status: "" }), 3000);
  };

  const reqHealth = async (imei) => {
    setHealthReq({ loading: true, status: "sending" });
    const r = await sendCmd(imei, "hrtstart");
    setHealthReq({ loading: false, status: r.success ? "success" : "error" });
    setTimeout(() => setHealthReq({ loading: false, status: "" }), 3000);
  };

  const reqTemp = async (imei) => {
    setTempReq({ loading: true, status: "sending" });
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Ráfaga de comandos espaciada para máxima compatibilidad
    await sendCmd(imei, "BT");
    await sleep(500);
    await sendCmd(imei, "BTEMP2");
    await sleep(500);
    await sendCmd(imei, "btemp2");
    await sleep(500);
    const r = await sendCmd(imei, "HT");
    
    setTempReq({ loading: false, status: r.success ? "success" : "error" });
    setTimeout(() => setTempReq({ loading: false, status: "" }), 3000);
  };

  const reqHealthAuto = async (imei) => {
    setHealthAutoReq({ loading: true, status: "sending" });
    const r = await sendCmd(imei, "HEALTHAUTOSET", { value: 60 });
    setHealthAutoReq({ loading: false, status: r.success ? "success" : "error" });
    setTimeout(() => setHealthAutoReq({ loading: false, status: "" }), 3000);
  };

  const reqHealthAutoAll = async () => {
    if(!confirm("¿Deseas activar el reporte de salud cada 1 hora en TODOS los dispositivos?")) return;
    setHealthAutoReq({ loading: true, status: "sending" });
    try {
      await Promise.all(devices.map(d => sendCmd(d.imei, "HEALTHAUTOSET", { value: 60 })));
      setHealthAutoReq({ loading: false, status: "success" });
      setTimeout(() => setHealthAutoReq({ loading: false, status: "" }), 5000);
    } catch {
      setHealthAutoReq({ loading: false, status: "error" });
      setTimeout(() => setHealthAutoReq({ loading: false, status: "" }), 3000);
    }
  };

  const reqFind = async (imei) => {
    setFindReq({ loading: true, status: "sending" });
    const r = await sendCmd(imei, "FIND");
    setFindReq({ loading: false, status: r.success ? "success" : "error" });
    setTimeout(() => setFindReq({ loading: false, status: "" }), 3000);
  };

  const reqFallSync = async (imei) => {
    setFallReq({ loading: true, status: "sending" });
    const r = await sendCmd(imei, "FALLDET", { enable: 1, sensitivity: fallSens });
    setFallReq({ loading: false, status: r.success ? "success" : "error" });
    setTimeout(() => setFallReq({ loading: false, status: "" }), 3000);
  };

  const reqSosSync = async (imei) => {
    const num1 = prompt("Ingrese el número telefónico principal para el botón SOS:");
    if (!num1) return;
    const num2 = prompt("Ingrese el contacto secundario (opcional):") || "";
    const num3 = prompt("Ingrese el contacto terciario (opcional):") || "";
    
    // We send a generic command text for SOS: SOS,num1,num2,num3
    // But since the backend route /api/devices/command wraps it depending on the protocol-parser...
    // Actually, backend `buildDeviceCommand` supports SOS.
    const r = await sendCmd(imei, "SOS", { value: `${num1},${num2},${num3}` });
    alert(r.success ? "¡Contactos SOS sincronizados con éxito al reloj!" : "Hubo un error al enviar al reloj. Asegúrate de que esté en línea.");
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/alerts?limit=100`, { headers: authHeaders() });
      const data = await r.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    setEventsLoading(false);
  };

  const deleteGeofence = async (id) => {
    if (!confirm("¿Eliminar esta geocerca?")) return;
    try {
      const r = await fetch(`${API_URL}/api/geofences/${id}`, { method: "DELETE", headers: authHeaders() });
      const j = await r.json();
      if (j.success) { showNotif("success", "Geocerca eliminada"); loadData(); }
      else showNotif("error", j.error || "Error eliminando");
    } catch { showNotif("error", "Error de conexión"); }
  };

  const createGeofence = async () => {
    const { name, lat, lng, radius, device_id } = geoForm;
    if (!name || !lat || !lng) { showNotif("error", "Nombre, latitud y longitud son requeridos"); return; }
    try {
      const r = await fetch(`${API_URL}/api/geofences`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ name, center_lat: parseFloat(lat), center_lng: parseFloat(lng), radius_meters: parseInt(radius), device_id: device_id || null })
      });
      const j = await r.json();
      if (j.success) { showNotif("success", `Geocerca "${name}" creada`); setGeoForm({ visible: false, name: '', lat: '', lng: '', radius: 500, device_id: '' }); loadData(); }
      else showNotif("error", j.error || "Error creando geocerca");
    } catch { showNotif("error", "Error de conexión"); }
  };

  const showDeviceRoute = async (device) => {
    const L = await import("leaflet");
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
    if (routeDevice === device.id) { setRouteDevice(null); return; }
    try {
      const r = await fetch(`${API_URL}/api/devices/${device.imei}/location-history`, { headers: authHeaders() });
      const positions = await r.json();
      if (!Array.isArray(positions) || positions.length < 2) { showNotif("error", "Sin historial de posiciones recientes"); return; }
      const coords = positions.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
      if (coords.length < 2) { showNotif("error", "Pocas posiciones para trazar ruta"); return; }
      routeLayerRef.current = L.polyline(coords, { color: "#3b82f6", weight: 3, opacity: 0.75 }).addTo(mapInstance.current);
      mapInstance.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30] });
      setRouteDevice(device.id);
      showNotif("success", `Ruta cargada — ${coords.length} posiciones`);
    } catch { showNotif("error", "Error cargando historial de ruta"); }
  };

  // ─── Filtered devices ─────────────────────────────────────────────────────
  const filteredDevices = devices.filter(d =>
    !searchQuery || d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.imei?.includes(searchQuery)
  );

  // ─── Sidebar ──────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <aside className="sidebar" style={{ width: sidebarOpen ? "var(--sidebar-width)" : "var(--sidebar-collapsed)", minWidth: sidebarOpen ? "var(--sidebar-width)" : "var(--sidebar-collapsed)" }}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ width: 28, height: 28, minWidth: 28, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        {sidebarOpen && <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>SmartWatch <span style={{ color: "#3b82f6" }}>Pro</span></span>}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {sidebarOpen && <div className="section-label">PRINCIPAL</div>}
        {NAV.slice(0,5).map(item => (
          <button key={item.id} className={`nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)} style={{ width: "100%", border: "1px solid transparent" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 16 }}>
              <path d={item.icon} />
            </svg>
            {sidebarOpen && <span>{item.label}</span>}
          </button>
        ))}

        {sidebarOpen && <div className="section-label" style={{ marginTop: 8 }}>ANÁLISIS</div>}
        {NAV.slice(5).map(item => (
          <button key={item.id} className={`nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)} style={{ width: "100%", border: "1px solid transparent" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 16 }}>
              <path d={item.icon} />
            </svg>
            {sidebarOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {sidebarOpen && user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>
              {(user.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.full_name || user.email}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{user.role || "Operator"}</div>
            </div>
          </div>
        )}
        <button className="nav-item" onClick={() => setSidebarOpen(v => !v)} style={{ width: "100%", border: "1px solid transparent" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 16, transform: sidebarOpen ? "none" : "rotate(180deg)", transition: "transform 0.25s" }}>
            <path d={ICONS.arrow} />
          </svg>
          {sidebarOpen && <span>Contraer</span>}
        </button>
        <button className="nav-item" onClick={() => { localStorage.removeItem("token"); router.push("/"); }} style={{ width: "100%", border: "1px solid transparent", color: "var(--text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 16 }}>
            <path d={ICONS.logout} />
          </svg>
          {sidebarOpen && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );

  // ─── Top Bar ──────────────────────────────────────────────────────────────
  const renderTopbar = () => {
    const viewNames = { dashboard: "Dashboard", map: "Mapa en Vivo", health: "Salud & Biometría", safety: "Seguridad", geofences: "Geocercas", events: "Eventos & Alertas", reports: "Reportes", settings: "Configuración" };
    const onlineCount = devices.filter(d => d.is_online).length;
    return (
      <div className="topbar">
        <div>
          <div className="topbar-title">{viewNames[activeView]}</div>
          <div className="topbar-subtitle">{devices.length} dispositivos registrados</div>
        </div>

        {(activeView === "dashboard" || activeView === "map") && (
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="search-input" placeholder="Buscar dispositivo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}

        {searchQuery === "" && activeView !== "map" && <div style={{ marginLeft: "auto" }} />}

        <span className="status-pill online">
          <span className="dot" /> {onlineCount} En línea
        </span>

        <button className="btn btn-ghost btn-sm" style={{ padding: "6px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        <button className="btn btn-ghost btn-sm" style={{ padding: "6px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    );
  };

  // ─── Views ────────────────────────────────────────────────────────────────

  const viewDashboard = () => {
    const online = devices.filter(d => d.is_online).length;
    const lowBatt = devices.filter(d => d.battery_level < 20).length;
    const offline = devices.length - online;

    const TABS = ["Dispositivos"];

    return (
      <div className="animate-fade-in">
        {/* KPI */}
        <div className="kpi-grid">
          {[
            { label: "Dispositivos Totales", value: devices.length, color: "blue", sub: "ver todos →", action: () => setActiveView("map") },
            { label: "Conectados", value: online, color: "green", sub: "En línea ahora" },
            { label: "Desconectados", value: offline, color: "orange", sub: "Requieren revisión" },
            { label: "Batería Crítica", value: lowBatt, color: "red", sub: "< 20% de carga" },
          ].map(({ label, value, color, sub, action }) => (
            <div key={label} className={`kpi-card ${color}`}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value}</div>
              <div className="kpi-link" onClick={action || undefined} style={{ cursor: action ? "pointer" : "default" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs + table */}
        <div className="tab-bar">
          {TABS.map((t, i) => <button key={t} className={`tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>{t}</button>)}
        </div>

        {activeTab === 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Estado</th>
                  <th>Batería</th>
                  <th>Última Señal</th>
                  <th>Ubicación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>Sin dispositivos</td></tr>
                )}
                {filteredDevices.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="cell-primary">{d.name}</div>
                      <div className="cell-mono">{d.imei}</div>
                    </td>
                    <td><span className={`badge ${d.is_online ? "online" : "offline"}`}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />{d.is_online ? "En línea" : "Offline"}</span></td>
                    <td>
                      <div className="battery-bar">
                        <div className="battery-track"><div className="battery-fill" style={{ width: `${d.battery_level}%`, background: battColor(d.battery_level) }} /></div>
                        <span style={{ fontSize: 11, color: battColor(d.battery_level), fontWeight: 600, fontFamily: "monospace" }}>{d.battery_level}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{ago(d.updatedAt)}</td>
                    <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {d.last_latitude ? `${parseFloat(d.last_latitude).toFixed(4)}, ${parseFloat(d.last_longitude).toFixed(4)}` : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedDevice(d); setActiveView("map"); loadHealth(d.imei); }}>Ver mapa</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedDevice(d); setActiveView("health"); loadHealth(d.imei); }}>Salud</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const viewMap = () => (
    <div style={{ height: activeView === "map" ? "calc(100vh - var(--topbar-height) - 56px)" : 0, display: activeView === "map" ? "block" : "none", position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-default)" }} className="animate-fade-in">
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

      {/* Left device list */}
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, width: 240, background: "rgba(15,17,23,0.92)", backdropFilter: "blur(12px)", borderRadius: 10, border: "1px solid var(--border-default)", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-default)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
          Dispositivos ({filteredDevices.length})
        </div>
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {filteredDevices.map(d => (
            <div key={d.id} onClick={() => { setSelectedDevice(d); loadHealth(d.imei); const lat = parseFloat(d.last_latitude), lng = parseFloat(d.last_longitude); if (mapInstance.current && !isNaN(lat)) mapInstance.current.setView([lat, lng], 15); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)", background: selectedDevice?.id === d.id ? "rgba(59,130,246,0.1)" : "transparent", transition: "background 0.1s" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.is_online ? "#22c55e" : "#475569", flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: selectedDevice?.id === d.id ? "#3b82f6" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{ago(d.updatedAt)}</div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: battColor(d.battery_level) }}>{d.battery_level}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Device detail panel */}
      {selectedDevice && (
        <div className="animate-fade-in" style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, width: 320, background: "rgba(15,17,23,0.95)", backdropFilter: "blur(16px)", borderRadius: 12, border: "1px solid var(--border-default)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border-default)" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{selectedDevice.name}</div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)", marginTop: 1 }}>{selectedDevice.imei}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={() => setSelectedDevice(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border-default)" }}>
            {[
              { label: "Estado", value: selectedDevice.is_online ? "En línea" : "Offline", color: selectedDevice.is_online ? "#22c55e" : "#475569" },
              { label: "Batería", value: `${selectedDevice.battery_level}%`, color: battColor(selectedDevice.battery_level) },
              { label: "Última señal", value: ago(selectedDevice.updatedAt), color: "var(--text-secondary)" },
              { label: "Pasos hoy", value: selectedDevice.steps_today || "—", color: "var(--text-secondary)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--bg-surface)", padding: "10px 14px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => reqLocation(selectedDevice.imei)} disabled={locReq.loading}>
              {locReq.loading ? (
                <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Localizando...</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Solicitar Ubicación</>
              )}
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn btn-ghost" style={{ justifyContent: "center" }} onClick={() => reqFind(selectedDevice.imei)} disabled={findReq.loading}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={ICONS.zap}/></svg>
                {findReq.status === "success" ? "¡Sonando!" : "Sonar"}
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "center" }} onClick={() => { setActiveView("health"); loadHealth(selectedDevice.imei); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={ICONS.heart}/></svg>
                Salud
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "center", gridColumn: "span 2", background: routeDevice === selectedDevice.id ? "rgba(59,130,246,0.15)" : undefined, color: routeDevice === selectedDevice.id ? "#3b82f6" : undefined }} onClick={() => showDeviceRoute(selectedDevice)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M3 12l6-6M3 12l6 6M21 12l-6-6M21 12l-6 6" /></svg>
                {routeDevice === selectedDevice.id ? "Ocultar Ruta" : "Ver Ruta (24h)"}
              </button>
            </div>
          </div>

          {/* Coordinates */}
          {selectedDevice.last_latitude && (
            <div style={{ padding: "8px 14px 12px", borderTop: "1px solid var(--border-default)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>Coordenadas GPS</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-secondary)" }}>
                  {parseFloat(selectedDevice.last_latitude).toFixed(6)}, {parseFloat(selectedDevice.last_longitude).toFixed(6)}
                </div>
                <a href={`https://www.google.com/maps?q=${selectedDevice.last_latitude},${selectedDevice.last_longitude}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#3b82f6", textDecoration: "none", flexShrink: 0, padding: "2px 6px", background: "rgba(59,130,246,0.1)", borderRadius: 4 }}>
                  Maps ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const viewHealth = () => {
    const noData = !healthData || (!healthData.heart_rate && !healthData.systolic_pressure && !healthData.spo2 && !healthData.temperature);
    
    return (
      <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
        {/* Columna Izquierda: Selector de Dispositivo */}
        <div>
          <div className="data-table-wrapper">
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Dispositivo
              </div>
              <button 
                onClick={reqHealthAutoAll} 
                className="btn btn-ghost" 
                style={{ fontSize: 9.5, padding: "2px 6px", height: "auto", minHeight: 0, color: "#3b82f6", background: "rgba(59,130,246,0.1)", borderRadius: 4 }}
              >
                Auto (Todos)
              </button>
            </div>
            {devices.map(d => (
              <div 
                key={d.id} 
                onClick={() => { setSelectedDevice(d); loadHealth(d.imei); }}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 10, 
                  padding: "11px 12px", 
                  cursor: "pointer", 
                  borderBottom: "1px solid var(--border-subtle)", 
                  background: selectedDevice?.id === d.id ? "rgba(59,130,246,0.08)" : "transparent" 
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.is_online ? "#22c55e" : "#475569", flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ 
                    fontSize: 12.5, 
                    fontWeight: 600, 
                    color: selectedDevice?.id === d.id ? "#3b82f6" : "var(--text-primary)", 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis" 
                  }}>
                    {d.name}
                  </div>
                </div>
              </div>
            ))}
            {selectedDevice && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", justifyContent: "center", fontSize: 11.5 }} 
                  onClick={() => reqHealth(selectedDevice.imei)} 
                  disabled={healthReq.loading}
                >
                  {healthReq.loading ? "Midiendo..." : "⚡ Medir ahora"}
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ width: "100%", justifyContent: "center", fontSize: 11.5, background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }} 
                  onClick={() => reqTemp(selectedDevice.imei)} 
                  disabled={tempReq.loading}
                >
                  {tempReq.loading ? "Midiendo..." : "🌡️ Medir Temperatura"}
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ width: "100%", justifyContent: "center", fontSize: 11.5, background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)" }} 
                  onClick={() => reqHealthAuto(selectedDevice.imei)} 
                  disabled={healthAutoReq.loading}
                >
                  {healthAutoReq.loading ? "Enviando..." : "⏱️ Auto 1h"}
                </button>
                {healthReq.status === "success" && <div style={{ fontSize: 10.5, color: "#22c55e", textAlign: "center", marginTop: 2 }}>Comando enviado ✓</div>}
                {tempReq.status === "success" && <div style={{ fontSize: 10.5, color: "#22c55e", textAlign: "center", marginTop: 2 }}>Comando Temp enviado ✓</div>}
                {healthAutoReq.status === "success" && <div style={{ fontSize: 10.5, color: "#22c55e", textAlign: "center", marginTop: 2 }}>Enviado a TODOS ✓</div>}
                {(healthReq.status === "error" || healthAutoReq.status === "error" || tempReq.status === "error") && <div style={{ fontSize: 10.5, color: "#ef4444", textAlign: "center", marginTop: 2 }}>Error de envío</div>}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Métricas y Reportes */}
        <div>
          {!selectedDevice ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-default)", color: "var(--text-muted)", textAlign: "center", flexDirection: "column", gap: 8 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}><path d={ICONS.heart}/></svg>
              <div style={{ fontSize: 13.5 }}>Selecciona un dispositivo</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>para visualizar sus métricas de salud</div>
            </div>
          ) : (
            <>
              {/* Mediciones Bajo Demanda */}
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d={ICONS.heart}/></svg>
                  Medir Ahora
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {[
                    { label: "Pulso", cmd: "HR",    color: "#ef4444", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
                    { label: "Presión", cmd: "BP",  color: "#3b82f6", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
                    { label: "SpO₂",   cmd: "SPO2", color: "#14b8a6", icon: "M12 2a10 10 0 1 0 10 10" },
                    { label: "Temp",   cmd: null,   color: "#f97316", icon: "M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z", action: () => reqTemp(selectedDevice.imei) },
                  ].map(({ label, cmd, color, icon, action }) => (
                    <button key={label} className="btn btn-ghost" style={{ flexDirection: "column", gap: 6, padding: "12px 8px", height: "auto", alignItems: "center", borderColor: `${color}33`, background: `${color}0d` }}
                      onClick={() => action ? action() : sendCmd(selectedDevice.imei, cmd)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d={icon}/></svg>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color }}>{label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost" style={{ justifyContent: "center", fontSize: 11.5, background: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.2)" }}
                    onClick={() => reqHealth(selectedDevice.imei)} disabled={healthReq.loading}>
                    {healthReq.loading ? "Midiendo..." : "⚡ Todo a la vez"}
                  </button>
                  <button className="btn btn-ghost" style={{ justifyContent: "center", fontSize: 11.5, background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)", color: "#22c55e" }}
                    onClick={() => sendCmd(selectedDevice.imei, "ANYTIME", { value: 1 })}>
                    ⏱ Auto continuo
                  </button>
                </div>
              </div>

              {/* KPIs de Vitals */}
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
                <div className="kpi-card red">
                  <div className="kpi-label">Pulso</div>
                  <div className="kpi-value">{noData ? "—" : healthData.heart_rate || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>BPM</div>
                </div>
                <div className="kpi-card blue">
                  <div className="kpi-label">Presión Arterial</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{noData ? "—" : `${healthData.systolic_pressure || "—"}/${healthData.diastolic_pressure || "—"}`}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>mmHg</div>
                </div>
                <div className="kpi-card teal">
                  <div className="kpi-label">SpO₂</div>
                  <div className="kpi-value">{noData ? "—" : healthData.spo2 || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>%</div>
                </div>
                <div className="kpi-card orange">
                  <div className="kpi-label">Temperatura</div>
                  <div className="kpi-value">{noData ? "—" : healthData.temperature || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>°C</div>
                </div>
              </div>

              {/* Análisis Médico Automático */}
              {healthData?.heart_rate && (
                <div style={{ background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-default)", marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      Interpretación Médica Automática
                    </div>
                  </div>
                  <table style={{ width: "100%", background: "transparent", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-subtle)" }}>
                        <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>PARÁMETRO</th>
                        <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>VALOR ACTUAL</th>
                        <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>DIAGNÓSTICO PRELIMINAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)" }}>Oxígeno en sangre (SpO₂)</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: healthData.spo2 < 90 ? "#ef4444" : (healthData.spo2 < 95 ? "#f97316" : "#22c55e") }}>{healthData.spo2}%</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: healthData.spo2 < 90 ? "#ef4444" : (healthData.spo2 < 95 ? "#f97316" : "var(--text-secondary)") }}>{healthData.spo2 < 90 ? "Hipoxemia grave" : (healthData.spo2 < 95 ? "Hipoxemia leve" : "Normal")}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)" }}>Presión Arterial</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: (healthData.systolic_pressure >= 140 || healthData.diastolic_pressure >= 90 || healthData.systolic_pressure <= 90) ? "#ef4444" : "#22c55e" }}>{healthData.systolic_pressure}/{healthData.diastolic_pressure} mmHg</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: (healthData.systolic_pressure >= 140 || healthData.diastolic_pressure >= 90 || healthData.systolic_pressure <= 90) ? "#ef4444" : "var(--text-secondary)" }}>
                          {healthData.systolic_pressure >= 140 || healthData.diastolic_pressure >= 90 ? "Hipertensión (Presión Alta)" : (healthData.systolic_pressure <= 90 || healthData.diastolic_pressure <= 60 ? "Hipotensión grave" : "Normal")}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)" }}>Ritmo Cardíaco</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: (healthData.heart_rate > 120 || healthData.heart_rate < 50) ? "#ef4444" : (healthData.heart_rate > 100 ? "#f97316" : "#22c55e") }}>{healthData.heart_rate} bpm</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: (healthData.heart_rate > 120 || healthData.heart_rate < 50) ? "#ef4444" : (healthData.heart_rate > 100 ? "#f97316" : "var(--text-secondary)") }}>
                          {healthData.heart_rate > 120 ? "Taquicardia severa" : (healthData.heart_rate > 100 ? "Taquicardia leve" : (healthData.heart_rate < 50 ? "Bradicardia" : "Normal"))}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)" }}>Temperatura Corporal</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: (healthData.temperature > 37.5 || healthData.temperature < 35.5) ? "#ef4444" : "#22c55e" }}>{healthData.temperature || "—"} °C</td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: (healthData.temperature > 37.5 || healthData.temperature < 35.5) ? "#ef4444" : "var(--text-secondary)" }}>
                          {healthData.temperature > 38 ? "Fiebre alta" : (healthData.temperature > 37.5 ? "Febrícula" : (healthData.temperature < 35.5 ? "Hipotermia" : "Normal"))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Informe Médico con Gráficas Sincronizadas */}
              <div style={{ background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-default)", padding: "20px 0", maxHeight: 900, overflowY: "auto" }}>
                {(healthHistory[healthRange] && healthHistory[healthRange].length > 0) ? (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                    {/* Header del Informe */}
                    <div style={{ paddingLeft: 20, paddingBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>INFORME MÉDICO - Signos Vitales</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", opacity: 0.6 }}>Data: {healthHistory[healthRange].length} pts (H:{healthHistory[healthRange].filter(x=>x.bpm).length} O:{healthHistory[healthRange].filter(x=>x.spo2).length} P:{healthHistory[healthRange].filter(x=>x.sys).length})</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, background: "var(--bg-overlay)", padding: 4, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                        <button onClick={() => setHealthRange("intraday")} style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 6, transition: "0.2s", background: healthRange === "intraday" ? "rgba(59,130,246,0.15)" : "transparent", color: healthRange === "intraday" ? "#3b82f6" : "var(--text-muted)", fontWeight: healthRange === "intraday" ? 600 : 500 }}>Hoy</button>
                        <button onClick={() => setHealthRange("daily")} style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 6, transition: "0.2s", background: healthRange === "daily" ? "rgba(59,130,246,0.15)" : "transparent", color: healthRange === "daily" ? "#3b82f6" : "var(--text-muted)", fontWeight: healthRange === "daily" ? 600 : 500 }}>Día</button>
                        <button onClick={() => setHealthRange("monthly")} style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 6, transition: "0.2s", background: healthRange === "monthly" ? "rgba(59,130,246,0.15)" : "transparent", color: healthRange === "monthly" ? "#3b82f6" : "var(--text-muted)", fontWeight: healthRange === "monthly" ? 600 : 500 }}>Mes</button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      {/* 1. Presión Arterial (Moved to first for debugging) */}
                      <div style={{ height: 200, position: "relative" }}>
                        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Presión Arterial (mmHg)</div>
                        <div style={{ position: "absolute", top: 18, left: 32, display: "flex", gap: 10, background: "rgba(0,0,0,0.6)", padding: "3px 6px", borderRadius: 4, zIndex: 10, fontSize: 9 }}>
                           <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></div> Sys</div>
                           <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316" }}></div> Dia</div>
                        </div>
                        <div style={{ height: 180 }}>
                          <ResponsiveContainer key={healthRange} width="100%" height="100%">
                            <LineChart data={healthHistory[healthRange]} syncId="healthSync" margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="label" hide />
                              <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} domain={[50, 180]} />
                              <Tooltip contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 11 }} />
                              <ReferenceLine y={80} stroke="#eab308" strokeDasharray="3 3" />
                              <ReferenceLine y={120} stroke="#f97316" strokeDasharray="3 3" />
                              <Line type="monotone" name="Sistólica" dataKey="sys" stroke="#22c55e" strokeWidth={2} dot={{ r: 2, fill: "#22c55e" }} connectNulls />
                              <Line type="monotone" name="Diastólica" dataKey="dia" stroke="#f97316" strokeWidth={2} dot={{ r: 2, fill: "#f97316" }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 2. Oxígeno */}
                      <div style={{ height: 200, position: "relative" }}>
                        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Oxígeno en Sangre (SpO2 %)</div>
                        <div style={{ position: "absolute", bottom: 10, left: 32, background: "rgba(0,0,0,0.6)", padding: "3px 6px", borderRadius: 4, zIndex: 10, fontSize: 9 }}>
                           <span style={{ color: "#ef4444", marginRight: 4 }}>--</span> Alarma (90)
                        </div>
                        <div style={{ height: 180 }}>
                          <ResponsiveContainer key={healthRange} width="100%" height="100%">
                            <LineChart data={healthHistory[healthRange]} syncId="healthSync" margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="label" hide />
                              <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} domain={[80, 100]} />
                              <Tooltip contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 11 }} />
                              <ReferenceLine y={95} stroke="#f97316" strokeDasharray="3 3" />
                              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" />
                              <Line type="monotone" name="SpO2 (%)" dataKey="spo2" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6" }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 3. Ritmo Cardíaco */}
                      <div style={{ height: 200, position: "relative" }}>
                        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Ritmo Cardíaco (bpm)</div>
                        <div style={{ position: "absolute", top: 18, left: 32, background: "rgba(0,0,0,0.6)", padding: "3px 6px", borderRadius: 4, zIndex: 10, fontSize: 9 }}>
                           <span style={{ color: "#f97316", marginRight: 4 }}>--</span> Alto (100)
                        </div>
                        <div style={{ height: 180 }}>
                          <ResponsiveContainer key={healthRange} width="100%" height="100%">
                            <LineChart data={healthHistory[healthRange]} syncId="healthSync" margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                              <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} domain={[40, 160]} />
                              <Tooltip contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 11 }} />
                              <ReferenceLine y={60} stroke="#eab308" strokeDasharray="3 3" />
                              <ReferenceLine y={100} stroke="#f97316" strokeDasharray="3 3" />
                              <Line type="monotone" name="Pulso (BPM)" dataKey="bpm" stroke="#ef4444" strokeWidth={2} dot={{ r: 2, fill: "#ef4444" }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 4. Temperatura */}
                      <div style={{ height: 200, position: "relative" }}>
                        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Temperatura Corporal (°C)</div>
                        <div style={{ position: "absolute", top: 18, left: 32, background: "rgba(0,0,0,0.6)", padding: "3px 6px", borderRadius: 4, zIndex: 10, fontSize: 9 }}>
                           <span style={{ color: "#eab308", marginRight: 4 }}>--</span> Alarma (37.5)
                        </div>
                        <div style={{ height: 180 }}>
                          <ResponsiveContainer key={healthRange} width="100%" height="100%">
                            <LineChart data={healthHistory[healthRange]} syncId="healthSync" margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                              <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} domain={[34, 42]} />
                              <Tooltip contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 11 }} />
                              <ReferenceLine y={37.5} stroke="#eab308" strokeDasharray="3 3" />
                              <Line type="monotone" name="Temp (°C)" dataKey="temp" stroke="#eab308" strokeWidth={2} dot={{ r: 2, fill: "#eab308" }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, flexDirection: "column", gap: 8, color: "var(--text-muted)", opacity: 0.5 }}>
                    <div style={{ fontSize: 13 }}>Historial biomédico insuficiente</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const viewSafety = () => (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
      {/* Device selector */}
      <div>
        <div className="data-table-wrapper">
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-default)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
            Dispositivo
          </div>
          {devices.map(d => (
            <div key={d.id} onClick={() => setSelectedDevice(d)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)", background: selectedDevice?.id === d.id ? "rgba(59,130,246,0.08)" : "transparent" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.is_online ? "#22c55e" : "#475569", flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: selectedDevice?.id === d.id ? "#3b82f6" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Fall detection */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.shield}/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Detección de Caídas</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Algoritmo G-Sensor · FALLDET</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>Estado del sensor</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Monitoreo activo 24/7</div>
            </div>
            <span className="badge online">Activo</span>
          </div>

          <div style={{ padding: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)" }}>Sensibilidad (G-Force)</div>
              <span className="badge info">Nivel {fallSens}</span>
            </div>
            <input type="range" min="1" max="8" value={fallSens} onChange={e => setFallSens(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#f97316" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>
              <span>Alta (1)</span><span>Media (4)</span><span>Baja (8)</span>
            </div>
          </div>

          <button className="btn" style={{ width: "100%", justifyContent: "center", background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)", fontSize: 12.5 }}
            onClick={() => reqFallSync(selectedDevice?.imei)} disabled={!selectedDevice || fallReq.loading}>
            {fallReq.loading ? "Enviando..." : (selectedDevice ? "Sincronizar configuración" : "Selecciona un dispositivo")}
          </button>
          
          {fallReq.status === "success" && <div style={{ fontSize: 11, color: "#22c55e", textAlign: "center", marginTop: 8 }}>Configuración guardada en el reloj ✓</div>}
          {fallReq.status === "error" && <div style={{ fontSize: 11, color: "#ef4444", textAlign: "center", marginTop: 8 }}>Error de conexión</div>}
        </div>
      </div>

      {/* SOS */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.bell}/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Protocolo SOS</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cadena de llamadas de emergencia</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < 3 ? "1px solid var(--border-subtle)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--bg-overlay)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "var(--text-muted)" }}>{i}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>Contacto {i}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: selectedDevice?.sos_numbers?.[i-1] ? "#3b82f6" : "var(--text-muted)" }}>
                {selectedDevice?.sos_numbers?.[i-1] || "Sin configurar"}
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 12, fontSize: 12.5 }}
            onClick={() => reqSosSync(selectedDevice?.imei)} disabled={!selectedDevice}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={ICONS.settings}/></svg>
            Configurar contactos
          </button>
        </div>
      </div>
      </div>
    </div>
  );

  const viewGeofences = () => (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Left: list */}
      <div className="data-table-wrapper">
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Zonas Seguras</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{geofences.length} geocercas configuradas</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => {
            const d = selectedDevice;
            setGeoForm({ visible: true, name: '', lat: d?.last_latitude ? parseFloat(d.last_latitude).toFixed(6) : '', lng: d?.last_longitude ? parseFloat(d.last_longitude).toFixed(6) : '', radius: 500, device_id: d?.id || '' });
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={ICONS.plus}/></svg> Nueva Zona
          </button>
        </div>
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Dispositivo</th><th>Radio</th><th>Centro</th><th></th></tr></thead>
          <tbody>
            {geofences.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>No hay geocercas — crea una con "Nueva Zona"</td></tr>}
            {geofences.map(g => (
              <tr key={g.id} style={{ cursor: "pointer" }} onClick={() => {
                if (mapInstance.current && g.center_lat && g.center_lng) {
                  setActiveView("map");
                  setTimeout(() => { mapInstance.current.setView([g.center_lat, g.center_lng], 15); }, 200);
                }
              }}>
                <td><div className="cell-primary">{g.name}</div></td>
                <td style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{devices.find(d => d.id === g.device_id)?.name || <span style={{ color: "var(--text-muted)" }}>Sin asignar</span>}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{g.radius_meters >= 1000 ? `${(g.radius_meters/1000).toFixed(1)} km` : `${g.radius_meters} m`}</td>
                <td style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                  {g.center_lat ? `${parseFloat(g.center_lat).toFixed(4)}, ${parseFloat(g.center_lng).toFixed(4)}` : "—"}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }} onClick={() => deleteGeofence(g.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right: creation form or placeholder */}
      {geoForm.visible ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Nueva Geocerca</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setGeoForm(f => ({ ...f, visible: false }))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Nombre *</label>
              <input value={geoForm.name} onChange={e => setGeoForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Casa, Trabajo, Escuela..." style={{ width: "100%", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Latitud *</label>
                <input value={geoForm.lat} onChange={e => setGeoForm(f => ({ ...f, lat: e.target.value }))} placeholder="6.244203" style={{ width: "100%", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Longitud *</label>
                <input value={geoForm.lng} onChange={e => setGeoForm(f => ({ ...f, lng: e.target.value }))} placeholder="-75.581215" style={{ width: "100%", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
              </div>
            </div>
            {selectedDevice?.last_latitude && (
              <button className="btn btn-ghost" style={{ justifyContent: "center", fontSize: 11.5 }}
                onClick={() => setGeoForm(f => ({ ...f, lat: parseFloat(selectedDevice.last_latitude).toFixed(6), lng: parseFloat(selectedDevice.last_longitude).toFixed(6) }))}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Usar posición de {selectedDevice.name}
              </button>
            )}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Radio: {geoForm.radius >= 1000 ? `${(geoForm.radius/1000).toFixed(1)} km` : `${geoForm.radius} m`}</label>
              <input type="range" min="100" max="5000" step="100" value={geoForm.radius} onChange={e => setGeoForm(f => ({ ...f, radius: parseInt(e.target.value) }))} style={{ width: "100%", accentColor: "#3b82f6" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}><span>100 m</span><span>5 km</span></div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Dispositivo (opcional)</label>
              <select value={geoForm.device_id} onChange={e => setGeoForm(f => ({ ...f, device_id: e.target.value }))} style={{ width: "100%", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none" }}>
                <option value="">Sin asignar</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={createGeofence}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={ICONS.plus}/></svg>
              Crear Geocerca
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexDirection: "column", gap: 12, minHeight: 300 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25 }}><path d={ICONS.pin}/></svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Zonas de alerta</div>
            <div style={{ fontSize: 11.5, maxWidth: 220 }}>Crea una nueva zona para recibir alertas cuando el reloj entre o salga del perímetro.</div>
          </div>
          <button className="btn btn-primary" onClick={() => setGeoForm(f => ({ ...f, visible: true }))}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={ICONS.plus}/></svg>
            Nueva Zona
          </button>
        </div>
      )}
    </div>
  );

  const viewEvents = () => {
    const typeInfo = {
      SOS: { label: "SOS", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
      FALL_DOWN: { label: "Caída", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
      LOW_BATTERY: { label: "Batería baja", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
      TAKE_OFF: { label: "Retirado", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
      POWER_OFF: { label: "Apagado", color: "#475569", bg: "rgba(71,85,105,0.1)" },
      POWER_ON: { label: "Encendido", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
      HEALTH_HR_ABNORMAL: { label: "Pulso anormal", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
      HEALTH_BP_HIGH: { label: "PA alta", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
      HEALTH_BP_LOW: { label: "PA baja", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
      HEALTH_SPO2_LOW: { label: "SpO2 bajo", color: "#14b8a6", bg: "rgba(20,184,166,0.1)" },
    };
    return (
      <div className="animate-fade-in data-table-wrapper">
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Eventos y Alertas</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{events.length} alertas registradas</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadEvents} disabled={eventsLoading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={eventsLoading ? "animate-spin" : ""}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Actualizar
          </button>
        </div>
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Dispositivo</th><th>Severidad</th><th>Fecha y Hora</th><th>Mensaje</th><th>Estado</th></tr></thead>
          <tbody>
            {events.length === 0 && !eventsLoading && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block", opacity: 0.3 }}><path d={ICONS.bell}/></svg>
                Sin alertas registradas
              </td></tr>
            )}
            {eventsLoading && events.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>Cargando...</td></tr>
            )}
            {events.map(e => {
              const t = typeInfo[e.type] || { label: e.type, color: "var(--text-muted)", bg: "var(--bg-overlay)" };
              return (
                <tr key={e.id}>
                  <td><span style={{ fontSize: 11, fontWeight: 700, color: t.color, background: t.bg, padding: "2px 8px", borderRadius: 4 }}>{t.label}</span></td>
                  <td><div className="cell-primary">{e.device_name || "—"}</div><div className="cell-mono">{e.imei || ""}</div></td>
                  <td><span className={`badge ${e.severity === "HIGH" || e.severity === "CRITICAL" ? "offline" : e.severity === "MEDIUM" ? "info" : "online"}`}>{e.severity || "—"}</span></td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmt(e.triggered_at)}</td>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 200 }}>{e.message || "—"}</td>
                  <td><span style={{ fontSize: 10, color: e.status === "NEW" ? "#f97316" : e.status === "RESOLVED" ? "#22c55e" : "var(--text-muted)", fontWeight: 600 }}>{e.status || "—"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const viewSettings = () => (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
      {/* Device selector */}
      <div>
        <div className="data-table-wrapper">
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-default)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
            Dispositivo
          </div>
          {devices.map(d => (
            <div key={d.id} onClick={() => setSelectedDevice(d)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)", background: selectedDevice?.id === d.id ? "rgba(59,130,246,0.08)" : "transparent" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.is_online ? "#22c55e" : "#475569", flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: selectedDevice?.id === d.id ? "#3b82f6" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* SISTEMA */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.settings}/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Sistema y Dispositivo</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Control, energía y restauraciones</div>
            </div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "12px 16px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "RESET")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5"/></svg> Reiniciar (RESET)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>Reinicia<br/>el reloj</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "12px 16px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "POWEROFF")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--red)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg> Apagar (POWEROFF)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>Apaga sin<br/>tocar el equipo</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "12px 16px" }} disabled={!selectedDevice} onClick={() => confirm("¿Seguro que deseas restaurar el reloj a fábrica? Se perderán todos los datos.") && sendCmd(selectedDevice?.imei, "FACTORY")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5"/></svg> Fábrica (FACTORY)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>Borra ajustes<br/>del reloj</div>
              </button>
            </div>
          </div>
        </div>

        {/* RED Y COMUNICACIÓN */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.radio}/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Red y Parámetros</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Frecuencia, servidor, idioma y estado</div>
            </div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const int = prompt("Intervalo de reporte GPS en segundos (ej. 600):"); if(int) sendCmd(selectedDevice?.imei, "UPLOAD", { interval: int }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Reporte GPS (UPLOAD)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Cada cuánto reporta GPS</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const ip = prompt("IP del servidor (ej. mstr.com):"); const port = prompt("Puerto:"); if(ip && port) sendCmd(selectedDevice?.imei, "IP", { ip, port }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Servidor IP</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Cambia host y puerto TCP</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const lang = prompt("Idioma (ej. 0=Inglés, 3=Español):"); const tz = prompt("Zona horaria (ej. E,5 o W,5):"); if(lang && tz) sendCmd(selectedDevice?.imei, "LZ", { language: lang, timezone: tz }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Idioma/Zona (LZ)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Idioma y zona horaria</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const pw = prompt("Nueva contraseña (6 dígitos):"); if(pw) sendCmd(selectedDevice?.imei, "PW", { password: pw }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Contraseña (PW)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Contraseña de comandos</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "TS")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Estado (TS)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Lee batería, red y GPS</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "VERNO")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Versión (VERNO)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Consulta versión firmware</div>
              </button>
            </div>
          </div>
        </div>

        {/* LLAMADAS Y MONITOREO */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.phone || "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Voz y Contactos</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Llamada saliente, escucha y número central</div>
            </div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const ph = prompt("Número a llamar:"); if(ph) sendCmd(selectedDevice?.imei, "CALL", { phone: ph }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Forzar Llamada (CALL)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Ordena llamada saliente</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const ph = prompt("Número espía:"); if(ph) sendCmd(selectedDevice?.imei, "MONITOR", { phone: ph }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Monitoreo (MONITOR)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Devuelve llamada de escucha</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const ph = prompt("Número central:"); if(ph) sendCmd(selectedDevice?.imei, "CENTER", { phone: ph }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Número Central (CENTER)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Número administrador</div>
              </button>
            </div>
          </div>
        </div>

        {/* SALUD Y SOS */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.heart}/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Salud y Emergencias</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Contactos SOS y mediciones remotas</div>
            </div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const p1 = prompt("Número SOS 1:"); if(p1) sendCmd(selectedDevice?.imei, "SOS1", { phone: p1 }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>SOS 1</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Primer contacto emergencia</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const p2 = prompt("Número SOS 2:"); if(p2) sendCmd(selectedDevice?.imei, "SOS2", { phone: p2 }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>SOS 2</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Segundo contacto emergencia</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => { const p3 = prompt("Número SOS 3:"); if(p3) sendCmd(selectedDevice?.imei, "SOS3", { phone: p3 }); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>SOS 3</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Tercer contacto emergencia</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "HR")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Medir Pulso (HR)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Frecuencia cardiaca ahora</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "BP")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Medir Presión (BP)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Presión arterial ahora</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "SPO2")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Medir Oxígeno (SPO2)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Oxígeno en sangre ahora</div>
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: "space-between", padding: "8px 12px" }} disabled={!selectedDevice} onClick={() => sendCmd(selectedDevice?.imei, "ANYTIME", { value: 1 })}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>Salud Continua (ANYTIME)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Activa medición automática</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const viewPlaceholder = (title, subtitle, iconPath) => (
    <div className="animate-fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", flexDirection: "column", gap: 12, color: "var(--text-muted)", textAlign: "center" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.2 }}><path d={iconPath}/></svg>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>{title}</div>
      <div style={{ fontSize: 12.5, maxWidth: 300 }}>{subtitle}</div>
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {renderSidebar()}

      <div className="main-area">
        {renderTopbar()}
        <div className="page-content">
          {activeView === "dashboard" && viewDashboard()}
          {viewMap()}
          {activeView === "health"    && viewHealth()}
          {activeView === "safety"    && viewSafety()}
          {activeView === "geofences" && viewGeofences()}
          {activeView === "events"    && viewEvents()}
          {activeView === "reports"   && viewPlaceholder("Reportes", "Generación de informes PDF y CSV disponible próximamente.", ICONS.bar)}
          {activeView === "settings"  && viewSettings()}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
      {/* Build Version Tag for Verification */}
      <div style={{ position: "fixed", bottom: 4, right: 8, fontSize: 8, color: "var(--text-muted)", opacity: 0.3, pointerEvents: "none" }}>Build v3.0.S</div>
      {/* Command feedback toast */}
      {cmdNotif && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: cmdNotif.type === "success" ? "#16a34a" : "#dc2626", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", animation: "slideUp 0.2s ease" }}>
          {cmdNotif.type === "success"
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
          {cmdNotif.message}
        </div>
      )}
    </div>
  );
}
