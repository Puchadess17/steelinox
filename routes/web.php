<?php
// routes/web.php

// Token CSRF
$router->get('/api/csrf-token', 'AuthController@getCsrfToken');

// Auditoría y Trazabilidad
$router->get('/api/projects/(\d+)/audit', 'AuditController@getProjectTimeline');
$router->get('/api/clients/(\d+)/audit', 'AuditController@getClientTimeline');
$router->get('/api/audit', 'AuditController@getGlobalLogs');
$router->get('/api/audit/filters', 'AuditController@getFiltersData');

// Autenticación
$router->get('/api/me', 'AuthController@me');
$router->post('/api/login', 'AuthController@login');
$router->post('/api/logout', 'AuthController@logout');
$router->post('/api/password/forgot', 'PasswordResetController@sendResetEmail');
$router->post('/api/password/reset', 'PasswordResetController@resetPassword');

// Proyectos
$router->get('/api/projects/search', 'ProjectController@search');
$router->post('/api/projects', 'ProjectController@store');
$router->get('/api/projects/(\d+)', 'ProjectController@show');
$router->put('/api/projects/(\d+)', 'ProjectController@update');
$router->put('/api/projects/(\d+)/status', 'ProjectController@changeStatus');

// Comentarios de documentos
$router->get('/api/projects/(\d+)/documents/(\d+)/comments', 'CommentController@index');
$router->post('/api/projects/(\d+)/documents/(\d+)/comments', 'CommentController@store');

// Gestión de comerciales en proyectos
$router->get('/api/projects/(\d+)/users', 'ProjectController@getAssignedUsers');
$router->get('/api/projects/(\d+)/available-users', 'ProjectController@getAvailableUsers');
$router->post('/api/projects/(\d+)/users/(\d+)', 'ProjectController@assignUser');
$router->delete('/api/projects/(\d+)/users/(\d+)', 'ProjectController@removeUser');

// Clientes
$router->get('/api/clients', 'ClientController@index');
$router->get('/api/clients/(\d+)', 'ClientController@show');
$router->post('/api/clients', 'ClientController@store');
$router->put('/api/clients/(\d+)', 'ClientController@update');
$router->delete('/api/clients/(\d+)', 'ClientController@destroy');

// Usuarios (Clientes)
$router->get('/api/users', 'UserController@index');
$router->get('/api/users/(\d+)', 'UserController@show');
$router->post('/api/users', 'UserController@store');
$router->put('/api/users/(\d+)', 'UserController@update');
$router->delete('/api/users/(\d+)', 'UserController@destroy');

// Comerciales
$router->get('/api/commercials', 'CommercialController@index');
$router->post('/api/commercials', 'CommercialController@store');
$router->get('/api/commercials/(\d+)', 'CommercialController@show');
$router->put('/api/commercials/(\d+)', 'CommercialController@update');
$router->delete('/api/commercials/(\d+)', 'CommercialController@destroy');

// Documentos de proyectos (API Segura)
$router->get('/api/projects/(\d+)/documents', 'DocumentController@index');
$router->post('/api/projects/(\d+)/documents', 'DocumentController@store');
$router->get('/api/projects/(\d+)/documents/(\d+)/download', 'DocumentController@download');
$router->get('/api/projects/(\d+)/documents/(\d+)/view', 'DocumentController@view');
$router->get('/api/projects/(\d+)/documents/(\d+)/versions', 'DocumentController@versions');
$router->post('/api/projects/(\d+)/documents/(\d+)/versions', 'DocumentController@addVersion');

// --- FRONTEND ---
$router->get('/', 'AuthController@showLogin');
$router->get('/password/reset', 'PasswordResetController@showResetForm');
$router->get('/panel', 'DashboardController@index');

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

