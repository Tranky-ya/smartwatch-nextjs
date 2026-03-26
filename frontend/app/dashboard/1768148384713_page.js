"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { solicitarUbicacionActual } from "@/lib/locationRequest";
import { 
  Smartphone, 
  Map as MapIcon, 
  Activity, 
  Battery, 
  BatteryLow,
  BatteryMedium,
  Footprints, 
  MapPin, 
  Heart, 
  Stethoscope, 
  Wind,
  Radio,
  X,
  BarChart3,
  LogOut,
  ArrowLeft
} from 'lucide-react';

export default function MapPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});

  const [locationRequest, setLocationRequest] = useState({
    loading: false,
    status: '',
    message: ''
  });

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
      hour12: false
    });
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    initMap();
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

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
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: " OpenStreetMap",
        maxZoom: 19
      }).addTo(map);

      mapInstance.current = map;
    } catch (error) {
      console.error("Error inicializando mapa:", error);
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No hay token de autenticacion");
        router.push("/");
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const [devicesRes, geofencesRes] = await Promise.all([
        fetch(`${API_URL}/api/devices`, { headers }),
        fetch(`${API_URL}/api/geofences`, { headers })
      ]);

      if (!devicesRes.ok || !geofencesRes.ok) {
        if (devicesRes.status === 401 || geofencesRes.status === 401) {
          console.error("Token invalido o expirado");
          router.push("/");
          return;
        }
        throw new Error("Error cargando datos");
      }

      const devicesData = await devicesRes.json();
      const geofencesData = await geofencesRes.json();

      setDevices(Array.isArray(devicesData) ? devicesData : []);
      setGeofences(Array.isArray(geofencesData) ? geofencesData : []);
      updateMap(
        Array.isArray(devicesData) ? devicesData : [],
        Array.isArray(geofencesData) ? geofencesData : []
      );
    } catch (error) {
      console.error("Error cargando datos:", error);
      setDevices([]);
      setGeofences([]);
    }
  };

  const loadHealthData = async (imei) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/devices/${imei}/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        setHealthData(null);
        return;
      }

      const data = await res.json();

      if (data.length === 0) {
        setHealthData(null);
        return;
      }

      const combined = {
        spo2: 0,
        heart_rate: 0,
        systolic_pressure: 0,
        diastolic_pressure: 0,
        measurement_time: data[0].measurement_time
      };

      for (const record of data) {
        if (combined.spo2 === 0 && record.spo2 > 0) {
          combined.spo2 = record.spo2;
        }
        if (combined.heart_rate === 0 && record.heart_rate > 0) {
          combined.heart_rate = record.heart_rate;
        }
        if (combined.systolic_pressure === 0 && record.systolic_pressure > 0) {
          combined.systolic_pressure = record.systolic_pressure;
          combined.diastolic_pressure = record.diastolic_pressure;
        }
      }

      setHealthData(combined);
    } catch (error) {
      console.error("Error cargando health:", error);
      setHealthData(null);
    }
  };

  const updateMap = async (devicesData, geofencesData) => {
    if (!mapInstance.current) return;
    const L = await import("leaflet");

    Object.values(markersRef.current).forEach(m => m.remove());
    Object.values(circlesRef.current).forEach(c => c.remove());
    markersRef.current = {};
    circlesRef.current = {};

    geofencesData.forEach(fence => {
      if (fence.center_lat && fence.center_lng) {
        const isSelected = selectedGeofence?.id === fence.id;
        const circle = L.circle([fence.center_lat, fence.center_lng], {
          color: isSelected ? "#f59e0b" : "#667eea",
          fillColor: isSelected ? "#f59e0b" : "#667eea",
          fillOpacity: isSelected ? 0.2 : 0.1,
          weight: isSelected ? 3 : 2,
          radius: fence.radius_meters || 500
        }).addTo(mapInstance.current);

        circle.on('click', () => handleGeofenceClick(fence));
        circlesRef.current[fence.id] = circle;
      }
    });

    devicesData.forEach(device => {
      const lat = parseFloat(device.last_latitude);
      const lng = parseFloat(device.last_longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        const isSelected = selectedDevice?.id === device.id;

        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
              <div style="width: ${isSelected ? '36px' : '28px'}; height: ${isSelected ? '36px' : '28px'}; background: ${device.is_online ? '#10b981' : '#ef4444'}; border: 3px solid ${isSelected ? '#ff5e32' : '#ffffff'}; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: all 0.2s;"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(mapInstance.current);
        marker.on('click', () => handleDeviceClick(device));
        markersRef.current[device.id] = marker;
      }
    });
  };

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setSelectedGeofence(null);
    loadHealthData(device.imei);
    
    const lat = parseFloat(device.last_latitude);
    const lng = parseFloat(device.last_longitude);
    if (mapInstance.current && !isNaN(lat) && !isNaN(lng)) {
      mapInstance.current.setView([lat, lng], 15);
    }
  };

  const handleGeofenceClick = (fence) => {
    setSelectedGeofence(fence);
    setSelectedDevice(null);
    if (mapInstance.current && fence.center_lat && fence.center_lng) {
      mapInstance.current.setView([fence.center_lat, fence.center_lng], 14);
    }
  };

  const handleRequestLocation = async (imei) => {
    setLocationRequest({
      loading: true,
      status: 'sending',
      message: 'Enviando...'
    });

    try {
      const resultado = await solicitarUbicacionActual(imei);

      if (resultado.success) {
        setLocationRequest({
          loading: true,
          status: 'waiting',
          message: 'Comando enviado, por favor espere!'
        });

        // NUEVO: Actualizar el dispositivo en el array de devices
        setDevices(prevDevices => 
          prevDevices.map(device => 
            device.imei === imei 
              ? {
                  ...device,
                  last_latitude: resultado.location.latitude,
                  last_longitude: resultado.location.longitude,
                  location_type: resultado.location.location_type,
                  accuracy: resultado.location.accuracy,
                  satellites: resultado.location.satellites,
                  updatedAt: resultado.location.server_time
                }
              : device
          )
        );

        // Actualizar selectedDevice
        setSelectedDevice(prev => ({
          ...prev,
          last_latitude: resultado.location.latitude,
          last_longitude: resultado.location.longitude,
          location_type: resultado.location.location_type,
          accuracy: resultado.location.accuracy,
          satellites: resultado.location.satellites,
          updatedAt: resultado.location.server_time
        }));

        // NUEVO: Centrar el mapa con animación
        if (mapInstance.current && resultado.location.latitude && resultado.location.longitude) {
          const lat = parseFloat(resultado.location.latitude);
          const lng = parseFloat(resultado.location.longitude);
          
          mapInstance.current.setView([lat, lng], 16, {
            animate: true,
            duration: 1
          });
        }

        setLocationRequest({
          loading: false,
          status: 'success',
          message: 'Ubicacion actualizada correctamente'
        });

        setTimeout(() => loadData(), 1000);
        
        setTimeout(() => {
          setLocationRequest({ loading: false, status: '', message: '' });
        }, 3000);

      } else if (resultado.reason === 'cooldown') {
        setLocationRequest({
          loading: false,
          status: 'cooldown',
          message: resultado.message
        });
        setTimeout(() => {
          setLocationRequest({ loading: false, status: '', message: '' });
        }, 3000);

      } else if (resultado.timeout) {
        setLocationRequest({
          loading: false,
          status: 'error',
          message: 'El dispositivo no respondio en 30 segundos'
        });
        setTimeout(() => {
          setLocationRequest({ loading: false, status: '', message: '' });
        }, 5000);

      } else {
        setLocationRequest({
          loading: false,
          status: 'error',
          message: resultado.message
        });
        setTimeout(() => {
          setLocationRequest({ loading: false, status: '', message: '' });
        }, 3000);
      }

    } catch (error) {
      setLocationRequest({
        loading: false,
        status: 'error',
        message: error.message
      });
      setTimeout(() => {
        setLocationRequest({ loading: false, status: '', message: '' });
      }, 3000);
    }
  };

  const handleLogout = () => {
    if (confirm("Estas seguro que deseas cerrar sesion?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  useEffect(() => {
    if (mapInstance.current) {
      updateMap(devices, geofences);
    }
  }, [selectedDevice, selectedGeofence]);

  const getButtonStyle = () => {
    const baseStyle = {
      width: "100%",
      marginTop: "12px",
      padding: "10px",
      border: "none",
      borderRadius: "6px",
      cursor: locationRequest.loading ? "wait" : "pointer",
      fontSize: "13px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "all 0.3s ease",
      opacity: locationRequest.loading ? 0.8 : 1
    };

    if (locationRequest.status === 'sending') {
      return { ...baseStyle, background: "#f59e0b", color: "white" };
    } else if (locationRequest.status === 'waiting') {
      return { ...baseStyle, background: "#3b82f6", color: "white" };
    } else if (locationRequest.status === 'success') {
      return { ...baseStyle, background: "#10b981", color: "white" };
    } else if (locationRequest.status === 'error' || locationRequest.status === 'cooldown') {
      return { ...baseStyle, background: "#ef4444", color: "white" };
    } else {
      return { ...baseStyle, background: "#9dc4d5", color: "white" };
    }
  };

  const getBatteryIcon = (level) => {
    if (level > 50) return <Battery size={16} color="#10b981" />;
    if (level > 20) return <BatteryMedium size={16} color="#f59e0b" />;
    return <BatteryLow size={16} color="#ef4444" />;
  };

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: "#f5f6ee" }}>
      <div style={{ width: "280px", backgroundColor: "#202d35", boxShadow: "2px 0 8px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", zIndex: 100 }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #2a3f4d" }}>
          <div style={{ marginBottom: "15px", textAlign: "center", padding: "10px", background: "white", borderRadius: "8px" }}>
            <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ width: "100%", height: "auto" }} />
          </div>
          <button onClick={() => router.push("/dashboard")} style={{ width: "100%", padding: "10px", background: "transparent", color: "#e1ff63", border: "2px solid #e1ff63", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <button onClick={handleLogout} style={{ width: "100%", padding: "10px", background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <LogOut size={18} />
            Cerrar Sesion
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#e1ff63" }}>
              <Smartphone size={20} />
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Dispositivos ({devices.length})</h3>
            </div>
            {devices.map(device => (
              <div
                key={device.id}
                onClick={() => handleDeviceClick(device)}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  background: selectedDevice?.id === device.id ? "#e1ff63" : "#2a3f4d",
                  color: selectedDevice?.id === device.id ? "#202d35" : "#ffffff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border: "1px solid",
                  borderColor: selectedDevice?.id === device.id ? "#e1ff63" : "#3a4f5d"
                }}
              >
                <div style={{ 
                  fontWeight: "600", 
                  fontSize: "13px", 
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <div style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: device.is_online ? "#10b981" : "#ef4444" 
                  }} />
                  {device.name}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.8, display: "flex", alignItems: "center", gap: "4px" }}>
                  {getBatteryIcon(device.battery_level)}
                  {device.battery_level}%
                </div>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: "16px", borderTop: "1px solid #2a3f4d" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#e1ff63" }}>
              <MapIcon size={20} />
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Geocercas ({geofences.length})</h3>
            </div>
            {geofences.map(fence => (
              <div
                key={fence.id}
                onClick={() => handleGeofenceClick(fence)}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  background: selectedGeofence?.id === fence.id ? "#e1ff63" : "#2a3f4d",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border: "1px solid",
                  borderColor: selectedGeofence?.id === fence.id ? "#e1ff63" : "#3a4f5d"
                }}
              >
                <div style={{ 
                  fontWeight: "600", 
                  fontSize: "13px",
                  color: selectedGeofence?.id === fence.id ? "#202d35" : "#ffffff",
                  marginBottom: "4px" 
                }}>
                  {fence.name}
                </div>
                <div style={{ fontSize: "11px", color: selectedGeofence?.id === fence.id ? "#667eea" : "#6b7280" }}>Radio: {fence.radius_meters}m</div>
                {fence.assigned_user_name && (
                  <div style={{ fontSize: "10px", color: "#667eea", marginTop: "4px" }}>
                    {fence.assigned_user_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }} />

        {selectedDevice && (
          <div style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "340px",
            maxHeight: "calc(100vh - 40px)",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
            overflow: "hidden",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              backgroundColor: "#ffffff",
              padding: "16px 20px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart3 size={20} color="#667eea" />
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>Informacion del Dispositivo</h3>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedDevice(null); }}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  color: "#6b7280",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", backgroundColor: "#f5f6ee", overflowY: "auto", flex: 1 }}>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "#202d35" }}>{selectedDevice.name}</h2>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>IMEI: {selectedDevice.imei}</div>

              <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #d1d5db" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <Activity size={16} color={selectedDevice.is_online ? "#10b981" : "#ef4444"} />
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#202d35" }}>Estado:</span>
                  <span style={{ fontSize: "14px", color: selectedDevice.is_online ? "#10b981" : "#ef4444", fontWeight: "500" }}>
                    {selectedDevice.is_online ? "En linea" : "Offline"}
                  </span>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {getBatteryIcon(selectedDevice.battery_level)}
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#202d35" }}>Bateria: {selectedDevice.battery_level}%</span>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "#d1d5db", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      width: selectedDevice.battery_level + "%",
                      height: "100%",
                      background: selectedDevice.battery_level > 50 ? "#10b981" : selectedDevice.battery_level > 20 ? "#ff5e32" : "#ef4444"
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Footprints size={16} color="#667eea" />
                  <span style={{ fontSize: "14px", color: "#202d35" }}><strong>Pasos hoy:</strong> {selectedDevice.steps_today || 0}</span>
                </div>

                <div style={{ marginTop: "12px", padding: "12px", background: "#ffffff", border: "2px solid #9dc4d5", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <MapPin size={16} color="#667eea" />
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#202d35" }}>Ubicacion GPS</div>
                  </div>
                  {selectedDevice.last_latitude && selectedDevice.last_longitude ? (
                    <>
                      <div style={{ display: "flex", gap: "16px", marginBottom: "6px", fontSize: "12px", color: "#374151" }}>
                        <div>
                          <strong>Latitud:</strong> {parseFloat(selectedDevice.last_latitude).toFixed(6)}
                        </div>
                        <div>
                          <strong>Longitud:</strong> {parseFloat(selectedDevice.last_longitude).toFixed(6)}
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px" }}>
                        <strong>Ultima actualizacion:</strong> {formatDateColombia(selectedDevice.updatedAt)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
                      Ubicacion no disponible
                    </div>
                  )}

                  <button
                    onClick={() => handleRequestLocation(selectedDevice.imei)}
                    disabled={locationRequest.loading}
                    style={getButtonStyle()}
                  >
                    {locationRequest.loading && locationRequest.status === 'sending' && (
                      <>
                        <div style={{ 
                          width: "14px", 
                          height: "14px", 
                          border: "2px solid white", 
                          borderTopColor: "transparent", 
                          borderRadius: "50%", 
                          animation: "spin 1s linear infinite" 
                        }} />
                        <span>Enviando...</span>
                      </>
                    )}
                    {locationRequest.loading && locationRequest.status === 'waiting' && (
                      <>
                        <div style={{ 
                          width: "14px", 
                          height: "14px", 
                          border: "2px solid white", 
                          borderTopColor: "transparent", 
                          borderRadius: "50%", 
                          animation: "spin 1s linear infinite" 
                        }} />
                        <span>Comando enviado, por favor espere!</span>
                      </>
                    )}
                    {locationRequest.status === 'success' && (
                      <>
                        <Activity size={16} />
                        <span>Ubicacion actualizada</span>
                      </>
                    )}
                    {(locationRequest.status === 'error' || locationRequest.status === 'cooldown') && (
                      <>
                        <X size={16} />
                        <span>{locationRequest.message}</span>
                      </>
                    )}
                    {!locationRequest.loading && !locationRequest.status && (
                      <>
                        <Radio size={16} />
                        <span>Solicitar Ubicacion Actual</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Heart size={18} color="#667eea" />
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#667eea" }}>Datos de Salud</h4>
                </div>

                {healthData ? (
                  <>
                    {healthData.heart_rate > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                        <Heart size={16} color="#ef4444" />
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#1f2937" }}>Frecuencia cardiaca: {healthData.heart_rate} BPM</span>
                      </div>
                    )}
                    {healthData.systolic_pressure > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                        <Stethoscope size={16} color="#3b82f6" />
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#1f2937" }}>Presion arterial: {healthData.systolic_pressure}/{healthData.diastolic_pressure} mmHg</span>
                      </div>
                    )}
                    {healthData.spo2 > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                        <Wind size={16} color="#10b981" />
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#1f2937" }}>Oxigeno (SpO2): {healthData.spo2}%</span>
                      </div>
                    )}
                    {healthData.measurement_time && (
                      <div style={{ marginTop: "12px", padding: "8px", background: "#f9fafb", borderRadius: "6px", fontSize: "11px", color: "#9ca3af" }}>
                        <strong style={{ color: "#6b7280" }}>Ultima medicion:</strong> {formatDateColombia(healthData.measurement_time)}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>
                    No hay datos de salud disponibles
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}