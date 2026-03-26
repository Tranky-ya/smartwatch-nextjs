# 🚀 Sistema Empresarial Smartwatch 4P Touch v3.0

Sistema completo de monitoreo y gestión empresarial con TODAS las funcionalidades implementadas.

## ✨ CARACTERÍSTICAS IMPLEMENTADAS

### ✅ Sistema de Autenticación
- Login/Registro con JWT
- 4 roles: Super Admin, Admin, Supervisor, Usuario
- Multi-tenancy (organizaciones)

### ✅ Geocercas
- Zonas circulares y poligonales
- Alertas automáticas
- Asignación por dispositivo

### ✅ Comandos Remotos
- 10+ comandos implementados
- Solicitar ubicación, configurar SOS, reiniciar, etc.

### ✅ Notificaciones
- Email (SMTP)
- SMS (Twilio)
- WhatsApp (Evolution API)
- Webhooks personalizables

### ✅ Reportes
- PDF y Excel
- Múltiples tipos de reportes
- Generación automática

### ✅ Seguridad
- API Keys
- Rate limiting
- Logs de auditoría
- Encriptación

## ⚡ INSTALACIÓN

```bash
tar -xzf smartwatch-enterprise-v3.tar.gz
cd smartwatch-enterprise
docker-compose up -d
```

## 🔑 CREDENCIALES

```
DB_PASSWORD: Barcelona537
JWT_SECRET: Barcelona537_Colombia_Bellomonte75
IP: 192.168.1.14

Usuario inicial:
admin@telvoz.com / Barcelona537
```

## 🌐 ACCESO

- Frontend: http://192.168.1.14:3000
- API: http://192.168.1.14:3001/api

## 📚 DOCUMENTACIÓN

Ver archivos:
- GUIA_INSTALACION.md
- DOCUMENTACION_API.md
- CONFIGURACION.md
