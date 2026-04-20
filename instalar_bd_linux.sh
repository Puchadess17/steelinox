#!/bin/bash

echo "====================================================="
echo "  INSTALACIÓN INICIAL - BASE DE DATOS STEEL INOX"
echo "====================================================="
echo ""
echo "ATENCIÓN: Este script borrará las bases de datos 'steel_inox_db'"
echo "y 'steel_inox_test_db' si ya existen y las instalará desde cero."
echo ""
read -p "Pulsa Enter para continuar o Ctrl+C para cancelar..."

echo ""
echo "[1/3] Creando las bases de datos limpias (Producción y Testing)..."
# Ruta típica de XAMPP en Linux. Si usan MySQL nativo, bastaría con poner 'mysql' en vez de toda la ruta.
/opt/lampp/bin/mysql -u root -e "DROP DATABASE IF EXISTS steel_inox_db; CREATE DATABASE steel_inox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
/opt/lampp/bin/mysql -u root -e "DROP DATABASE IF EXISTS steel_inox_test_db; CREATE DATABASE steel_inox_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

# Obtenemos la ruta absoluta de donde se está ejecutando el script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "[2/3] Importando tablas y datos en Producción..."
/opt/lampp/bin/mysql -u root steel_inox_db < "$DIR/steel_inox_db.sql"

echo "[3/3] Clonando estructura en la base de datos de Testing..."
/opt/lampp/bin/mysql -u root steel_inox_test_db < "$DIR/steel_inox_db.sql"

echo ""
echo "====================================================="
echo "  INSTALACIÓN COMPLETADA CON ÉXITO"
echo "====================================================="
echo "Entornos creados:"
echo "- Principal: steel_inox_db"
echo "- Pruebas:   steel_inox_test_db"
echo ""
echo "Ya puedes iniciar sesión en la app con:"
echo "Email: admin@steelinox.com"
echo ""