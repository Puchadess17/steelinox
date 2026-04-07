<?php
// routes/web.php

// token CSRF
$router->get('/api/csrf-token', 'AuthController@getCsrfToken');

// autenticación
$router->get('/api/me', 'AuthController@me');
$router->post('/api/login', 'AuthController@login');
$router->post('/api/logout', 'AuthController@logout');

// proyectos
$router->get('/api/projects/search', 'ProjectController@search');
$router->get('/api/projects/(\d+)', 'ProjectController@show');

// Gestión de personal en proyectos
$router->post('/api/projects/(\d+)/users/(\d+)', 'ProjectController@assignUser');
$router->delete('/api/projects/(\d+)/users/(\d+)', 'ProjectController@removeUser');

// clientes
$router->get('/api/clients', 'ClientController@index');
$router->get('/api/clients/(\d+)', 'ClientController@show');
$router->post('/api/clients', 'ClientController@store');
$router->put('/api/clients/(\d+)', 'ClientController@update');

// usuarios
$router->post('/api/users', 'UserController@store');
$router->put('/api/users/(\d+)', 'UserController@update');
$router->delete('/api/users/(\d+)', 'UserController@destroy');

// --- FRONTEND ---
$router->get('/', 'AuthController@showLogin');
$router->get('/panel', 'DashboardController@index');
$router->get('/clients', 'DashboardController@index');
$router->get('/commercials', 'DashboardController@index');
$router->get('/audit-log', 'DashboardController@index');
$router->get('/settings', 'DashboardController@index');
$router->get('/projects-new', 'DashboardController@index');

$router->get('/project/(\d+)', 'DashboardController@index');

$router->get('/client/(\d+)', 'DashboardController@index');
$router->get('/client/edit/(\d+)', 'DashboardController@index');
$router->get('/client/new', 'DashboardController@index');
