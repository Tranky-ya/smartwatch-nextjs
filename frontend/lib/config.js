// Configuración centralizada de URLs de API
// Este archivo previene errores cuando las variables de entorno no están definidas

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

// Exportar también como default para mayor compatibilidad
export default {
  API_URL,
  WS_URL
};
