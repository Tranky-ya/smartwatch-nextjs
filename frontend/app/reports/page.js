"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const [loading, setLoading] = useState({ pdf: false, excel: false });

  const downloadReport = async (format) => {
    setLoading({ ...loading, [format]: true });
    try {
      const response = await fetch(`${API_URL}/api/reports/devices/${format}`, { 
        method: "POST" 
      });
      
      if (!response.ok) throw new Error("Error generando reporte");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-dispositivos-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(`Error generando reporte: ${error.message}`);
    } finally {
      setLoading({ ...loading, [format]: false });
    }
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
      <div style={{ background: "linear-gradient(135deg, #202d35 0%, #2a3f4d 100%)", padding: "20px 30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: "60px", filter: "brightness(0) invert(1)" }} />
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "white", margin: "0" }}>
              Reportes
            </h1>
            <p style={{ color: "#9dc4d5", margin: "4px 0 0 0", fontSize: "14px" }}>
              Genera y descarga reportes de dispositivos
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "10px 20px",
              background: "rgba(157, 196, 213, 0.2)",
              color: "#9dc4d5",
              border: "1px solid #9dc4d5",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
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
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
        
        {/* Card de Reportes */}
        <div style={{ background: "white", borderRadius: "12px", padding: "40px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", margin: "0 0 8px 0" }}>
              Reportes de Dispositivos
            </h2>
            <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
              Exporta la información de todos los dispositivos registrados en el sistema
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            
            {/* Reporte PDF */}
            <div style={{ 
              border: "2px solid #f59e0b", 
              borderRadius: "12px", 
              padding: "30px",
              transition: "all 0.3s",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(245,158,11,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px", textAlign: "center" }}>📄</div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: "0 0 8px 0", textAlign: "center" }}>
                Reporte PDF
              </h3>
              <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px", textAlign: "center" }}>
                Genera un documento PDF con la lista completa de dispositivos
              </p>
              <ul style={{ color: "#6b7280", fontSize: "13px", marginBottom: "24px", paddingLeft: "20px" }}>
                <li>Lista de todos los dispositivos</li>
                <li>IMEI y nombre</li>
                <li>Estado (Online/Offline)</li>
                <li>Fecha de generación</li>
              </ul>
              <button
                onClick={() => downloadReport("pdf")}
                disabled={loading.pdf}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loading.pdf ? "#9ca3af" : "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading.pdf ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "15px"
                }}
              >
                {loading.pdf ? "Generando..." : "📥 Descargar PDF"}
              </button>
            </div>

            {/* Reporte Excel */}
            <div style={{ 
              border: "2px solid #10b981", 
              borderRadius: "12px", 
              padding: "30px",
              transition: "all 0.3s",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(16,185,129,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px", textAlign: "center" }}>📊</div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: "0 0 8px 0", textAlign: "center" }}>
                Reporte Excel
              </h3>
              <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px", textAlign: "center" }}>
                Genera una hoja de cálculo Excel para análisis detallado
              </p>
              <ul style={{ color: "#6b7280", fontSize: "13px", marginBottom: "24px", paddingLeft: "20px" }}>
                <li>Datos organizados en columnas</li>
                <li>IMEI, nombre, usuario</li>
                <li>Estado y nivel de batería</li>
                <li>Formato editable (.xlsx)</li>
              </ul>
              <button
                onClick={() => downloadReport("excel")}
                disabled={loading.excel}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loading.excel ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading.excel ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "15px"
                }}
              >
                {loading.excel ? "Generando..." : "📥 Descargar Excel"}
              </button>
            </div>

          </div>

          {/* Información adicional */}
          <div style={{ 
            marginTop: "40px", 
            padding: "20px", 
            background: "#f0f9ff", 
            borderRadius: "8px",
            border: "1px solid #bfdbfe"
          }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "600", color: "#1e40af" }}>
              ℹ️ Información sobre los reportes
            </h4>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", fontSize: "14px", color: "#1f2937", lineHeight: "1.8" }}>
              <li>Los reportes se generan en tiempo real con los datos actuales</li>
              <li>Incluyen todos los dispositivos registrados en el sistema</li>
              <li>El formato Excel permite edición y análisis posterior</li>
              <li>El formato PDF es ideal para impresión y presentaciones</li>
            </ul>
          </div>

        </div>

        {/* Card de próximas funcionalidades */}
        <div style={{ 
          background: "white", 
          borderRadius: "12px", 
          padding: "30px", 
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginTop: "20px"
        }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: "0 0 16px 0" }}>
            🚀 Próximamente
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "8px", fontSize: "14px", color: "#6b7280" }}>
              📈 Reportes de actividad y eventos
            </div>
            <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "8px", fontSize: "14px", color: "#6b7280" }}>
              🗺️ Reportes de geocercas con estadísticas
            </div>
            <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "8px", fontSize: "14px", color: "#6b7280" }}>
              ❤️ Reportes de datos de salud históricos
            </div>
            <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "8px", fontSize: "14px", color: "#6b7280" }}>
              🚨 Reportes de alertas y respuestas
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
