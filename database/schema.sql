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
  estado ENUM('pendiente', 'confirmado', 'en preparación', 'enviado', 'finalizado ok', 'cancelado') NOT NULL DEFAULT 'pendiente',
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

INSERT INTO pizzas (id, nombre, descripcion, precio, categoria, imagen, disponible)
VALUES
  (1, 'Fray Luis', 'Mozzarella, jamón, morrones asados y aceitunas.', 15500, 'Especiales', '🍕', 1),
  (2, 'Obrera', 'Mozzarella, pepperoni artesanal y albahaca fresca.', 11800, 'Clásicas', '🍕', 1),
  (3, 'Cuatro Quesos', 'Mozzarella, provolone, azul y parmesano.', 18200, 'Especiales', '🍕', 1),
  (4, 'Vegetariana', 'Tomate, cebolla morada, champiñones y rúcula.', 12600, 'Clásicas', '🍕', 1),
  (5, 'La Metalurgica', 'Mozzarella, Provolone y morrones asados.', 18500, 'Especiales', '🍕', 1),
  (6, 'La Fundicion', 'Mozzarella, tomate confitado, queso rallado.', 16300, 'Especial', '🍕', 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  precio = VALUES(precio),
  categoria = VALUES(categoria),
  imagen = VALUES(imagen),
  disponible = VALUES(disponible);
