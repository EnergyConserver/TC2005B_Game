/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.6-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: tecduck_test
-- ------------------------------------------------------
-- Server version	11.8.6-MariaDB-0+deb13u1 from Debian

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `cosmeticos`
--

DROP TABLE IF EXISTS `cosmeticos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cosmeticos` (
  `id_cosmetico` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_cosmetico` enum('cabeza','cuerpo','pies','accesorio') DEFAULT NULL,
  `precio` int(11) DEFAULT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_cosmetico`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cosmeticos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cosmeticos` WRITE;
/*!40000 ALTER TABLE `cosmeticos` DISABLE KEYS */;
INSERT INTO `cosmeticos` VALUES
(1,'pies',50,'Botas Arcoiris','botas_arcoiris.png'),
(2,'cabeza',30,'Lentes Estrella','lentes_estrella.png'),
(3,'pies',60,'Zapatillas Rosa','zapatillas_rosa.png'),
(4,'cabeza',20,'Lentes Corazon','lentes_corazon.png');
/*!40000 ALTER TABLE `cosmeticos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `cosmeticos_usuario`
--

DROP TABLE IF EXISTS `cosmeticos_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cosmeticos_usuario` (
  `id_usuario` int(11) NOT NULL,
  `id_cosmetico` int(11) NOT NULL,
  `activo` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`,`id_cosmetico`),
  KEY `id_cosmetico` (`id_cosmetico`),
  CONSTRAINT `cosmeticos_usuario_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `cosmeticos_usuario_ibfk_2` FOREIGN KEY (`id_cosmetico`) REFERENCES `cosmeticos` (`id_cosmetico`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cosmeticos_usuario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cosmeticos_usuario` WRITE;
/*!40000 ALTER TABLE `cosmeticos_usuario` DISABLE KEYS */;
INSERT INTO `cosmeticos_usuario` VALUES
(6,1,1),
(6,2,0),
(6,3,0),
(6,4,1),
(10,1,1),
(10,2,1),
(11,1,1),
(11,2,1),
(13,1,1),
(13,2,0),
(13,3,0),
(13,4,1);
/*!40000 ALTER TABLE `cosmeticos_usuario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `grupos`
--

DROP TABLE IF EXISTS `grupos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupos` (
  `id_grupo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `codigo_acceso` varchar(10) NOT NULL,
  `id_profesor` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_grupo`),
  UNIQUE KEY `codigo_acceso` (`codigo_acceso`),
  KEY `id_profesor` (`id_profesor`),
  CONSTRAINT `grupos_ibfk_1` FOREIGN KEY (`id_profesor`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `grupos` WRITE;
/*!40000 ALTER TABLE `grupos` DISABLE KEYS */;
INSERT INTO `grupos` VALUES
(3,'Prueba1','N4ASKZ',5);
/*!40000 ALTER TABLE `grupos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `grupos_usuario`
--

DROP TABLE IF EXISTS `grupos_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupos_usuario` (
  `id_usuario` int(11) NOT NULL,
  `id_grupo` int(11) NOT NULL,
  PRIMARY KEY (`id_usuario`,`id_grupo`),
  KEY `id_grupo` (`id_grupo`),
  CONSTRAINT `grupos_usuario_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `grupos_usuario_ibfk_2` FOREIGN KEY (`id_grupo`) REFERENCES `grupos` (`id_grupo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupos_usuario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `grupos_usuario` WRITE;
/*!40000 ALTER TABLE `grupos_usuario` DISABLE KEYS */;
INSERT INTO `grupos_usuario` VALUES
(10,3),
(11,3);
/*!40000 ALTER TABLE `grupos_usuario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `mundos`
--

DROP TABLE IF EXISTS `mundos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mundos` (
  `id_mundo` int(11) NOT NULL,
  `orden` int(11) DEFAULT NULL,
  `nombre` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id_mundo`),
  UNIQUE KEY `orden` (`orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mundos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `mundos` WRITE;
/*!40000 ALTER TABLE `mundos` DISABLE KEYS */;
INSERT INTO `mundos` VALUES
(1,1,'Mundo 1'),
(2,2,'Mundo 2');
/*!40000 ALTER TABLE `mundos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `niveles`
--

DROP TABLE IF EXISTS `niveles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `tipo` enum('punto','vectores') DEFAULT 'punto',
  `tema` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_nivel`),
  KEY `fk_niveles_mundos` (`id_mundo`),
  CONSTRAINT `fk_niveles_mundos` FOREIGN KEY (`id_mundo`) REFERENCES `mundos` (`id_mundo`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `niveles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `niveles` WRITE;
/*!40000 ALTER TABLE `niveles` DISABLE KEYS */;
INSERT INTO `niveles` VALUES
(4,1,5,0x00000000010100000000000000000000000000000000000000,0x000000000101000000000000000000084000000000000000C0,'Llega al punto (3,-2)','Esta en el cuadrante IV','facil',1,'punto','plano cartesiano'),
(5,2,5,0x00000000010100000000000000000000000000000000000000,0x00000000010100000000000000000014400000000000001040,'Llega al punto (5,4)','Esta en el cuadrante I','facil',1,'punto','plano cartesiano'),
(6,3,5,0x00000000010100000000000000000000000000000000000000,0x00000000010100000000000000000010C00000000000000040,'Llega al punto (-4,2)','Esta en el cuadrante II','facil',1,'punto','plano cartesiano'),
(7,4,5,0x00000000010100000000000000000000000000000000000000,0x00000000010100000000000000000008400000000000000000,'Llega al punto (3,0)','Esta en un vertice','facil',1,'punto','plano cartesiano'),
(12,1,NULL,0x00000000010100000000000000000000000000000000000000,0x00000000010100000000000000000008400000000000000040,'Suma los vectores paso a paso','Sigue cada vector desde tu posición actual','facil',2,'vectores','suma'),
(13,2,NULL,0x000000000101000000000000000000F03F000000000000F03F,0x00000000010100000000000000000000400000000000000840,'Cuidado con los signos','Un vector puede restar','facil',2,'vectores','suma'),
(14,3,NULL,0x00000000010100000000000000000000C0000000000000F03F,0x00000000010100000000000000000000400000000000000040,'Sigue la secuencia completa','No pierdas tu posición actual','intermedio',2,'vectores','suma'),
(15,4,NULL,0x0000000001010000000000000000000000000000000000F0BF,0x00000000010100000000000000000008400000000000000040,'Controla bien cada movimiento','Avanza vector por vector, no te adelantes','dificil',2,'vectores','suma');
/*!40000 ALTER TABLE `niveles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `progreso_usuario`
--

DROP TABLE IF EXISTS `progreso_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `progreso_usuario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `progreso_usuario` WRITE;
/*!40000 ALTER TABLE `progreso_usuario` DISABLE KEYS */;
INSERT INTO `progreso_usuario` VALUES
(10,4,0,1,150,1),
(10,5,0,1,150,1),
(10,6,0,1,150,1),
(10,7,0,1,150,1),
(10,12,0,1,80,3),
(10,13,0,1,90,2),
(10,14,0,1,80,3),
(10,15,0,1,70,4),
(12,4,0,1,150,1),
(12,5,0,1,150,1),
(12,6,0,1,150,1),
(12,7,0,1,150,1),
(12,12,0,1,80,3),
(12,13,0,1,90,2),
(12,14,0,1,80,3),
(12,15,0,1,70,4),
(13,4,0,1,150,1),
(13,5,0,1,150,1),
(13,6,0,1,150,1),
(13,7,0,1,150,1),
(14,4,0,1,150,1),
(14,5,0,1,150,1),
(14,6,0,1,150,1),
(14,7,0,1,150,1);
/*!40000 ALTER TABLE `progreso_usuario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES
(4,NULL,'admin@gmail.com','$2b$10$A6fEnr4NwR1geXrsbAtDuO98PtQeDtQyw7WBQjMYFr2Oay.qwUWyy','2026-04-25 19:12:34','admin',0),
(5,NULL,'profesor@gmail.com','$2b$10$LIKm9q.fioHH/QuMvQqukOamE5mvQtk7/VZBne2hOJL01Lp2rJqKq','2026-04-25 19:31:25','profesor',0),
(6,NULL,'alumno@gmail.com','$2b$10$7c8nFEgYsG8sPwsSfG58buarEjsqR6d6/Tb2SJTBerNTecJlU6b3S','2026-04-25 19:36:05','alumno',2180);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `vectores_nivel`
--

DROP TABLE IF EXISTS `vectores_nivel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vectores_nivel` (
  `id_vector` int(11) NOT NULL AUTO_INCREMENT,
  `id_nivel` int(11) DEFAULT NULL,
  `orden` int(11) DEFAULT NULL,
  `dx` int(11) DEFAULT NULL,
  `dy` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_vector`),
  KEY `id_nivel` (`id_nivel`),
  CONSTRAINT `vectores_nivel_ibfk_1` FOREIGN KEY (`id_nivel`) REFERENCES `niveles` (`id_nivel`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vectores_nivel`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `vectores_nivel` WRITE;
/*!40000 ALTER TABLE `vectores_nivel` DISABLE KEYS */;
INSERT INTO `vectores_nivel` VALUES
(1,12,1,2,1),
(2,12,2,1,1),
(3,13,1,2,1),
(4,13,2,-1,1),
(5,14,1,2,0),
(6,14,2,1,2),
(7,14,3,1,-1),
(8,15,1,1,2),
(9,15,2,2,-1),
(10,15,3,1,2),
(11,15,4,-1,0);
/*!40000 ALTER TABLE `vectores_nivel` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-05-05 15:43:56
