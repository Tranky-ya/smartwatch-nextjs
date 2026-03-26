"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MapClient() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});
  const geofenceMarkersRef = useRef({});
  const [devices, setDevices] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedGeofence, setSelectedGeofence] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
      initMap();
    }
  }, []);

  useEffect(() => {
    if (mapInstance.current) {
      updateMarkers();
    }
  }, [devices]);

  useEffect(() => {
    if (mapInstance.current) {
      updateGeofences();
    }
  }, [geofences]);

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

      const [devicesRes, geofencesRes] = await Promise.all([
        fetch(`${API_URL}/api/devices`, { headers }),
        fetch(`${API_URL}/api/geofences`, { headers })
      ]);

      // Si 401, redirigir a login
      if (devicesRes.status === 401 || geofencesRes.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }
      
      const devicesData = await devicesRes.json();
      const geofencesData = await geofencesRes.json();
      
      setDevices(devicesData);
      setGeofences(geofencesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const initMap = async () => {
    try {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current).setView([6.244203, -75.581215], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      
      mapInstance.current = map;
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const updateMarkers = async () => {
    if (!mapInstance.current) return;
    
    try {
      const L = await import('leaflet');
      
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      
      devices.forEach(device => {
        if (device.last_latitude && device.last_longitude) {
          const iconHtml = `
            <div style="
              width: 35px;
              height: 35px;
              background: ${device.is_online ? '#10b981' : '#ef4444'};
              border: 4px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              📱
            </div>
          `;
          
          const icon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [35, 35],
            iconAnchor: [17, 17]
          });
          
          const popupContent = `
            <div style="font-family: Arial, sans-serif; min-width: 280px;">
              <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 12px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">
                📱 ${device.name || device.imei}
              </div>
              
              <div style="margin-bottom: 8px; font-size: 13px;">
                <strong>IMEI:</strong> ${device.imei}
              </div>
              
              <div style="margin-bottom: 10px; font-size: 13px;">
                <strong>Estado:</strong> 
                <span style="color: ${device.is_online ? '#10b981' : '#ef4444'}; font-weight: bold;">
                  ${device.is_online ? '● En línea' : '○ Fuera de línea'}
                </span>
              </div>
              
              <div style="margin-bottom: 12px;">
                <div style="font-size: 13px; margin-bottom: 5px;">
                  <strong>🔋 Batería:</strong> ${device.battery_level || 0}%
                </div>
                <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: ${device.battery_level > 50 ? '#10b981' : device.battery_level > 20 ? '#f59e0b' : '#ef4444'}; height: 100%; width: ${device.battery_level || 0}%;"></div>
                </div>
              </div>
              
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong>👟 Pasos hoy:</strong> ${device.steps_today?.toLocaleString() || 0}
              </div>
              
              <div style="background: #f0f9ff; padding: 12px; border-radius: 6px; border-left: 3px solid #667eea; margin: 12px 0;">
                <div style="font-weight: bold; margin-bottom: 8px; color: #333; font-size: 13px;">📍 Coordenadas GPS</div>
                <div style="font-size: 12px; color: #555; line-height: 1.6;">
                  <strong>Latitud:</strong> ${device.last_latitude?.toFixed(6)}<br/>
                  <strong>Longitud:</strong> ${device.last_longitude?.toFixed(6)}
                </div>
              </div>
              
              ${device.last_connection ? `
                <div style="font-size: 11px; color: #999; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center;">
                  Última conexión: ${new Date(device.last_connection).toLocaleString('es-CO')}
                </div>
              ` : ''}
            </div>
          `;
          
          const marker = L.marker([device.last_latitude, device.last_longitude], { icon })
            .addTo(mapInstance.current)
            .bindPopup(popupContent, { maxWidth: 320 })
            .on('click', () => {
              setSelectedDevice(device);
              setSelectedGeofence(null);
            });
          
          marker.on('mouseover', function() {
            this.getElement().style.transform = 'scale(1.2)';
          });
          
          marker.on('mouseout', function() {
            this.getElement().style.transform = 'scale(1)';
          });
          
          markersRef.current[device.id] = marker;
        }
      });
    } catch (error) {
      console.error('Error updating markers:', error);
    }
  };

  const updateGeofences = async () => {
    if (!mapInstance.current) return;
    
    try {
      const L = await import('leaflet');
      
      // Remover círculos y marcadores de geocercas anteriores
      Object.values(circlesRef.current).forEach(circle => circle.remove());
      Object.values(geofenceMarkersRef.current).forEach(marker => marker.remove());
      circlesRef.current = {};
      geofenceMarkersRef.current = {};
      
      geofences.forEach(fence => {
        if (fence.center_lat && fence.center_lng && fence.radius_meters) {
          // Crear círculo
          const circle = L.circle([fence.center_lat, fence.center_lng], {
            color: fence.is_active ? '#667eea' : '#999',
            fillColor: fence.is_active ? '#667eea' : '#999',
            fillOpacity: 0.2,
            weight: 3,
            radius: fence.radius_meters
          }).addTo(mapInstance.current);
          
          // Crear marcador azul en el centro
          const centerIconHtml = `
            <div style="
              width: 30px;
              height: 30px;
              background: #667eea;
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              📍
            </div>
          `;
          
          const centerIcon = L.divIcon({
            html: centerIconHtml,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          
          const popupContent = `
            <div style="font-family: Arial, sans-serif; min-width: 250px;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 8px;">
                🗺️ ${fence.name}
              </div>
              
              ${fence.description ? `
                <div style="font-size: 13px; color: #666; margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                  ${fence.description}
                </div>
              ` : ''}
              
              <div style="font-size: 13px; color: #555; line-height: 1.8; margin-bottom: 10px;">
                <div><strong>📏 Radio:</strong> ${fence.radius_meters}m</div>
                <div><strong>📐 Área:</strong> ${(Math.PI * Math.pow(fence.radius_meters / 1000, 2)).toFixed(2)} km²</div>
                <div><strong>Estado:</strong> <span style="color: ${fence.is_active ? '#10b981' : '#999'}; font-weight: bold;">${fence.is_active ? '✓ Activa' : '○ Inactiva'}</span></div>
              </div>
              
              <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border-left: 3px solid #667eea;">
                <div style="font-weight: bold; margin-bottom: 6px; color: #333; font-size: 13px;">📍 Centro de la Geocerca</div>
                <div style="font-size: 12px; color: #555; line-height: 1.6;">
                  <strong>Latitud:</strong> ${fence.center_lat.toFixed(6)}<br/>
                  <strong>Longitud:</strong> ${fence.center_lng.toFixed(6)}
                </div>
              </div>
            </div>
          `;
          
          // Marcador central clickeable
          const centerMarker = L.marker([fence.center_lat, fence.center_lng], { icon: centerIcon })
            .addTo(mapInstance.current)
            .bindPopup(popupContent, { maxWidth: 300 })
            .on('click', () => {
              setSelectedGeofence(fence);
              setSelectedDevice(null);
            });
          
          // También hacer el círculo clickeable
          circle.bindPopup(popupContent, { maxWidth: 300 })
            .on('click', () => {
              setSelectedGeofence(fence);
              setSelectedDevice(null);
            });
          
          circle.on('mouseover', function() {
            this.setStyle({ fillOpacity: 0.4, weight: 4 });
          });
          
          circle.on('mouseout', function() {
            this.setStyle({ fillOpacity: 0.2, weight: 3 });
          });
          
          centerMarker.on('mouseover', function() {
            this.getElement().style.transform = 'scale(1.3)';
          });
          
          centerMarker.on('mouseout', function() {
            this.getElement().style.transform = 'scale(1)';
          });
          
          circlesRef.current[fence.id] = circle;
          geofenceMarkersRef.current[fence.id] = centerMarker;
        }
      });
    } catch (error) {
      console.error('Error updating geofences:', error);
    }
  };

  const flyToDevice = (device) => {
    if (device.last_latitude && device.last_longitude && mapInstance.current) {
      mapInstance.current.flyTo([device.last_latitude, device.last_longitude], 16);
      setSelectedDevice(device);
      setSelectedGeofence(null);
      if (markersRef.current[device.id]) {
        markersRef.current[device.id].openPopup();
      }
    }
  };

  const flyToGeofence = (fence) => {
    if (fence.center_lat && fence.center_lng && mapInstance.current) {
      mapInstance.current.flyTo([fence.center_lat, fence.center_lng], 15);
      setSelectedGeofence(fence);
      setSelectedDevice(null);
      if (geofenceMarkersRef.current[fence.id]) {
        geofenceMarkersRef.current[fence.id].openPopup();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Header con navegación */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '15px 30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>🗺️ Mapa en Tiempo Real</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Dispositivos y geocercas</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              🏠 Dashboard
            </button>
            <button
              onClick={() => router.push('/geofences')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              📍 Geocercas
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Panel Lateral */}
        <div style={{ width: '380px', background: '#f8f9fa', padding: '20px', overflowY: 'auto', borderRight: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px', marginBottom: '15px' }}>
            📱 Dispositivos ({devices.length})
          </h3>
          
          {devices.map(device => (
            <div
              key={device.id}
              onClick={() => flyToDevice(device)}
              style={{
                padding: '15px',
                background: selectedDevice?.id === device.id ? '#e7f3ff' : 'white',
                marginBottom: '12px',
                borderRadius: '8px',
                cursor: device.last_latitude ? 'pointer' : 'default',
                border: selectedDevice?.id === device.id ? '2px solid #667eea' : '1px solid #e5e7eb',
                boxShadow: selectedDevice?.id === device.id ? '0 2px 8px rgba(102,126,234,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#333' }}>
                {device.name || device.imei}
              </div>
              
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                IMEI: {device.imei}
              </div>
              
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: device.is_online ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  {device.is_online ? '● En línea' : '○ Fuera de línea'}
                </span>
              </div>
              
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                🔋 Batería: {device.battery_level || 0}%
              </div>
              
              <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ 
                  background: device.battery_level > 50 ? '#10b981' : device.battery_level > 20 ? '#f59e0b' : '#ef4444', 
                  height: '100%', 
                  width: `${device.battery_level || 0}%`,
                  transition: 'width 0.3s'
                }}></div>
              </div>
              
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                👟 Pasos: {device.steps_today?.toLocaleString() || 0}
              </div>
              
              {device.last_latitude && device.last_longitude && (
                <div style={{ fontSize: '11px', color: '#999', marginTop: '8px', padding: '6px', background: '#f0f9ff', borderRadius: '4px' }}>
                  📍 {device.last_latitude.toFixed(6)}, {device.last_longitude.toFixed(6)}
                </div>
              )}
            </div>
          ))}
          
          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #ddd' }} />
          
          <h3 style={{ color: '#333', fontSize: '18px', marginBottom: '15px' }}>
            🗺️ Geocercas ({geofences.length})
          </h3>
          
          {geofences.map(fence => (
            <div
              key={fence.id}
              onClick={() => flyToGeofence(fence)}
              style={{
                padding: '12px',
                background: selectedGeofence?.id === fence.id ? '#e7f3ff' : 'white',
                marginBottom: '10px',
                borderRadius: '6px',
                border: selectedGeofence?.id === fence.id ? '2px solid #667eea' : '1px solid #e5e7eb',
                boxShadow: selectedGeofence?.id === fence.id ? '0 2px 8px rgba(102,126,234,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#333' }}>
                📍 {fence.name}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                📏 {fence.radius_meters}m • {fence.is_active ? '✓ Activa' : '○ Inactiva'}
              </div>
            </div>
          ))}
        </div>
        
        {/* Mapa */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          
          {/* Leyenda */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: '13px',
            zIndex: 1000
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Leyenda</div>
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: '#10b981', borderRadius: '50%', border: '3px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></div>
              <span>Dispositivo en línea</span>
            </div>
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%', border: '3px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></div>
              <span>Dispositivo fuera de línea</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: '#667eea', borderRadius: '50%', border: '3px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></div>
              <span>Centro de geocerca</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
