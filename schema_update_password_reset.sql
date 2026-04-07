-- Ejecutar esta consulta en tu base de datos (phpMyAdmin o terminal SQL)
-- ------------------------------------------------------------------------

ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL AFTER password_hash,
ADD COLUMN reset_token_expires_at DATETIME DEFAULT NULL AFTER reset_token;

-- ------------------------------------------------------------------------
-- Estos campos permitirán almacenar el token de seguridad temporal (1 hora)
-- para la recuperación de contraseñas.
