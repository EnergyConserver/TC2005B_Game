--
-- Table structure for table `cosmeticos`
--

DROP TABLE IF EXISTS `cosmeticos`;
CREATE TABLE `cosmeticos` (
  `id_cosmetico` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_cosmetico` enum('cabeza','cuerpo','pies','accesorio') DEFAULT NULL,
  `precio` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_cosmetico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Table structure for table `cosmeticos_usuario`
--

DROP TABLE IF EXISTS `cosmeticos_usuario`;
CREATE TABLE `cosmeticos_usuario` (
  `id_usuario` int(11) NOT NULL,
  `id_cosmetico` int(11) NOT NULL,
  `activo` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`,`id_cosmetico`),
  KEY `id_cosmetico` (`id_cosmetico`),
  CONSTRAINT `cosmeticos_usuario_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `cosmeticos_usuario_ibfk_2` FOREIGN KEY (`id_cosmetico`) REFERENCES `cosmeticos` (`id_cosmetico`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Table structure for table `mundos`
--

DROP TABLE IF EXISTS `mundos`;
CREATE TABLE `mundos` (
  `id_mundo` int(11) NOT NULL,
  `orden` int(11) DEFAULT NULL,
  `nombre` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id_mundo`),
  UNIQUE KEY `orden` (`orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Table structure for table `niveles`
--

DROP TABLE IF EXISTS `niveles`;
CREATE TABLE `niveles` (
  `id_nivel` int(11) NOT NULL AUTO_INCREMENT,
  `orden_nivel` int(11) DEFAULT NULL,
  `movimientos_max` int(11) DEFAULT NULL,
  `coordenada_inicio` point DEFAULT NULL,
  `coordenada_meta` point DEFAULT NULL,
  `pregunta` varchar(200) DEFAULT NULL,
  `hint` varchar(200) DEFAULT NULL,
  `dificultad` enum('facil','intermedio','dificil') DEFAULT NULL,
  `id_mundo` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_nivel`),
  KEY `fk_niveles_mundos` (`id_mundo`),
  CONSTRAINT `fk_niveles_mundos` FOREIGN KEY (`id_mundo`) REFERENCES `mundos` (`id_mundo`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Table structure for table `progreso_usuario`
--

DROP TABLE IF EXISTS `progreso_usuario`;
CREATE TABLE `progreso_usuario` (
  `id_usuario` int(11) NOT NULL,
  `id_nivel` int(11) NOT NULL,
  `uso_explicacion` tinyint(1) DEFAULT NULL,
  `completado` tinyint(1) DEFAULT NULL,
  `puntaje` int(11) DEFAULT NULL,
  `intentos` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`,`id_nivel`),
  UNIQUE KEY `id_usuario` (`id_usuario`,`id_nivel`),
  KEY `id_nivel` (`id_nivel`),
  CONSTRAINT `progreso_usuario_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `progreso_usuario_ibfk_2` FOREIGN KEY (`id_nivel`) REFERENCES `niveles` (`id_nivel`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) DEFAULT NULL,
  `correo` varchar(100) NOT NULL,
  `contraseña` varchar(255) NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT current_timestamp(),
  `tipo_usuario` enum('alumno','profesor','admin') DEFAULT 'alumno',
  `monedas` int(11) DEFAULT 0,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
