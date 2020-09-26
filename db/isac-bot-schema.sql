-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 26, 2020 at 05:22 AM
-- Server version: 10.2.33-MariaDB-log
-- PHP Version: 7.2.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `isac-bot`
--

-- --------------------------------------------------------

--
-- Table structure for table `commands`
--

CREATE TABLE `commands` (
  `id` int(11) NOT NULL,
  `command` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `server_id` varchar(255) NOT NULL,
  `hash` varchar(255) NOT NULL DEFAULT '',
  `result` longtext NOT NULL DEFAULT '',
  `date_added` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `daily_exp_snapshots`
--

CREATE TABLE `daily_exp_snapshots` (
  `id` int(11) NOT NULL,
  `uplay_id` varchar(255) NOT NULL,
  `clan_exp` bigint(20) NOT NULL,
  `pve_exp` bigint(20) NOT NULL,
  `dz_exp` bigint(20) NOT NULL,
  `date_added` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `platforms`
--

CREATE TABLE `platforms` (
  `id` int(11) NOT NULL,
  `server_id` varchar(255) NOT NULL,
  `platform` enum('uplay','psn','xbl') NOT NULL DEFAULT 'uplay',
  `date_added` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `servers`
--

CREATE TABLE `servers` (
  `id` int(11) NOT NULL,
  `server_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `prefix` char(1) NOT NULL DEFAULT '',
  `clan_role_id` varchar(255) NOT NULL DEFAULT '',
  `auto_delete` tinyint(1) NOT NULL DEFAULT 0,
  `date_added` datetime NOT NULL,
  `last_active` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `server_agents`
--

CREATE TABLE `server_agents` (
  `id` int(11) NOT NULL,
  `server_id` varchar(255) NOT NULL,
  `agent_name` varchar(255) NOT NULL,
  `agent_id` varchar(255) NOT NULL COMMENT 'uplay_id',
  `type` enum('add','remove') NOT NULL,
  `added_by_id` varchar(255) NOT NULL,
  `added_by_username` varchar(255) NOT NULL,
  `date_added` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `uplay_id` varchar(255) NOT NULL,
  `agent_name` varchar(255) NOT NULL DEFAULT '',
  `platform` enum('uplay','psn','xbl') NOT NULL DEFAULT 'uplay',
  `date_added` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `commands`
--
ALTER TABLE `commands`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hash` (`hash`);

--
-- Indexes for table `daily_exp_snapshots`
--
ALTER TABLE `daily_exp_snapshots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uplay_id` (`uplay_id`);

--
-- Indexes for table `platforms`
--
ALTER TABLE `platforms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `server_id` (`server_id`);

--
-- Indexes for table `servers`
--
ALTER TABLE `servers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `server_id` (`server_id`);

--
-- Indexes for table `server_agents`
--
ALTER TABLE `server_agents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `server_agent` (`server_id`,`agent_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `commands`
--
ALTER TABLE `commands`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_exp_snapshots`
--
ALTER TABLE `daily_exp_snapshots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `platforms`
--
ALTER TABLE `platforms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `servers`
--
ALTER TABLE `servers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `server_agents`
--
ALTER TABLE `server_agents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
