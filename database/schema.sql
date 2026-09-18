CREATE DATABASE IF NOT EXISTS pizzas_fray_luis_beltran
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pizzas_fray_luis_beltran;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin') NOT NULL DEFAULT 'admin',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pizzas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  imagen VARCHAR(255) NULL,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(120) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  celular VARCHAR(30) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  comprobante VARCHAR(255) NULL,
  estado ENUM('pendiente', 'confirmado', 'en preparación', 'enviado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  pizza_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_pizza FOREIGN KEY (pizza_id) REFERENCES pizzas(id)
);

INSERT INTO usuarios (usuario, password_hash, rol)
SELECT 'admin', '$2y$10$fY6PnG2M.iG1dGW9ru/w6erUEDWyJl0yAzmiV0maIChRxDRE1fm.e', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'admin');

INSERT INTO pizzas (nombre, descripcion, precio, categoria, imagen)
SELECT 'Fray Luis', 'Mozzarella, jamón, morrones asados y aceitunas.', 8500, 'Especiales', '🍕'
WHERE NOT EXISTS (SELECT 1 FROM pizzas WHERE nombre = 'Fray Luis');

INSERT INTO pizzas (nombre, descripcion, precio, categoria, imagen)
SELECT 'La Beltrán', 'Mozzarella, pepperoni artesanal y albahaca fresca.', 7800, 'Clásicas', '🍕'
WHERE NOT EXISTS (SELECT 1 FROM pizzas WHERE nombre = 'La Beltrán');

INSERT INTO pizzas (nombre, descripcion, precio, categoria, imagen)
SELECT 'Cuatro Quesos', 'Mozzarella, provolone, azul y parmesano.', 8200, 'Especiales', '🍕'
WHERE NOT EXISTS (SELECT 1 FROM pizzas WHERE nombre = 'Cuatro Quesos');

INSERT INTO pizzas (nombre, descripcion, precio, categoria, imagen)
SELECT 'Vegetariana', 'Tomate, cebolla morada, champiñones y rúcula.', 7600, 'Clásicas', '🍕'
WHERE NOT EXISTS (SELECT 1 FROM pizzas WHERE nombre = 'Vegetariana');
