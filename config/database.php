<?php
// config/database.php

define('DB_HOST', getenv('DB_HOST') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_CHAR', getenv('DB_CHAR') ?: 'utf8mb4');