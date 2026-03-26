-- Tabla de eventos de geocerca
CREATE TABLE IF NOT EXISTS geofence_events (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  geofence_id INTEGER NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('ENTER', 'EXIT')),
  event_time TIMESTAMP NOT NULL DEFAULT NOW(),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_device_events (device_id, event_time DESC),
  INDEX idx_geofence_events (geofence_id, event_time DESC),
  INDEX idx_unnotified (notified, event_time DESC)
);

-- Tabla para tracking del estado actual (está dentro o fuera)
CREATE TABLE IF NOT EXISTS device_geofence_status (
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  geofence_id INTEGER NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  is_inside BOOLEAN DEFAULT FALSE,
  last_check TIMESTAMP DEFAULT NOW(),
  last_event_id INTEGER REFERENCES geofence_events(id),
  
  PRIMARY KEY (device_id, geofence_id)
);
