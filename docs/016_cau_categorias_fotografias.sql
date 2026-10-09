-- Ejecutar en la base de DEV. No elimina ni reinicia inventario.
USE `adamia_dev`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS cau_categorias (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_empresa INT NOT NULL,
  tipo ENUM('activo','uniforme') NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(500) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by INT NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by INT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cau_categoria_empresa_id (id_empresa,id),
  UNIQUE KEY uq_cau_categoria_nombre (id_empresa,tipo,nombre),
  CONSTRAINT fk_cau_categoria_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
  CONSTRAINT ck_cau_categoria_activo CHECK (activo IN (0,1)),
  CONSTRAINT ck_cau_categoria_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permite ejecutar nuevamente el archivo sin duplicar columnas.
SET @cau_sql = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cau_articulos' AND column_name='id_categoria'), 'SELECT 1', 'ALTER TABLE cau_articulos ADD COLUMN id_categoria BIGINT UNSIGNED NULL');
PREPARE cau_stmt FROM @cau_sql;
EXECUTE cau_stmt;
DEALLOCATE PREPARE cau_stmt;

INSERT INTO cau_categorias (id_empresa,tipo,nombre,created_by)
SELECT a.id_empresa,a.tipo,COALESCE(NULLIF(TRIM(a.categoria),''),'General'),MIN(a.created_by)
FROM cau_articulos a
WHERE NOT EXISTS (SELECT 1 FROM cau_categorias c WHERE c.id_empresa=a.id_empresa AND c.tipo=a.tipo AND c.nombre=COALESCE(NULLIF(TRIM(a.categoria),''),'General'))
GROUP BY a.id_empresa,a.tipo,COALESCE(NULLIF(TRIM(a.categoria),''),'General');

UPDATE cau_articulos a JOIN cau_categorias c ON c.id_empresa=a.id_empresa AND c.tipo=a.tipo AND c.nombre=COALESCE(NULLIF(TRIM(a.categoria),''),'General')
SET a.id_categoria=c.id WHERE a.id_categoria IS NULL;

SET @cau_sql = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='cau_articulos' AND constraint_name='fk_cau_art_categoria'), 'SELECT 1', 'ALTER TABLE cau_articulos ADD CONSTRAINT fk_cau_art_categoria FOREIGN KEY (id_empresa,id_categoria) REFERENCES cau_categorias(id_empresa,id)');
PREPARE cau_stmt FROM @cau_sql;
EXECUTE cau_stmt;
DEALLOCATE PREPARE cau_stmt;

-- Una fotografía principal optimizada por artículo. Máximo 512 KiB, WebP.
-- Se sirve mediante API autenticada; no genera enlaces públicos.
CREATE TABLE IF NOT EXISTS cau_articulo_fotos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_empresa INT NOT NULL,
  id_articulo BIGINT UNSIGNED NOT NULL,
  contenido MEDIUMBLOB NULL,
  mime VARCHAR(30) NOT NULL DEFAULT 'image/webp',
  bytes INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by INT NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by INT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cau_foto_articulo (id_empresa,id_articulo),
  CONSTRAINT fk_cau_foto_articulo FOREIGN KEY (id_empresa,id_articulo) REFERENCES cau_articulos(id_empresa,id),
  CONSTRAINT ck_cau_foto_bytes CHECK (bytes <= 524288),
  CONSTRAINT ck_cau_foto_mime CHECK (mime='image/webp')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
