#!/bin/bash

echo "====================================================="
echo "  INSTALACIÓN INICIAL - BASE DE DATOS STEEL INOX"
echo "====================================================="
echo ""
echo "ATENCIÓN: Este script borrará la base de datos 'steel_inox_db'"
echo "si ya existe y la instalará desde cero."
echo ""
read -p "Pulsa Enter para continuar o Ctrl+C para cancelar..."

echo ""
echo "[1/2] Creando la base de datos limpia..."
# Ruta típica de XAMPP en Linux. Si usan MySQL nativo, bastaría con poner 'mysql' en vez de toda la ruta.
/opt/lampp/bin/mysql -u root -e "DROP DATABASE IF EXISTS steel_inox_db; CREATE DATABASE steel_inox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

echo "[2/2] Importando las tablas y el usuario administrador..."
# Obtenemos la ruta absoluta de donde se está ejecutando el script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
/opt/lampp/bin/mysql -u root steel_inox_db < "$DIR/steel_inox_db.sql"

echo ""
echo "====================================================="
echo "  INSTALACIÓN COMPLETADA CON ÉXITO"
echo "====================================================="
echo "Ya puedes iniciar sesión con:"
echo "Email: admin@steelinox.com"
echo ""