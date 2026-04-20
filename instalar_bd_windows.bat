@echo off
:: Codificacion correcta para tildes
chcp 65001 >nul

echo =====================================================
echo   INSTALACIÓN INICIAL - BASE DE DATOS STEEL INOX
echo =====================================================
echo.
echo ATENCIÓN: Este script borrará las bases de datos "steel_inox_db" 
echo y "steel_inox_test_db" si ya existen y las instalará desde cero.
echo.
echo Solo debes ejecutar esto la primera vez que instalas el proyecto.
echo Si estás seguro de querer continuar...
echo.
pause

echo.
echo [1/3] Creando las bases de datos limpias (Producción y Testing)...
C:\xampp\mysql\bin\mysql.exe -u root -e "DROP DATABASE IF EXISTS steel_inox_db; CREATE DATABASE steel_inox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
C:\xampp\mysql\bin\mysql.exe -u root -e "DROP DATABASE IF EXISTS steel_inox_test_db; CREATE DATABASE steel_inox_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

echo [2/3] Importando tablas y datos en Producción...
C:\xampp\mysql\bin\mysql.exe -u root steel_inox_db < "%~dp0steel_inox_db.sql"

echo [3/3] Clonando estructura en la base de datos de Testing...
C:\xampp\mysql\bin\mysql.exe -u root steel_inox_test_db < "%~dp0steel_inox_db.sql"

echo.
echo =====================================================
echo   INSTALACIÓN COMPLETADA CON ÉXITO
echo =====================================================
echo Entornos creados: 
echo - Principal: steel_inox_db
echo - Pruebas:   steel_inox_test_db
echo.
echo Ya puedes cerrar esta ventana e iniciar sesión en la app con:
echo Email: admin@steelinox.com
echo.
pause