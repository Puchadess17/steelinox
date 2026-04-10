@echo off
:: Codificacion correcta para tildes
chcp 65001 >nul

echo =====================================================
echo   INSTALACIÓN INICIAL - BASE DE DATOS STEEL INOX
echo =====================================================
echo.
echo ATENCIÓN: Este script borrará la base de datos "steel_inox_db" 
echo si ya existe y la instalará desde cero.
echo.
echo Solo debes ejecutar esto la primera vez que instalas el proyecto.
echo Si estás seguro de querer continuar...
echo.
pause

echo.
echo [1/2] Creando la base de datos limpia...
C:\xampp\mysql\bin\mysql.exe -u root -e "DROP DATABASE IF EXISTS steel_inox_db; CREATE DATABASE steel_inox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

echo [2/2] Importando las tablas y el usuario administrador...
C:\xampp\mysql\bin\mysql.exe -u root steel_inox_db < "%~dp0steel_inox_db.sql"

echo.
echo =====================================================
echo   INSTALACIÓN COMPLETADA CON ÉXITO
echo =====================================================
echo Ya puedes cerrar esta ventana e iniciar sesión con:
echo Email: admin@steelinox.com
echo.
pause