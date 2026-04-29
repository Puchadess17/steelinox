<?php
// routes/web.php

/**
 * ====================
 * REGISTRO DE RUTAS (WEB & API)
 * ====================
 * Archivo central de enrutamiento. Define todos los endpoints públicos
 * y privados de la aplicación, enlazando verbos HTTP y URIs con sus
 * respectivos Controladores y Métodos.
 */

/**
 * SEGURIDAD Y PREVENCIÓN
 * Endpoints para validación y protección contra ataques Cross-Site Request Forgery.
 */
// Token CSRF
$router->get('/api/csrf-token', 'AuthController@getCsrfToken');

/**
 * AUDITORÍA Y TRAZABILIDAD (LOGS)
 * Recuperación del historial inmutable de acciones. Soporta filtros globales
 * y búsquedas acotadas por entidad.
 */
$router->get('/api/projects/(\d+)/audit', 'AuditController@getProjectTimeline');
$router->get('/api/clients/(\d+)/audit', 'AuditController@getClientTimeline');
$router->get('/api/audit', 'AuditController@getGlobalLogs');
$router->get('/api/audit/filters', 'AuditController@getFiltersData');

/**
 * AUTENTICACIÓN Y SESIONES
 * Gestión del ciclo de vida del usuario, desde el inicio de sesión
 * hasta la recuperación de credenciales mediante tokens.
 */
$router->get('/api/me', 'AuthController@me');
$router->put('/api/me', 'UserController@updateProfile');
$router->put('/api/me/password', 'UserController@updatePassword');
$router->post('/api/login', 'AuthController@login');
$router->post('/api/login/verify-otp', 'AuthController@verifyOtp');
$router->post('/api/logout', 'AuthController@logout');
$router->post('/api/password/forgot', 'PasswordResetController@sendResetEmail');
$router->post('/api/password/reset', 'PasswordResetController@resetPassword');

/**
 * GESTIÓN DE PROYECTOS
 * Núcleo de negocio. Endpoints RESTful para la administración de expedientes.
 */
$router->get('/api/projects/search', 'ProjectController@search');
$router->post('/api/projects', 'ProjectController@store');
$router->get('/api/projects/(\d+)', 'ProjectController@show');
$router->put('/api/projects/(\d+)', 'ProjectController@update');
$router->put('/api/projects/(\d+)/status', 'ProjectController@changeStatus');
$router->delete('/api/projects/(\d+)', 'ProjectController@destroy');

// RUTAS DE DOBLE VERIFICACIÓN
$router->post('/api/projects/(\d+)/approve/request', 'ProjectController@requestApproval');
$router->post('/api/projects/(\d+)/approve/confirm', 'ProjectController@confirmApproval');

/**
 * COMENTARIOS DE DOCUMENTOS
 * Sistema de comunicación anidado dentro de los archivos del proyecto.
 */
$router->get('/api/projects/(\d+)/documents/(\d+)/comments', 'CommentController@index');
$router->post('/api/projects/(\d+)/documents/(\d+)/comments', 'CommentController@store');
$router->put('/api/projects/(\d+)/documents/(\d+)/comments/(\d+)', 'CommentController@update');
$router->delete('/api/projects/(\d+)/documents/(\d+)/comments/(\d+)', 'CommentController@destroy');

/**
 * ASIGNACIÓN DE PERSONAL (TABLA PIVOTE)
 * Gestión de accesos de comerciales a proyectos específicos.
 */
$router->get('/api/projects/(\d+)/users', 'ProjectController@getAssignedUsers');
$router->get('/api/projects/(\d+)/available-users', 'ProjectController@getAvailableUsers');
$router->post('/api/projects/(\d+)/users/(\d+)', 'ProjectController@assignUser');
$router->delete('/api/projects/(\d+)/users/(\d+)', 'ProjectController@removeUser');

/**
 * ENTIDADES PRINCIPALES (CRUD)
 * Operaciones estándar sobre Empresas (Clientes), Usuarios Cliente 
 * y Personal interno (Comerciales).
 */

// Clientes (Empresas)
$router->get('/api/clients', 'ClientController@index');
$router->get('/api/clients/(\d+)', 'ClientController@show');
$router->post('/api/clients', 'ClientController@store');
$router->put('/api/clients/(\d+)', 'ClientController@update');
$router->delete('/api/clients/(\d+)', 'ClientController@destroy');

// Usuarios (Cuentas de clientes)
$router->get('/api/users', 'UserController@index');
$router->get('/api/users/(\d+)', 'UserController@show');
$router->post('/api/users', 'UserController@store');
$router->put('/api/users/(\d+)', 'UserController@update');
$router->delete('/api/users/(\d+)', 'UserController@destroy');

// Comerciales (Empleados de Steel Inox)
$router->get('/api/commercials', 'CommercialController@index');
$router->post('/api/commercials', 'CommercialController@store');
$router->get('/api/commercials/(\d+)', 'CommercialController@show');
$router->put('/api/commercials/(\d+)', 'CommercialController@update');
$router->delete('/api/commercials/(\d+)', 'CommercialController@destroy');

/**
 * GESTIÓN DOCUMENTAL (API SEGURA)
 * Flujo de archivos. La descarga y visualización pasan por PHP para
 * garantizar la verificación de permisos antes de entregar el binario.
 */
$router->get('/api/projects/(\d+)/documents', 'DocumentController@index');
$router->post('/api/projects/(\d+)/documents', 'DocumentController@store');
$router->get('/api/projects/(\d+)/documents/(\d+)/download', 'DocumentController@download');
$router->get('/api/projects/(\d+)/documents/(\d+)/view', 'DocumentController@view');
$router->get('/api/projects/(\d+)/documents/(\d+)/versions', 'DocumentController@versions');
$router->post('/api/projects/(\d+)/documents/(\d+)/versions', 'DocumentController@addVersion');

$router->put('/api/projects/(\d+)/documents/(\d+)', 'DocumentController@update');
$router->delete('/api/projects/(\d+)/documents/(\d+)', 'DocumentController@destroy');

/**
 * ============================
 * ENRUTAMIENTO FRONTEND (SPA)
 * ============================
 * Captura todas las URLs de navegación del navegador web que no son API.
 * Devuelven el contenedor HTML principal (Dashboard). El enrutador JS del 
 * frontend tomará el control a partir de aquí para renderizar la vista.
 */

// Rutas base públicas
$router->get('/', 'AuthController@showLogin');
$router->get('/password/reset', 'PasswordResetController@showResetForm');
$router->get('/panel', 'DashboardController@index');

// Rutas de administración (Dashboard SPA)
$router->get('/clients', 'DashboardController@index');
$router->get('/client/(\d+)', 'DashboardController@index');
$router->get('/client/edit/(\d+)', 'DashboardController@index');
$router->get('/client/new', 'DashboardController@index');

$router->get('/commercials', 'DashboardController@index');
$router->get('/commercial/(\d+)', 'DashboardController@index');
$router->get('/commercial/edit/(\d+)', 'DashboardController@index');
$router->get('/commercial/new', 'DashboardController@index');

$router->get('/users', 'DashboardController@index');
$router->get('/user/(\d+)', 'DashboardController@index');
$router->get('/user/edit/(\d+)', 'DashboardController@index');
$router->get('/user/new', 'DashboardController@index');

$router->get('/audit-log', 'DashboardController@index');
$router->get('/settings', 'DashboardController@index');
$router->get('/projects-new', 'DashboardController@index');

$router->get('/project/(\d+)', 'DashboardController@index');
$router->get('/project/(\d+)/edit', 'DashboardController@index');
$router->get('/project/(\d+)/documents', 'DashboardController@index');
$router->get('/project/(\d+)/documents/(\d+)', 'DashboardController@index');
$router->get('/project/(\d+)/logs', 'DashboardController@index');