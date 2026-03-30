<?php
// routes/web.php

// token CSRF
$router->get('/api/csrf-token', 'AuthController@getCsrfToken');

// autenticación
$router->post('/api/login', 'AuthController@login');
$router->post('/api/logout', 'AuthController@logout');

// proyectos
$router->get('/api/projects/search', 'ProjectController@search');
$router->get('/api/projects/(\d+)', 'ProjectController@show');

// FRONTEND
$router->get('/', 'AuthController@showLogin');
$router->get('/panel', 'DashboardController@index');