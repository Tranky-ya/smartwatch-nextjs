# 🔒 ACCIÓN DE SEGURIDAD URGENTE REQUERIDA

## ⚠️ CREDENCIALES EXPUESTAS EN REPOSITORIO PÚBLICO

Este repositorio contenía credenciales sensibles expuestas públicamente. **Debes tomar acción INMEDIATA**:

## 1. REVOCAR CREDENCIALES COMPROMETIDAS (URGENTE)

### Google Geolocation API Key
- **Key expuesta:** `AIzaSyBMrnhI98PXPI3lVI-bFI8jz-ZyEmA24Yg`
- **Acción:**
  1. Ve a https://console.cloud.google.com/apis/credentials
  2. Busca esta API key y **REVÓCALA INMEDIATAMENTE**
  3. Genera una nueva API key
  4. Configura restricciones de IP (solo tu servidor)
  5. Actualiza `.env.docker` con la nueva key

### Unwired Labs Token
- **Token expuesto:** `pk.3375aa06d89d8fc11116edf2f2ff52ea`
- **Acción:**
  1. Ve a tu panel de Unwired Labs
  2. Revoca este token
  3. Genera uno nuevo
  4. Actualiza `.env.docker`

### OpenCellID Token
- **Token expuesto:** `pk.e71689991f177c30448dd2841bd0d984`
- **Acción:**
  1. Ve a https://opencellid.org/
  2. Revoca este token
  3. Genera uno nuevo
  4. Actualiza `.env.docker`

### JWT Secret
- **Secret expuesto:** `Barcelona537_Colombia_Bellomonte75`
- **Acción:**
  1. Genera un nuevo secret seguro: `openssl rand -base64 32`
  2. Actualiza `.env.docker`
  3. **IMPORTANTE:** Todos los usuarios deberán volver a loguearse

### Contraseña de PostgreSQL
- **Password expuesta:** `Barcelona537`
- **Acción:**
  1. Cambia la contraseña de PostgreSQL
  2. Actualiza `.env.docker`
  3. Reinicia el contenedor

## 2. CONFIGURACIÓN SEGURA

### Paso 1: Crear archivo de credenciales
```bash
cp .env.docker.example .env.docker
```

### Paso 2: Editar `.env.docker` con tus credenciales NUEVAS
```bash
nano .env.docker
# O usa tu editor favorito
```

### Paso 3: Crear `docker-compose.yml` desde el ejemplo
```bash
cp docker-compose.example.yml docker-compose.yml
```

### Paso 4: Levantar servicios
```bash
docker-compose --env-file .env.docker up -d
```

## 3. LIMPIAR HISTORIAL DE GIT (Opcional pero recomendado)

Las credenciales están en el historial del repositorio. Para eliminarlas completamente:

```bash
# Instalar BFG Repo-Cleaner
# macOS: brew install bfg
# Ubuntu/Debian: sudo apt install bfg

# Limpiar archivos con credenciales del historial
bfg --delete-files docker-compose.yml
bfg --replace-text credentials.txt  # Crea este archivo con las keys a reemplazar

# Limpiar referencias
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Forzar push (⚠️ CUIDADO: esto reescribe el historial)
git push --force
```

## 4. VERIFICACIÓN

- [ ] Google API Key antigua REVOCADA
- [ ] Unwired Labs Token antiguo REVOCADO
- [ ] OpenCellID Token antiguo REVOCADO
- [ ] JWT Secret ROTADO
- [ ] PostgreSQL password CAMBIADO
- [ ] `.env.docker` creado con nuevas credenciales
- [ ] `docker-compose.yml` NO está en el repositorio
- [ ] Servicios funcionando con nuevas credenciales

## 5. BUENAS PRÁCTICAS

✅ **HACER:**
- Usar variables de entorno para todas las credenciales
- Mantener `.env*` y `docker-compose.yml` en `.gitignore`
- Versionar solo archivos `.example`
- Rotar credenciales periódicamente

❌ **NO HACER:**
- Hardcodear credenciales en código
- Commitear archivos con secrets
- Compartir credenciales en chat/email
- Usar credenciales de producción en desarrollo

## 6. CONTACTO

Si sospechas que alguien usó tus credenciales expuestas:
1. Revisa logs de facturación en Google Cloud
2. Revisa logs de uso en Unwired Labs/OpenCellID
3. Cambia TODAS las credenciales inmediatamente
4. Monitorea actividad sospechosa

---

**Generado:** 2026-04-24
**Razón:** Detección de credenciales expuestas en repositorio público
**Prioridad:** 🔴 CRÍTICA - Acción inmediata requerida
