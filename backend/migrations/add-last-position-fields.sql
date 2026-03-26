-- Migración: Agregar campos de última posición conocida
-- Fecha: 2024-12-27
-- Descripción: Agregar last_latitude y last_longitude a devices

-- Agregar last_latitude si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='last_latitude') THEN
        ALTER TABLE devices ADD COLUMN last_latitude DECIMAL(10, 7);
        COMMENT ON COLUMN devices.last_latitude IS 'Última latitud conocida del dispositivo';
    END IF;
END $$;

-- Agregar last_longitude si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='last_longitude') THEN
        ALTER TABLE devices ADD COLUMN last_longitude DECIMAL(10, 7);
        COMMENT ON COLUMN devices.last_longitude IS 'Última longitud conocida del dispositivo';
    END IF;
END $$;

-- Mostrar resultado
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'devices' 
  AND column_name IN ('last_latitude', 'last_longitude')
ORDER BY ordinal_position;
