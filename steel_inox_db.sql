-- phpMyAdmin SQL Dump
-- version 5.2.1
-- Tiempo de generación: 27-04-2026

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- 1. CREACIÓN DE ESTRUCTURAS (TABLAS)
-- --------------------------------------------------------

CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `actor_user_id` bigint(20) DEFAULT NULL,
  `actor_role` varchar(50) DEFAULT NULL,
  `action_key` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata_json`)),
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `clients` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(180) NOT NULL,
  `reference` varchar(80) DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `created_by` bigint(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `comments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `document_id` bigint(20) NOT NULL,
  `document_version_id` bigint(20) DEFAULT NULL,
  `author_user_id` bigint(20) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comments_proyecto_creadod` (`project_id`,`created_at`),
  KEY `idx_comments_document_created` (`document_id`,`created_at`),
  KEY `comments_ibfk_3` (`document_version_id`),
  KEY `comments_ibfk_4` (`author_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `documents` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `type` enum('propuesta','presupuesto','pdf','imagen','video','plano','documento_tecnico','materiales','otros') NOT NULL,
  `title` varchar(180) NOT NULL,
  `is_visible_to_client` tinyint(4) DEFAULT 0,
  `access_mode` enum('view','download','both') DEFAULT 'download',
  `current_version_id` bigint(20) DEFAULT NULL,
  `created_by` bigint(20) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_documents_proj_type_del` (`project_id`,`type`,`deleted_at`),
  KEY `documents_ibfk_2` (`created_by`),
  KEY `documents_ibfk_3` (`current_version_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `document_versions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) NOT NULL,
  `version_number` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `storage_path` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `checksum_sha256` char(64) NOT NULL,
  `is_current` tinyint(4) DEFAULT 0,
  `uploaded_by` bigint(20) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `archived_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_doc_versions_doc_current` (`document_id`,`is_current`),
  KEY `idx_doc_versions_uploaded_at` (`uploaded_at`),
  KEY `document_versions_ibfk_2` (`uploaded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `notifications_queue` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `recipient_user_id` bigint(20) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `recipient_email` varchar(190) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `status` enum('pending','sent','failed') DEFAULT 'pending',
  `attempts` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `sent_at` datetime DEFAULT NULL,
  `error_log` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_queue_ibfk_1` (`recipient_user_id`),
  KEY `idx_notifications_status_attempts_created` (`status`,`attempts`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `projects` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) NOT NULL,
  `name` varchar(180) NOT NULL,
  `reference` varchar(80) NOT NULL,
  `status` enum('propuesta','aprobado','ejecucion','cerrado') DEFAULT 'propuesta',
  `budget_amount` decimal(12,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `surface` varchar(80) DEFAULT NULL,
  `project_type` varchar(120) DEFAULT NULL,
  `created_by` bigint(20) NOT NULL,
  `approved_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `approval_token` varchar(64) DEFAULT NULL,
  `approval_token_expires_at` datetime DEFAULT NULL,
  `approval_failed_attempts` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `idx_projects_client_status` (`client_id`,`status`),
  KEY `idx_projects_reference` (`reference`),
  KEY `idx_projects_created_at` (`created_at`),
  KEY `projects_ibfk_2` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `project_status_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `changed_by_user_id` bigint(20) NOT NULL,
  `old_status` enum('propuesta','aprobado','ejecucion','cerrado') DEFAULT NULL,
  `new_status` enum('propuesta','aprobado','ejecucion','cerrado') NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `project_status_logs_ibfk_1` (`project_id`),
  KEY `project_status_logs_ibfk_2` (`changed_by_user_id`),
  KEY `idx_project_status_history` (`project_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `project_user` (
  `project_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`project_id`,`user_id`),
  KEY `idx_project_user_reverse` (`user_id`,`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) DEFAULT NULL,
  `role` enum('admin','comercial','cliente') NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_client_role_active` (`client_id`,`role`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 2. VOLCADO DE DATOS MASIVO
-- --------------------------------------------------------

-- STAFF INTERNO (Admins y Comerciales)
INSERT INTO `users` (`id`, `client_id`, `role`, `name`, `email`, `password_hash`, `is_active`) VALUES
(1, NULL, 'admin', 'Administrador Principal', 'steelinox2026@outlook.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(2, NULL, 'comercial', 'Juan Comercial Senior', 'steelinoxprueba@outlook.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(3, NULL, 'comercial', 'Ana Proyectos', 'ana.proyectos@steelinox.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(4, NULL, 'comercial', 'Luis Desarrollo Negocio', 'luis.negocio@steelinox.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(5, NULL, 'comercial', 'Elena Grandes Cuentas', 'elena.cuentas@steelinox.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(6, NULL, 'comercial', 'Marcos Expansión', 'marcos.expansion@steelinox.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1);

-- 20 CLIENTES (EMPRESAS)
INSERT INTO `clients` (`id`, `name`, `reference`, `is_active`, `created_by`) VALUES
(1, 'Grupo Corporativo Alfa S.A.', 'CLI-0001', 1, 1),
(2, 'Constructora Beta S.L.', 'CLI-0002', 1, 1),
(3, 'Ayuntamiento de Valencia', 'CLI-0003', 1, 2),
(4, 'Reformas Gamma e Hijos', 'CLI-0004', 1, 3),
(5, 'Industrias Delta Pesadas', 'CLI-0005', 1, 4),
(6, 'Promociones Omega 2026', 'CLI-0006', 1, 5),
(7, 'Estudio Arquitectura Zeta', 'CLI-0007', 1, 6),
(8, 'Logística y Almacenes Epsilon', 'CLI-0008', 1, 4),
(9, 'Clínicas San Pedro', 'CLI-0009', 1, 2),
(10, 'Hoteles Costa Blanca', 'CLI-0010', 0, 1),
(11, 'Naviera del Sur', 'CLI-0011', 1, 3),
(12, 'Automoción Integral SL', 'CLI-0012', 1, 5),
(13, 'Supermercados La Despensa', 'CLI-0013', 1, 6),
(14, 'Universidad Politécnica', 'CLI-0014', 1, 2),
(15, 'Energías Renovables ECO', 'CLI-0015', 1, 4),
(16, 'Centros Deportivos FIT', 'CLI-0016', 1, 5),
(17, 'Aeropuerto Local', 'CLI-0017', 1, 6),
(18, 'Bodegas Tradición', 'CLI-0018', 1, 3),
(19, 'Estaciones de Servicio RED', 'CLI-0019', 1, 2),
(20, 'Hospital Comarcal', 'CLI-0020', 1, 5);

-- 40 USUARIOS CLIENTE (2 POR EMPRESA APROX)
INSERT INTO `users` (`id`, `client_id`, `role`, `name`, `email`, `password_hash`, `is_active`) VALUES
(7, 1, 'cliente', 'Carlos CEO Alfa', 'steelinoxusercliente@outlook.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(8, 1, 'cliente', 'Marta CFO Alfa', 'marta.cfo@alfa.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(9, 2, 'cliente', 'Laura Compras Beta', 'laura.compras@beta.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(10, 2, 'cliente', 'Pedro Arquitecto', 'pedro.arq@beta.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(11, 3, 'cliente', 'Concejalía Urbanismo', 'urbanismo@valencia.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(12, 3, 'cliente', 'Dpto. Contratación', 'contratacion@valencia.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(13, 4, 'cliente', 'Javier Gamma', 'javier@reformasgamma.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(14, 5, 'cliente', 'Director Delta', 'direccion@delta.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(15, 6, 'cliente', 'Ventas Omega', 'ventas@omega2026.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(16, 7, 'cliente', 'Arquitecto Zeta', 'principal@estudiozeta.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(17, 8, 'cliente', 'Gestor Flota', 'flota@epsilon.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(18, 9, 'cliente', 'Dirección Médica', 'direccion@sanpedro.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(19, 10, 'cliente', 'Mantenimiento Hotel', 'mantenimiento@costablanca.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 0),
(20, 11, 'cliente', 'Logística Naviera', 'logistica@naviera.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(21, 12, 'cliente', 'Planta Automoción', 'planta@automocion.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(22, 13, 'cliente', 'Obras Despensa', 'obras@despensa.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(23, 14, 'cliente', 'Rectorado UP', 'rectorado@up.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(24, 15, 'cliente', 'Ingeniería ECO', 'ingenieria@eco.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(25, 16, 'cliente', 'Mantenimiento FIT', 'mantenimiento@fit.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(26, 17, 'cliente', 'Infraestructuras AERO', 'infra@aero.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(27, 18, 'cliente', 'Enólogo Jefe', 'enologo@tradicion.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(28, 19, 'cliente', 'Expansión RED', 'expansion@red.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(29, 20, 'cliente', 'Servicios Generales', 'ssgg@hospital.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(30, 1, 'cliente', 'Luis Ingeniero', 'luis.ing@alfa.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(31, 2, 'cliente', 'Ana Aparejadora', 'ana.apa@beta.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(32, 4, 'cliente', 'Técnico Reformas', 'tecnico@reformasgamma.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(33, 5, 'cliente', 'Jefe Planta Delta', 'planta@delta.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(34, 6, 'cliente', 'Marketing Omega', 'marketing@omega2026.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(35, 7, 'cliente', 'Delineante Zeta', 'delineante@estudiozeta.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(36, 8, 'cliente', 'Seguridad Epsilon', 'seguridad@epsilon.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(37, 9, 'cliente', 'Compras San Pedro', 'compras@sanpedro.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(38, 11, 'cliente', 'Mantenimiento Naviera', 'mantenimiento@naviera.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(39, 12, 'cliente', 'Calidad Automoción', 'calidad@automocion.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(40, 13, 'cliente', 'Expansión Despensa', 'expansion@despensa.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(41, 14, 'cliente', 'Campus UP', 'campus@up.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(42, 15, 'cliente', 'Operaciones ECO', 'operaciones@eco.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(43, 16, 'cliente', 'Dirección FIT', 'direccion@fit.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(44, 17, 'cliente', 'Pistas AERO', 'pistas@aero.com', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(45, 18, 'cliente', 'Turismo Tradición', 'turismo@tradicion.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1),
(46, 19, 'cliente', 'Obras RED', 'obras@red.es', '$2y$12$jmb.xqviJVpJ0m.qJT57C.mYvIq7V0j43uwD6GMsUl8w9lZreS9q.', 1);

-- 60 PROYECTOS (3 POR EMPRESA)
INSERT INTO `projects` (`id`, `client_id`, `name`, `reference`, `status`, `budget_amount`, `project_type`, `created_by`) VALUES
(1, 1, 'Nave Logística Norte', 'PRJ-2026-0001', 'ejecucion', 1500000.00, 'Industrial', 2),
(2, 1, 'Oficinas Centrales Alfa', 'PRJ-2026-0002', 'aprobado', 450000.00, 'Reformas', 3),
(3, 1, 'Cerramiento Perimetral Fábrica', 'PRJ-2026-0003', 'cerrado', 85000.00, 'Exteriores', 2),
(4, 2, 'Estructura Edificio Residencial', 'PRJ-2026-0004', 'ejecucion', 2100000.00, 'Residencial', 3),
(5, 2, 'Barandillas Balcones Fase 2', 'PRJ-2026-0005', 'propuesta', 32000.00, 'Residencial', 3),
(6, 2, 'Escalera Emergencia Bloque Sur', 'PRJ-2026-0006', 'aprobado', 65000.00, 'Seguridad', 2),
(7, 3, 'Pasarela Peatonal M30', 'PRJ-2026-0007', 'cerrado', 125000.00, 'Obra Pública', 2),
(8, 3, 'Mobiliario Urbano Parque Central', 'PRJ-2026-0008', 'ejecucion', 45000.00, 'Obra Pública', 3),
(9, 3, 'Vallas Polideportivo Municipal', 'PRJ-2026-0009', 'propuesta', 78000.00, 'Obra Pública', 4),
(10, 4, 'Refuerzo Estructural Local', 'PRJ-2026-0010', 'ejecucion', 22000.00, 'Reformas', 3),
(11, 4, 'Barandilla Escalera Caracol', 'PRJ-2026-0011', 'aprobado', 12000.00, 'Interiores', 3),
(12, 4, 'Campana Extractora Industrial', 'PRJ-2026-0012', 'cerrado', 8500.00, 'Hostelería', 2),
(13, 5, 'Plataforma Mantenimiento', 'PRJ-2026-0013', 'ejecucion', 55000.00, 'Industrial', 4),
(14, 5, 'Tolvas Acero Inoxidable', 'PRJ-2026-0014', 'aprobado', 110000.00, 'Industrial', 4),
(15, 5, 'Protecciones Muelles Carga', 'PRJ-2026-0015', 'propuesta', 28000.00, 'Logística', 2),
(16, 6, 'Estructura Chalet Piloto', 'PRJ-2026-0016', 'cerrado', 45000.00, 'Residencial', 5),
(17, 6, 'Vallas Piscina Comunitaria', 'PRJ-2026-0017', 'aprobado', 18000.00, 'Residencial', 5),
(18, 6, 'Pérgolas Áticos', 'PRJ-2026-0018', 'propuesta', 65000.00, 'Residencial', 5),
(19, 7, 'Fachada Ventilada Museo', 'PRJ-2026-0019', 'ejecucion', 350000.00, 'Fachadas', 6),
(20, 7, 'Cúpula Acristalada', 'PRJ-2026-0020', 'aprobado', 850000.00, 'Estructuras Especiales', 6),
(21, 7, 'Muro Cortina Oficinas', 'PRJ-2026-0021', 'propuesta', 420000.00, 'Fachadas', 6),
(22, 8, 'Refuerzo Estanterías Gran Carga', 'PRJ-2026-0022', 'cerrado', 75000.00, 'Logística', 4),
(23, 8, 'Pasarelas Interconexión Naves', 'PRJ-2026-0023', 'ejecucion', 125000.00, 'Logística', 4),
(24, 8, 'Puertas Correderas Industriales', 'PRJ-2026-0024', 'propuesta', 45000.00, 'Logística', 4),
(25, 9, 'Panelado Quirófanos Inox', 'PRJ-2026-0025', 'aprobado', 180000.00, 'Sanidad', 2),
(26, 9, 'Pasamanos Accesibilidad', 'PRJ-2026-0026', 'ejecucion', 25000.00, 'Sanidad', 2),
(27, 9, 'Helipuerto Azotea', 'PRJ-2026-0027', 'propuesta', 210000.00, 'Estructuras Especiales', 2),
(28, 10, 'Reforma Buffet Inox', 'PRJ-2026-0028', 'cerrado', 35000.00, 'Hostelería', 1),
(29, 10, 'Marquesina Entrada Principal', 'PRJ-2026-0029', 'cerrado', 15000.00, 'Exteriores', 1),
(30, 10, 'Pasamanos Escaleras', 'PRJ-2026-0030', 'cerrado', 8000.00, 'Interiores', 1),
(31, 11, 'Escaleras Bodega Barco', 'PRJ-2026-0031', 'ejecucion', 45000.00, 'Naval', 3),
(32, 11, 'Barandillas Cubierta', 'PRJ-2026-0032', 'aprobado', 28000.00, 'Naval', 3),
(33, 11, 'Comedores Tripulación', 'PRJ-2026-0033', 'propuesta', 52000.00, 'Naval', 3),
(34, 12, 'Bancadas Ensamblaje', 'PRJ-2026-0034', 'cerrado', 85000.00, 'Industrial', 5),
(35, 12, 'Protecciones Robots', 'PRJ-2026-0035', 'ejecucion', 120000.00, 'Industrial', 5),
(36, 12, 'Pasarelas Revisión', 'PRJ-2026-0036', 'aprobado', 65000.00, 'Industrial', 5),
(37, 13, 'Estanterías Cámaras Frigoríficas', 'PRJ-2026-0037', 'propuesta', 42000.00, 'Comercial', 6),
(38, 13, 'Protecciones Lineales Caja', 'PRJ-2026-0038', 'aprobado', 18000.00, 'Comercial', 6),
(39, 13, 'Carros Transporte Inox', 'PRJ-2026-0039', 'ejecucion', 15000.00, 'Comercial', 6),
(40, 14, 'Estructura Pabellón Deportes', 'PRJ-2026-0040', 'cerrado', 450000.00, 'Educación', 2),
(41, 14, 'Mobiliario Laboratorios', 'PRJ-2026-0041', 'ejecucion', 125000.00, 'Educación', 2),
(42, 14, 'Pasarelas Conexión Facultades', 'PRJ-2026-0042', 'aprobado', 85000.00, 'Educación', 2),
(43, 15, 'Soportes Paneles Solares', 'PRJ-2026-0043', 'propuesta', 210000.00, 'Energía', 4),
(44, 15, 'Estructuras Aerogeneradores', 'PRJ-2026-0044', 'aprobado', 550000.00, 'Energía', 4),
(45, 15, 'Vallado Plantas Solares', 'PRJ-2026-0045', 'ejecucion', 180000.00, 'Energía', 4),
(46, 16, 'Taquillas Vestuarios Inox', 'PRJ-2026-0046', 'cerrado', 45000.00, 'Deportivo', 5),
(47, 16, 'Estructuras Rocódromo', 'PRJ-2026-0047', 'ejecucion', 65000.00, 'Deportivo', 5),
(48, 16, 'Barandillas Gradas', 'PRJ-2026-0048', 'aprobado', 32000.00, 'Deportivo', 5),
(49, 17, 'Mostradores Check-in', 'PRJ-2026-0049', 'propuesta', 120000.00, 'Infraestructuras', 6),
(50, 17, 'Cintas Transportadoras', 'PRJ-2026-0050', 'aprobado', 250000.00, 'Infraestructuras', 6),
(51, 17, 'Revestimiento Columnas Terminal', 'PRJ-2026-0051', 'ejecucion', 85000.00, 'Infraestructuras', 6),
(52, 18, 'Pasarelas Depósitos Vino', 'PRJ-2026-0052', 'cerrado', 75000.00, 'Alimentario', 3),
(53, 18, 'Barandillas Sala Catas', 'PRJ-2026-0053', 'ejecucion', 15000.00, 'Alimentario', 3),
(54, 18, 'Estructura Tejado Nave Crianza', 'PRJ-2026-0054', 'aprobado', 180000.00, 'Alimentario', 3),
(55, 19, 'Marquesinas Surtidores', 'PRJ-2026-0055', 'propuesta', 125000.00, 'Comercial', 2),
(56, 19, 'Protecciones Surtidores', 'PRJ-2026-0056', 'aprobado', 45000.00, 'Comercial', 2),
(57, 19, 'Tótems Precios Inox', 'PRJ-2026-0057', 'ejecucion', 35000.00, 'Comercial', 2),
(58, 20, 'Estructura Ampliación Urgencias', 'PRJ-2026-0058', 'cerrado', 850000.00, 'Sanidad', 5),
(59, 20, 'Mobiliario Acero Inox Cocinas', 'PRJ-2026-0059', 'ejecucion', 120000.00, 'Sanidad', 5),
(60, 20, 'Barandillas Accesibilidad Exterior', 'PRJ-2026-0060', 'aprobado', 45000.00, 'Sanidad', 5);

-- ASIGNACIÓN MASIVA DE COMERCIALES A PROYECTOS (project_user)
INSERT INTO `project_user` (`project_id`, `user_id`) VALUES
(1,2),(2,3),(3,2),(4,3),(5,3),(6,2),(7,2),(8,3),(9,4),(10,3),
(11,3),(12,2),(13,4),(14,4),(15,2),(16,5),(17,5),(18,5),(19,6),(20,6),
(21,6),(22,4),(23,4),(24,4),(25,2),(26,2),(27,2),(28,2),(29,2),(30,2),
(31,3),(32,3),(33,3),(34,5),(35,5),(36,5),(37,6),(38,6),(39,6),(40,2),
(41,2),(42,2),(43,4),(44,4),(45,4),(46,5),(47,5),(48,5),(49,6),(50,6),
(51,6),(52,3),(53,3),(54,3),(55,2),(56,2),(57,2),(58,5),(59,5),(60,5);

-- LOGS DE AUDITORÍA Y CAMBIOS DE ESTADOS (MUESTRA REPRESENTATIVA)
INSERT INTO `project_status_logs` (`project_id`, `changed_by_user_id`, `old_status`, `new_status`, `reason`) VALUES
(1, 2, 'propuesta', 'aprobado', 'Firma contrato digital'),
(1, 2, 'aprobado', 'ejecucion', 'Inicio de movimiento tierras'),
(3, 2, 'propuesta', 'aprobado', 'Aceptado presupuesto'),
(3, 2, 'aprobado', 'ejecucion', 'Envío material'),
(3, 2, 'ejecucion', 'cerrado', 'Montaje finalizado'),
(4, 3, 'propuesta', 'aprobado', 'Adjudicación directa'),
(4, 3, 'aprobado', 'ejecucion', 'Cimentación completada'),
(7, 2, 'propuesta', 'aprobado', 'Licitación ganada'),
(7, 2, 'aprobado', 'ejecucion', 'Acta de replanteo'),
(7, 2, 'ejecucion', 'cerrado', 'Inauguración puente'),
(40, 2, 'propuesta', 'aprobado', 'Aprobación rectorado'),
(40, 2, 'aprobado', 'ejecucion', 'Inicio obras campus'),
(40, 2, 'ejecucion', 'cerrado', 'Entrega de llaves'),
(58, 5, 'propuesta', 'aprobado', 'Aprobación conselleria'),
(58, 5, 'aprobado', 'ejecucion', 'Desvío de tráficos'),
(58, 5, 'ejecucion', 'cerrado', 'Apertura nuevas urgencias');

INSERT INTO `audit_logs` (`actor_user_id`, `actor_role`, `action_key`, `entity_type`, `entity_id`, `project_id`, `metadata_json`, `ip`) VALUES
(1, 'admin', 'login_exitoso', 'user', 1, NULL, '{"method":"password"}', '192.168.1.10'),
(2, 'comercial', 'login_exitoso', 'user', 2, NULL, '{"method":"password"}', '192.168.1.11'),
(3, 'comercial', 'login_exitoso', 'user', 3, NULL, '{"method":"password"}', '192.168.1.12'),
(4, 'comercial', 'login_exitoso', 'user', 4, NULL, '{"method":"password"}', '192.168.1.13'),
(5, 'comercial', 'login_exitoso', 'user', 5, NULL, '{"method":"password"}', '192.168.1.14'),
(6, 'comercial', 'login_exitoso', 'user', 6, NULL, '{"method":"password"}', '192.168.1.15'),
(7, 'cliente', 'login_exitoso', 'user', 7, NULL, '{"method":"password"}', '10.0.0.1'),
(8, 'cliente', 'login_exitoso', 'user', 8, NULL, '{"method":"password"}', '10.0.0.2'),
(2, 'comercial', 'proyecto_creado', 'project', 1, 1, '{"referencia":"PRJ-2026-0001"}', '192.168.1.11'),
(3, 'comercial', 'proyecto_creado', 'project', 4, 4, '{"referencia":"PRJ-2026-0004"}', '192.168.1.12'),
(4, 'comercial', 'proyecto_creado', 'project', 22, 22, '{"referencia":"PRJ-2026-0022"}', '192.168.1.13'),
(5, 'comercial', 'estado_actualizado', 'project', 58, 58, '{"new":"cerrado"}', '192.168.1.14');

-- --------------------------------------------------------
-- 3. RESTRICCIONES DE INTEGRIDAD REFERENCIAL (FOREIGN KEYS)
-- --------------------------------------------------------

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL;

ALTER TABLE `clients`
  ADD CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`document_version_id`) REFERENCES `document_versions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `comments_ibfk_4` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`current_version_id`) REFERENCES `document_versions` (`id`) ON DELETE SET NULL;

ALTER TABLE `document_versions`
  ADD CONSTRAINT `document_versions_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `document_versions_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `notifications_queue`
  ADD CONSTRAINT `notifications_queue_ibfk_1` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `project_status_logs`
  ADD CONSTRAINT `project_status_logs_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_status_logs_ibfk_2` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `project_user`
  ADD CONSTRAINT `project_user_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_user_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;