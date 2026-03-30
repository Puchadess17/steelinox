-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 30-03-2026 a las 10:37:59
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.4.19

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `steel_inox_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL,
  `actor_user_id` bigint(20) DEFAULT NULL,
  `actor_role` varchar(50) DEFAULT NULL,
  `action_key` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` bigint(20) NOT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata_json`)),
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clients`
--

CREATE TABLE `clients` (
  `id` bigint(20) NOT NULL,
  `name` varchar(180) NOT NULL,
  `reference` varchar(80) DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `created_by` bigint(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `clients`
--

INSERT INTO `clients` (`id`, `name`, `reference`, `is_active`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Empresa Demo S.L.', 'CLI-001', 1, 1, '2026-03-27 11:25:19', '2026-03-27 11:25:19', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comments`
--

CREATE TABLE `comments` (
  `id` bigint(20) NOT NULL,
  `project_id` bigint(20) NOT NULL,
  `document_id` bigint(20) NOT NULL,
  `document_version_id` bigint(20) DEFAULT NULL,
  `author_user_id` bigint(20) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documents`
--

CREATE TABLE `documents` (
  `id` bigint(20) NOT NULL,
  `project_id` bigint(20) NOT NULL,
  `type` enum('propuesta','presupuesto','pdf','imagen','video','plano','documento_tecnico','materiales','otros') NOT NULL,
  `title` varchar(180) NOT NULL,
  `is_visible_to_client` tinyint(4) DEFAULT 0,
  `access_mode` enum('view','download','both') DEFAULT 'download',
  `current_version_id` bigint(20) DEFAULT NULL,
  `created_by` bigint(20) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `document_versions`
--

CREATE TABLE `document_versions` (
  `id` bigint(20) NOT NULL,
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
  `archived_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notifications_queue`
--

CREATE TABLE `notifications_queue` (
  `id` bigint(20) NOT NULL,
  `recipient_user_id` bigint(20) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `recipient_email` varchar(190) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `status` enum('pending','sent','failed') DEFAULT 'pending',
  `attempts` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `sent_at` datetime DEFAULT NULL,
  `error_log` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `projects`
--

CREATE TABLE `projects` (
  `id` bigint(20) NOT NULL,
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
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `projects`
--

INSERT INTO `projects` (`id`, `client_id`, `name`, `reference`, `status`, `budget_amount`, `description`, `surface`, `project_type`, `created_by`, `approved_at`, `closed_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'Reforma Oficinas Centrales', 'PRJ-2024-001', 'propuesta', 15000.00, 'Remodelación técnica de recepción con acabados en acero inoxidable satinado y mejora de iluminación integrada.', '125.50', 'Reforma de Interiores', 1, NULL, NULL, '2026-03-27 11:25:19', '2026-03-30 09:33:46', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project_status_logs`
--

CREATE TABLE `project_status_logs` (
  `id` bigint(20) NOT NULL,
  `project_id` bigint(20) NOT NULL,
  `changed_by_user_id` bigint(20) NOT NULL,
  `old_status` enum('propuesta','aprobado','ejecucion','cerrado') DEFAULT NULL,
  `new_status` enum('propuesta','aprobado','ejecucion','cerrado') NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project_user`
--

CREATE TABLE `project_user` (
  `project_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL,
  `client_id` bigint(20) DEFAULT NULL,
  `role` enum('admin','comercial','cliente') NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `client_id`, `role`, `name`, `email`, `password_hash`, `is_active`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, NULL, 'admin', 'Administrador Principal', 'admin@steelinox.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, '2026-03-30 08:19:26', '2026-03-26 17:18:25', '2026-03-30 08:19:26', NULL),
(2, 1, 'cliente', 'Cliente Empresa \r\n        demo', 'empresa@cliente.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, '2026-03-30 09:15:07', '2026-03-30 09:12:24', '2026-03-30 09:15:07', NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_project_created` (`project_id`,`created_at`),
  ADD KEY `idx_audit_actor_created` (`actor_user_id`,`created_at`),
  ADD KEY `idx_audit_action_key` (`action_key`);

--
-- Indices de la tabla `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_comments_project_created` (`project_id`,`created_at`),
  ADD KEY `idx_comments_document_created` (`document_id`,`created_at`),
  ADD KEY `comments_ibfk_3` (`document_version_id`),
  ADD KEY `comments_ibfk_4` (`author_user_id`);

--
-- Indices de la tabla `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_documents_proj_type_del` (`project_id`,`type`,`deleted_at`),
  ADD KEY `documents_ibfk_2` (`created_by`),
  ADD KEY `documents_ibfk_3` (`current_version_id`);

--
-- Indices de la tabla `document_versions`
--
ALTER TABLE `document_versions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_doc_versions_doc_current` (`document_id`,`is_current`),
  ADD KEY `idx_doc_versions_uploaded_at` (`uploaded_at`),
  ADD KEY `document_versions_ibfk_2` (`uploaded_by`);

--
-- Indices de la tabla `notifications_queue`
--
ALTER TABLE `notifications_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_queue_ibfk_1` (`recipient_user_id`);

--
-- Indices de la tabla `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_projects_client_status` (`client_id`,`status`),
  ADD KEY `idx_projects_reference` (`reference`),
  ADD KEY `idx_projects_created_at` (`created_at`),
  ADD KEY `projects_ibfk_2` (`created_by`);

--
-- Indices de la tabla `project_status_logs`
--
ALTER TABLE `project_status_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_status_logs_ibfk_1` (`project_id`),
  ADD KEY `project_status_logs_ibfk_2` (`changed_by_user_id`);

--
-- Indices de la tabla `project_user`
--
ALTER TABLE `project_user`
  ADD PRIMARY KEY (`project_id`,`user_id`),
  ADD KEY `idx_project_user_reverse` (`user_id`,`project_id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_client_role_active` (`client_id`,`role`,`is_active`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clients`
--
ALTER TABLE `clients`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `comments`
--
ALTER TABLE `comments`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `document_versions`
--
ALTER TABLE `document_versions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `notifications_queue`
--
ALTER TABLE `notifications_queue`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `projects`
--
ALTER TABLE `projects`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `project_status_logs`
--
ALTER TABLE `project_status_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`),
  ADD CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`document_version_id`) REFERENCES `document_versions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `comments_ibfk_4` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`current_version_id`) REFERENCES `document_versions` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `document_versions`
--
ALTER TABLE `document_versions`
  ADD CONSTRAINT `document_versions_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `document_versions_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `notifications_queue`
--
ALTER TABLE `notifications_queue`
  ADD CONSTRAINT `notifications_queue_ibfk_1` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `project_status_logs`
--
ALTER TABLE `project_status_logs`
  ADD CONSTRAINT `project_status_logs_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_status_logs_ibfk_2` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `project_user`
--
ALTER TABLE `project_user`
  ADD CONSTRAINT `project_user_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_user_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
