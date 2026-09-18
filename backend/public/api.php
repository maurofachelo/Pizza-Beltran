<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Todas las respuestas salen en JSON para que Angular pueda procesarlas de la misma manera.
require_once __DIR__ . '/../config/database.php';

function response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requestBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

try {
    $db = database();
    $resource = $_GET['recurso'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // El catálogo público filtra las pizzas agotadas; el admin recibe también esas pizzas.
    if ($resource === 'pizzas' && $method === 'GET') {
        $query = ($_GET['admin'] ?? '') === '1'
            ? $db->query('SELECT id, nombre, descripcion, precio, categoria, imagen, CAST(disponible AS UNSIGNED) AS disponible FROM pizzas ORDER BY id')
            : $db->query('SELECT id, nombre, descripcion, precio, categoria, imagen, CAST(disponible AS UNSIGNED) AS disponible FROM pizzas WHERE disponible = 1 ORDER BY id');
        response($query->fetchAll());
    }

    if ($resource === 'login' && $method === 'POST') {
        $data = requestBody();
        $query = $db->prepare('SELECT id, usuario, password_hash, rol FROM usuarios WHERE usuario = ? LIMIT 1');
        $query->execute([$data['usuario'] ?? '']);
        $user = $query->fetch();

        // La contraseña nunca se compara en texto plano: se verifica contra el hash guardado.
        if (!$user || !password_verify($data['password'] ?? '', $user['password_hash'])) {
            response(['error' => 'Usuario o contraseña incorrectos'], 401);
        }

        response(['id' => (int) $user['id'], 'usuario' => $user['usuario'], 'rol' => $user['rol']]);
    }

    if ($resource === 'pizzas' && $method === 'POST') {
        $data = requestBody();
        $query = $db->prepare('INSERT INTO pizzas (nombre, descripcion, precio, categoria, imagen, disponible) VALUES (?, ?, ?, ?, ?, ?)');
        $query->execute([$data['nombre'], $data['descripcion'], $data['precio'], $data['categoria'], $data['imagen'] ?? '🍕', $data['disponible'] ?? 1]);
        response(array_merge(['id' => (int) $db->lastInsertId()], $data), 201);
    }

    if ($resource === 'pizzas' && $method === 'DELETE') {
        $query = $db->prepare('UPDATE pizzas SET disponible = 0 WHERE id = ?');
        $query->execute([(int) ($_GET['id'] ?? 0)]);
        response(['ok' => true]);
    }

    if ($resource === 'pizzas' && $method === 'PATCH') {
        $data = requestBody();
        foreach (['nombre', 'descripcion', 'precio', 'categoria'] as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                response(['error' => 'Falta el campo obligatorio: ' . $field], 422);
            }
        }
        $query = $db->prepare('UPDATE pizzas SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, imagen = ?, disponible = ? WHERE id = ?');
        $query->execute([$data['nombre'], $data['descripcion'], $data['precio'], $data['categoria'], $data['imagen'] ?? '🍕', (int) ($data['disponible'] ?? 1), (int) ($_GET['id'] ?? 0)]);
        response(array_merge(['id' => (int) ($_GET['id'] ?? 0)], $data));
    }

    if ($resource === 'pedidos' && $method === 'GET') {
        $query = $db->query('SELECT id, cliente, direccion, celular, total, comprobante, estado, creado_en AS creadoEn FROM pedidos ORDER BY creado_en DESC');
        $pedidos = $query->fetchAll();
        $items = $db->query('SELECT pedido_id AS pedidoId, pizza_id AS pizzaId, nombre, cantidad, precio FROM pedido_items ORDER BY id')->fetchAll();
        foreach ($pedidos as &$pedido) {
            $pedido['items'] = array_values(array_filter($items, fn(array $item): bool => (int) $item['pedidoId'] === (int) $pedido['id']));
        }
        response($pedidos);
    }

    if ($resource === 'pedidos' && $method === 'DELETE' && ($_GET['accion'] ?? '') === 'reiniciar') {
        // Los ítems dependen del pedido, por eso se eliminan antes que la cabecera.
        $db->beginTransaction();
        $db->exec('DELETE FROM pedido_items');
        $db->exec('DELETE FROM pedidos');
        $db->commit();
        response(['ok' => true]);
    }

    if ($resource === 'pedidos' && $method === 'POST') {
        $data = isset($_POST['pedido']) ? json_decode($_POST['pedido'], true) : requestBody();
        if (!is_array($data)) {
            response(['error' => 'Datos del pedido inválidos'], 422);
        }

        $comprobante = null;
        // El comprobante se valida por tipo y tamaño antes de guardarlo en uploads.
        if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] === UPLOAD_ERR_OK) {
            $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            $mime = mime_content_type($_FILES['comprobante']['tmp_name']);
            if (!isset($allowed[$mime]) || $_FILES['comprobante']['size'] > 5 * 1024 * 1024) {
                response(['error' => 'El comprobante debe ser JPG, PNG o WEBP y pesar menos de 5 MB'], 422);
            }
            $directory = __DIR__ . '/uploads';
            if (!is_dir($directory)) {
                mkdir($directory, 0775, true);
            }
            $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
            move_uploaded_file($_FILES['comprobante']['tmp_name'], $directory . '/' . $filename);
            $comprobante = 'uploads/' . $filename;
        }

        $db->beginTransaction();
        $query = $db->prepare('INSERT INTO pedidos (cliente, direccion, celular, total, comprobante, estado) VALUES (?, ?, ?, ?, ?, ?)');
        $query->execute([$data['cliente'], $data['direccion'], $data['celular'], $data['total'], $comprobante, 'pendiente']);
        $pedidoId = (int) $db->lastInsertId();
        $itemQuery = $db->prepare('INSERT INTO pedido_items (pedido_id, pizza_id, nombre, cantidad, precio) VALUES (?, ?, ?, ?, ?)');
        foreach ($data['items'] ?? [] as $item) {
            $itemQuery->execute([$pedidoId, $item['pizzaId'], $item['nombre'], $item['cantidad'], $item['precio']]);
        }
        $db->commit();
        response(['id' => $pedidoId, 'comprobante' => $comprobante, 'estado' => 'pendiente'], 201);
    }

    if ($resource === 'pedidos' && $method === 'PATCH') {
        $data = requestBody();
        $query = $db->prepare('UPDATE pedidos SET estado = ? WHERE id = ?');
        $query->execute([$data['estado'], (int) ($_GET['id'] ?? 0)]);
        response(['ok' => true]);
    }

    response(['error' => 'Recurso o método no encontrado'], 404);
} catch (Throwable $error) {
    response(['error' => 'Error de servidor', 'detalle' => $error->getMessage()], 500);
}
