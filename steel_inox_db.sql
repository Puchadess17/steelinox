-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 09-04-2026 a las 09:10:42
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
  `entity_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata_json`)),
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `actor_user_id`, `actor_role`, `action_key`, `entity_type`, `entity_id`, `project_id`, `metadata_json`, `ip`, `user_agent`, `created_at`) VALUES
(1, 18, 'admin', 'auth_login_success', 'user', 18, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-08 16:26:47'),
(2, 18, 'admin', 'auth_logout', 'user', 18, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-08 16:55:28'),
(3, NULL, NULL, 'auth_login_failed', 'system', 0, NULL, '{\"email_attempted\":\"admin@steelinox.com\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 08:42:11'),
(4, NULL, NULL, 'auth_login_failed', 'system', 0, NULL, '{\"email_attempted\":\"admin@steelinox.com\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 08:42:16'),
(5, 1, 'admin', 'auth_login_success', 'user', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 08:42:24'),
(6, 1, 'admin', 'document_view', 'document', 7, 1, '{\"file_name\":\"15150488_3840_2160_25fps.mp4\",\"version_number\":null,\"is_specific_version\":false}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 08:44:50'),
(7, 1, 'admin', 'document_view', 'document', 6, 1, '{\"file_name\":\"OptimizaloAppPresentació.pdf\",\"version_number\":null,\"is_specific_version\":false}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 09:02:17'),
(8, 1, 'admin', 'document_view', 'document', 6, 1, '{\"file_name\":\"download.png\",\"version_number\":null,\"is_specific_version\":true}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 09:02:19'),
(9, 1, 'admin', 'document_view', 'document', 6, 1, '{\"file_name\":\"OptimizaloAppPresentació.pdf\",\"version_number\":null,\"is_specific_version\":true}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 09:02:21'),
(10, 1, 'admin', 'client_create', 'client', 4, NULL, '{\"name\":\"JOAN SL3\",\"reference\":\"CLI-393\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 09:03:19'),
(11, 1, 'admin', 'document_view', 'document', 2, 1, '{\"file_name\":\"joan-rodrigo.png\",\"version_number\":null,\"is_specific_version\":false}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 09:05:27'),
(12, 1, 'admin', 'document_view', 'document', 2, 1, '{\"file_name\":\"joan-rodrigo.png\",\"version_number\":null,\"is_specific_version\":true}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 09:05:31');

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
(1, 'Empresa Demo S.L.', 'CLI-123', 1, 1, '2026-03-27 11:25:19', '2026-04-08 09:14:14', NULL),
(2, 'Empresa Joselu', 'CLI-124\r\n', 1, 1, '2026-04-02 15:34:27', '2026-04-08 10:08:58', NULL),
(3, 'JOAN', 'CLI-39392-323', 1, 1, '2026-04-02 15:35:23', '2026-04-07 08:12:22', NULL),
(4, 'JOAN SL3', 'CLI-393', 1, 1, '2026-04-09 09:03:19', '2026-04-09 09:03:19', NULL);

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

--
-- Volcado de datos para la tabla `comments`
--

INSERT INTO `comments` (`id`, `project_id`, `document_id`, `document_version_id`, `author_user_id`, `body`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 7, 12, 1, 'muy guay', '2026-04-08 11:38:44', NULL, NULL),
(2, 1, 7, 12, 1, 'muy guay', '2026-04-08 11:39:00', NULL, NULL),
(3, 1, 7, 12, 1, 'hola', '2026-04-08 11:41:53', NULL, NULL),
(4, 1, 6, 13, 1, 'a', '2026-04-08 11:42:49', NULL, NULL),
(5, 1, 6, 13, 1, 'a', '2026-04-08 11:42:56', NULL, NULL),
(6, 1, 6, 11, 1, 'v', '2026-04-08 11:43:07', NULL, NULL),
(7, 1, 6, 11, 1, 'aadsds', '2026-04-08 11:43:11', NULL, NULL),
(8, 1, 7, 12, 1, 'pepi', '2026-04-08 11:52:39', NULL, NULL),
(9, 1, 6, 11, 1, 'ad', '2026-04-08 11:54:20', NULL, NULL),
(10, 1, 6, 13, 1, 'a', '2026-04-08 11:54:49', NULL, NULL),
(11, 1, 6, 11, 1, 'v1', '2026-04-08 12:13:04', NULL, NULL),
(12, 1, 6, 13, 1, 'hola', '2026-04-08 12:14:34', NULL, NULL),
(13, 1, 6, 11, 1, 'pepi', '2026-04-08 12:23:25', NULL, NULL),
(14, 1, 6, 13, 1, 'a', '2026-04-08 12:39:24', NULL, NULL),
(15, 1, 6, 13, 1, 'adas', '2026-04-08 12:41:50', NULL, NULL);

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

--
-- Volcado de datos para la tabla `documents`
--

INSERT INTO `documents` (`id`, `project_id`, `type`, `title`, `is_visible_to_client`, `access_mode`, `current_version_id`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'otros', 'Steel_Inox_DDS_Tecnico_Completo', 0, 'download', 1, 1, '2026-04-07 13:23:10', '2026-04-07 13:23:10', NULL),
(2, 1, 'otros', 'joan-rodrigo', 0, 'download', 9, 1, '2026-04-07 13:23:57', '2026-04-08 08:26:02', NULL),
(3, 1, 'otros', 'Steel_Inox_DDS_Tecnico_Completo', 0, 'download', 4, 1, '2026-04-07 16:27:32', '2026-04-07 16:32:28', NULL),
(4, 1, 'otros', 'joan-rodrigo', 0, 'download', 6, 1, '2026-04-07 16:32:42', '2026-04-07 16:32:46', NULL),
(5, 1, 'otros', 'paginesWireframe', 0, 'download', 10, 1, '2026-04-08 09:19:30', '2026-04-08 09:19:30', NULL),
(6, 1, 'propuesta', 'imagen pepi', 1, 'view', 13, 1, '2026-04-08 09:48:08', '2026-04-08 10:27:45', NULL),
(7, 1, 'propuesta', '15150488_3840_2160_25fps', 1, 'view', 12, 1, '2026-04-08 10:13:42', '2026-04-08 10:13:42', NULL);

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

--
-- Volcado de datos para la tabla `document_versions`
--

INSERT INTO `document_versions` (`id`, `document_id`, `version_number`, `file_name`, `storage_path`, `mime_type`, `file_size`, `checksum_sha256`, `is_current`, `uploaded_by`, `uploaded_at`, `archived_at`) VALUES
(1, 1, 1, 'Steel_Inox_DDS_Tecnico_Completo.pdf', 'fd7899e186a27032c7fc5c7580a74524_1775560990', 'application/pdf', 698268, '2aaad42763c28f6eadc5d339b2b892d41fbf30a2c9a566d9f4886585f1ce761b', 1, 1, '2026-04-07 13:23:10', NULL),
(2, 2, 1, 'joan-rodrigo.png', 'c29e08520b8f1bddae0849547c46de64_1775561037', 'image/png', 38852, 'd212086bf5be89c4993403d115a785694fb4d3b7892e4919ae053904b5fcc096', 0, 1, '2026-04-07 13:23:57', NULL),
(3, 3, 1, 'Steel_Inox_DDS_Tecnico_Completo.pdf', 'b8477712ea8710e6048cac051d0c9c2c_1775572052', 'application/pdf', 698268, '2aaad42763c28f6eadc5d339b2b892d41fbf30a2c9a566d9f4886585f1ce761b', 0, 1, '2026-04-07 16:27:32', NULL),
(4, 3, 2, 'Steel_Inox_DDS_Tecnico_Completo.pdf', 'b3d8ab226861b8b1748946e26065b80e_1775572348', 'application/pdf', 698268, '2aaad42763c28f6eadc5d339b2b892d41fbf30a2c9a566d9f4886585f1ce761b', 1, 1, '2026-04-07 16:32:28', NULL),
(5, 4, 1, 'joan-rodrigo.png', '2d733888c26af6f81a6f651e23303eb9_1775572362', 'image/png', 38852, 'd212086bf5be89c4993403d115a785694fb4d3b7892e4919ae053904b5fcc096', 0, 1, '2026-04-07 16:32:42', NULL),
(6, 4, 2, 'joan-rodrigo.png', 'b866309011dd207be50a74255a3fb21c_1775572366', 'image/png', 38852, 'd212086bf5be89c4993403d115a785694fb4d3b7892e4919ae053904b5fcc096', 1, 1, '2026-04-07 16:32:46', NULL),
(7, 2, 2, 'joan-rodrigo.png', '842f3597953df4515d16929c9f642ba2_1775573305', 'image/png', 38852, 'd212086bf5be89c4993403d115a785694fb4d3b7892e4919ae053904b5fcc096', 0, 1, '2026-04-07 16:48:25', NULL),
(8, 2, 3, 'joan-rodrigo.png', '4a37b9ce9d39c12c0dd01f497ab84a23_1775573317', 'image/png', 38852, 'd212086bf5be89c4993403d115a785694fb4d3b7892e4919ae053904b5fcc096', 0, 1, '2026-04-07 16:48:37', NULL),
(9, 2, 4, 'joan-rodrigo.png', '90af9ac91fc5c0a9e1950228f584be77_1775629562', 'image/png', 38852, 'd212086bf5be89c4993403d115a785694fb4d3b7892e4919ae053904b5fcc096', 1, 1, '2026-04-08 08:26:02', NULL),
(10, 5, 1, 'paginesWireframe.pdf', 'e78fb0e0b296feb830d3cc31faecb3b6_1775632770', 'application/pdf', 250743, '679d2da901429686cd537ebd54d3033110c5ba5fad601269e279d36c418aa56f', 1, 1, '2026-04-08 09:19:30', NULL),
(11, 6, 1, 'download.png', '83cf24b900427c5ea40c10c13bea70bd_1775634488', 'image/png', 9250, '6eb2ce7e46b0e30d7883693ebeb1bec55dac807e523ca8f00af6b7352884a65c', 0, 1, '2026-04-08 09:48:08', NULL),
(12, 7, 1, '15150488_3840_2160_25fps.mp4', 'b31944bec4526aee95ebd7c58ab0fda5_1775636022', 'video/mp4', 10324882, 'f457adeb242bfaa54e8a773a1ddb76849d25e26db1196667d0f66d75332ffc04', 1, 1, '2026-04-08 10:13:42', NULL),
(13, 6, 2, 'OptimizaloAppPresentació.pdf', '6f82340ffc8e70f1b8af02a8f220c098_1775636865', 'application/pdf', 853324, 'fc146a7e1853c12221b6413553c1ffe19db64b8cdd10e12426e85560d3c044c7', 1, 1, '2026-04-08 10:27:45', NULL);

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
(1, 1, 'Reforma Oficinas Centrales', 'PRJ-9239-222', 'ejecucion', 15000.00, 'Remodelación técnica de recepción con acabados en acero inoxidable satinado y mejora de iluminación integrada.', '126.5', 'Reforma de Interiores', 1, NULL, NULL, '2026-03-27 11:25:19', '2026-04-08 11:09:33', NULL),
(3, 1, 'Mobiliario Náutico - Yate \"Estrella\"', 'PRJ-2026-003', 'cerrado', 18200.00, 'Fabricación de barandillas y mobiliario exterior en acero inoxidable AISI 316L con acabado pulido espejo para ambientes marinos.', '25.00', 'Náutica', 1, '2026-01-10 09:00:00', '2026-03-25 17:30:00', '2026-04-01 13:17:00', '2026-04-01 13:17:00', NULL),
(4, 1, 'Escalera Helicoidal - Sede BBVA', 'PRJ-2026-004', 'aprobado', 45000.00, 'Diseño y fabricación de escalera monumental helicoidal combinando acero inoxidable satinado y peldaños de vidrio templado.', '12.00', 'Arquitectura Singular', 1, '2026-03-31 11:00:00', NULL, '2026-04-01 13:17:00', '2026-04-01 13:17:00', NULL),
(5, 1, 'Revestimiento Higiénico - Lab. Farma', 'PRJ-2026-005', 'aprobado', 9750.00, 'Forrado de paredes en salas blancas con chapa de acero inoxidable AISI 304. Remates curvos para cumplir normativa sanitaria.', '85.00', 'Sanitario / Farma', 1, NULL, NULL, '2026-04-01 13:17:00', '2026-04-07 15:41:20', NULL),
(6, 1, 'Proyecto prueba 2', 'PRJ-3232-123', 'propuesta', 1.92, 'proyecto de baño', '0.39', 'Cacota', 1, NULL, NULL, '2026-04-07 11:29:03', '2026-04-08 09:14:49', NULL);

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

--
-- Volcado de datos para la tabla `project_status_logs`
--

INSERT INTO `project_status_logs` (`id`, `project_id`, `changed_by_user_id`, `old_status`, `new_status`, `reason`, `created_at`) VALUES
(1, 1, 1, 'propuesta', 'aprobado', 'porqe mne sale uevi', '2026-04-07 12:20:56'),
(2, 5, 1, 'propuesta', 'aprobado', '', '2026-04-07 15:41:20'),
(3, 1, 1, 'aprobado', 'ejecucion', 'ya se puede hacer', '2026-04-07 16:05:50');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project_user`
--

CREATE TABLE `project_user` (
  `project_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `project_user`
--

INSERT INTO `project_user` (`project_id`, `user_id`) VALUES
(1, 9),
(1, 12),
(1, 13),
(6, 9);

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
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `client_id`, `role`, `name`, `email`, `password_hash`, `reset_token`, `reset_token_expires_at`, `is_active`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, NULL, 'admin', 'Administrador Principal', 'admin@steelinox.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 1, '2026-04-09 08:42:24', '2026-03-26 17:18:25', '2026-04-09 08:42:24', NULL),
(2, 1, 'cliente', 'Cliente Empresa \r\n        demo', 'empresa@cliente.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 1, '2026-04-07 16:33:44', '2026-03-30 09:12:24', '2026-04-07 16:33:44', NULL),
(3, 1, 'cliente', 'Pepe peito', 'pepe@cliente.com', '$2y$12$3rZwMdsJvNMeIG4dOPb0Kerqcn67BoIbJmLC6pRSRyFP1DGuX5e4y', NULL, NULL, 0, '2026-04-07 08:51:23', '2026-04-07 08:51:05', '2026-04-07 09:08:18', '2026-04-07 09:08:18'),
(9, NULL, 'comercial', 'comercial1', 'comercial1@comercial.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 1, NULL, '2026-04-07 10:53:03', '2026-04-07 10:53:03', NULL),
(10, NULL, 'comercial', 'comercial2', 'comercial2@comercial.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 1, NULL, '2026-04-07 10:53:03', '2026-04-07 10:53:03', NULL),
(11, NULL, 'comercial', 'comercial3', 'comercial3@comercial.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 1, NULL, '2026-04-07 10:53:03', '2026-04-07 10:53:03', NULL),
(12, NULL, 'comercial', 'comercial4', 'comercial4@comercial.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 1, NULL, '2026-04-07 10:53:03', '2026-04-07 10:53:03', NULL),
(13, NULL, 'comercial', 'comercial5', 'comercial5@comercial.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 1, NULL, '2026-04-07 10:53:03', '2026-04-07 10:53:03', NULL),
(14, 1, 'cliente', 'pepo', 'pepo@cliente.com', '$2y$12$j7lZvv6M.0QmCXiflizI5.fyzprtDFHWgXkHJtKtBk1vgUkeHx69m', '06afed2577e91d0a9b28502f6a1f15d0d36f9f9d772706e5e666a6fc0fe6a3f3', '2026-04-07 16:13:33', 1, '2026-04-07 15:15:18', '2026-04-07 15:12:59', '2026-04-07 15:15:18', NULL),
(18, NULL, 'admin', 'steelinoxprueba', 'steelinoxprueba@outlook.com', '$2y$12$zN2k0FsIWaHBn/CrLIxkzeyVI9X/vG/kqllVn9dG/nufnhdK/.YzC', 'e80cb031e787748ebc680e1bd0d74392b604fd10a89bb029ed061db86e39c097', '2026-04-08 16:50:10', 1, '2026-04-08 16:26:47', '2026-04-08 08:41:47', '2026-04-08 16:26:47', NULL);

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
  ADD KEY `idx_audit_action_key` (`action_key`),
  ADD KEY `idx_audit_ip_action_time` (`ip`,`action_key`,`created_at`);

--
-- Indices de la tabla `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference` (`reference`);

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
  ADD UNIQUE KEY `reference` (`reference`),
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
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `clients`
--
ALTER TABLE `clients`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `comments`
--
ALTER TABLE `comments`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `document_versions`
--
ALTER TABLE `document_versions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `notifications_queue`
--
ALTER TABLE `notifications_queue`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `projects`
--
ALTER TABLE `projects`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `project_status_logs`
--
ALTER TABLE `project_status_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

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
