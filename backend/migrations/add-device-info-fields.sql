-- Migración: Agregar campos para información de Terminal Status (TS)
-- Fecha: 2024-12-26
-- Descripción: Agregar columnas para almacenar información del mensaje TS

-- Agregar columna signal_strength si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='signal_strength') THEN
        ALTER TABLE devices ADD COLUMN signal_strength INTEGER;
        COMMENT ON COLUMN devices.signal_strength IS 'Intensidad de señal de red (0-100)';
    END IF;
END $$;

-- Agregar columna language si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='language') THEN
        ALTER TABLE devices ADD COLUMN language VARCHAR(10);
        COMMENT ON COLUMN devices.language IS 'Idioma configurado en el dispositivo';
    END IF;
END $$;

-- Agregar columna device_info si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='device_info') THEN
        ALTER TABLE devices ADD COLUMN device_info JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN devices.device_info IS 'Información adicional del dispositivo (firmware, URLs, intervalos, etc.)';
    END IF;
END $$;

-- Crear índice GIN para búsquedas en device_info
CREATE INDEX IF NOT EXISTS idx_devices_device_info ON devices USING GIN (device_info);

-- Mostrar resultado
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'devices' 
  AND column_name IN ('signal_strength', 'language', 'device_info')
ORDER BY ordinal_position;
