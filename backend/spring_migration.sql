-- Run ONCE in phpMyAdmin (xampp2) on database marketplace_pc.
-- XAMPP uses MariaDB, so "IF NOT EXISTS" makes this script safe to run twice.
USE marketplace_pc;
SET FOREIGN_KEY_CHECKS = 0;

-- announcements: the fields the Angular form sends
ALTER TABLE `annonce`
  ADD COLUMN IF NOT EXISTS `titre`       varchar(150)  NOT NULL DEFAULT '' AFTER `idUser`,
  ADD COLUMN IF NOT EXISTS `prix`        decimal(10,2) DEFAULT NULL        AFTER `titre`,
  ADD COLUMN IF NOT EXISTS `description` text          DEFAULT NULL        AFTER `prix`,
  ADD COLUMN IF NOT EXISTS `telephone`   varchar(30)   DEFAULT NULL        AFTER `description`,
  MODIFY `idProduit`   int(11) NULL,
  MODIFY `idCategorie` int(11) NULL;

-- users: needed for the admin dashboard (users per day / week / month)
ALTER TABLE `utilisateur`
  ADD COLUMN IF NOT EXISTS `dateInscription` timestamp NOT NULL DEFAULT current_timestamp();

-- images of an announcement (already in marketplace_pc.sql; created here if missing)
CREATE TABLE IF NOT EXISTS `image` (
  `idImage` int(11) NOT NULL AUTO_INCREMENT,
  `idAnnonce` int(11) NOT NULL,
  `chemin` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`idImage`),
  KEY `fk_image_annonce` (`idAnnonce`),
  CONSTRAINT `fk_image_annonce` FOREIGN KEY (`idAnnonce`) REFERENCES `annonce` (`idAnnonce`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- favourites: the old `favoris` table points to `produit`; the front saves ANNONCE ids
CREATE TABLE IF NOT EXISTS `favori_annonce` (
  `idUser` int(11) NOT NULL,
  `idAnnonce` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`idUser`, `idAnnonce`),
  KEY `fk_favann_annonce` (`idAnnonce`),
  CONSTRAINT `fk_favann_user`    FOREIGN KEY (`idUser`)    REFERENCES `utilisateur` (`idUser`)  ON DELETE CASCADE,
  CONSTRAINT `fk_favann_annonce` FOREIGN KEY (`idAnnonce`) REFERENCES `annonce` (`idAnnonce`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
