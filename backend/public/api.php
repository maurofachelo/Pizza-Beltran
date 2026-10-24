<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
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

function guardarImagenProducto(?array $file): ?string
{
    if (!$file || !isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif'
    ];

    $mime = function_exists('mime_content_type') ? mime_content_type($file['tmp_name']) : '';
    if (!isset($allowed[$mime])) {
        $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            response(['error' => 'La imagen debe ser JPG, PNG, WEBP o GIF'], 422);
        }
        $allowedExt = ($ext === 'jpeg') ? 'jpg' : $ext;
    } else {
        $allowedExt = $allowed[$mime];
    }

    if ($file['size'] > 10 * 1024 * 1024) {
        response(['error' => 'La imagen no debe superar los 10 MB'], 422);
    }

    $directory = __DIR__ . '/upload-producto';
    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $allowedExt;
    $target = $directory . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        response(['error' => 'No se pudo guardar la imagen del producto'], 500);
    }

    return 'upload-producto/' . $filename;
}

// Sincronización transparente de comprobantes y productos de carpetas anteriores si existieran
if (is_dir(__DIR__ . '/uploads')) {
    if (!is_dir(__DIR__ . '/upload-pedido')) {
        mkdir(__DIR__ . '/upload-pedido', 0775, true);
    }
    $archivosUploads = glob(__DIR__ . '/uploads/*.*') ?: [];
    foreach ($archivosUploads as $arch) {
        $dest = __DIR__ . '/upload-pedido/' . basename($arch);
        if (!file_exists($dest)) {
            @copy($arch, $dest);
        }
    }
}
if (is_dir(__DIR__ . '/upload/productos')) {
    if (!is_dir(__DIR__ . '/upload-producto')) {
        mkdir(__DIR__ . '/upload-producto', 0775, true);
    }
    $archivosProds = glob(__DIR__ . '/upload/productos/*.*') ?: [];
    foreach ($archivosProds as $arch) {
        $dest = __DIR__ . '/upload-producto/' . basename($arch);
        if (!file_exists($dest)) {
            @copy($arch, $dest);
        }
    }
}

try {
    $db = database();
    $resource = $_GET['recurso'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // El catálogo público filtra las pizzas agotadas; el admin recibe también esas pizzas.
    if ($resource === 'pizzas' && $method === 'GET') {
        $query = ($_GET['admin'] ?? '') === '1'
            ? $db->query('SELECT id, nombre, descripcion, precio, categoria, imagen, CAST(disponible AS UNSIGNED) AS disponible FROM pizzas ORDER BY id DESC')
            : $db->query('SELECT id, nombre, descripcion, precio, categoria, imagen, CAST(disponible AS UNSIGNED) AS disponible FROM pizzas WHERE disponible = 1 ORDER BY id DESC');
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

    // Creación y edición de pizzas por POST (soporta FormData con archivo e inputs directos)
    if ($resource === 'pizzas' && $method === 'POST') {
        $data = !empty($_POST) ? $_POST : requestBody();
        $id = (int) ($_GET['id'] ?? $data['id'] ?? 0);
        $imagenSubida = isset($_FILES['imagen']) ? guardarImagenProducto($_FILES['imagen']) : null;

        if ($id > 0) {
            // Actualización existente
            $actual = $db->prepare('SELECT * FROM pizzas WHERE id = ?');
            $actual->execute([$id]);
            $pizzaExistente = $actual->fetch();
            if (!$pizzaExistente) {
                response(['error' => 'Pizza no encontrada'], 404);
            }

            $nombre = $data['nombre'] ?? $pizzaExistente['nombre'];
            $descripcion = $data['descripcion'] ?? $pizzaExistente['descripcion'];
            $precio = isset($data['precio']) ? (float) $data['precio'] : (float) $pizzaExistente['precio'];
            $categoria = $data['categoria'] ?? $pizzaExistente['categoria'];
            $disponible = isset($data['disponible'])
                ? (int) (filter_var($data['disponible'], FILTER_VALIDATE_BOOLEAN) || $data['disponible'] === 1 || $data['disponible'] === '1' || $data['disponible'] === true)
                : (int) $pizzaExistente['disponible'];
            $imagen = $imagenSubida ?? ($data['imagen'] ?? $pizzaExistente['imagen']);

            $query = $db->prepare('UPDATE pizzas SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, imagen = ?, disponible = ? WHERE id = ?');
            $query->execute([$nombre, $descripcion, $precio, $categoria, $imagen, $disponible, $id]);

            response([
                'id' => $id,
                'nombre' => $nombre,
                'descripcion' => $descripcion,
                'precio' => $precio,
                'categoria' => $categoria,
                'imagen' => $imagen,
                'disponible' => (bool) $disponible
            ]);
        }

        // Creación nueva
        $nombre = $data['nombre'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        $precio = (float) ($data['precio'] ?? 0);
        $categoria = $data['categoria'] ?? 'Clásicas';
        $disponible = isset($data['disponible'])
            ? (int) (filter_var($data['disponible'], FILTER_VALIDATE_BOOLEAN) || $data['disponible'] === 1 || $data['disponible'] === '1' || $data['disponible'] === true)
            : 1;
        $imagen = $imagenSubida ?? ($data['imagen'] ?? 'pizza portada.png');

        if (empty($nombre) || empty($descripcion) || $precio <= 0) {
            response(['error' => 'Nombre, descripción y precio válido son obligatorios'], 422);
        }

        $query = $db->prepare('INSERT INTO pizzas (nombre, descripcion, precio, categoria, imagen, disponible) VALUES (?, ?, ?, ?, ?, ?)');
        $query->execute([$nombre, $descripcion, $precio, $categoria, $imagen, $disponible]);
        $nuevoId = (int) $db->lastInsertId();

        response([
            'id' => $nuevoId,
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'precio' => $precio,
            'categoria' => $categoria,
            'imagen' => $imagen,
            'disponible' => (bool) $disponible
        ], 201);
    }

    if ($resource === 'pizzas' && $method === 'DELETE') {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            response(['error' => 'ID de pizza inválido'], 422);
        }

        $stmtImg = $db->prepare('SELECT imagen FROM pizzas WHERE id = ?');
        $stmtImg->execute([$id]);
        $foto = $stmtImg->fetchColumn();

        $db->beginTransaction();
        $delItems = $db->prepare('DELETE FROM pedido_items WHERE pizza_id = ?');
        $delItems->execute([$id]);

        $query = $db->prepare('DELETE FROM pizzas WHERE id = ?');
        $query->execute([$id]);
        $db->commit();

        if ($foto && (str_starts_with((string)$foto, 'upload-producto/') || str_starts_with((string)$foto, 'upload/productos/'))) {
            $archivoFisico = __DIR__ . '/' . $foto;
            if (file_exists($archivoFisico) && is_file($archivoFisico)) {
                @unlink($archivoFisico);
            }
        }

        response(['ok' => true]);
    }

    if ($resource === 'pizzas' && $method === 'PATCH') {
        $data = requestBody();
        $id = (int) ($_GET['id'] ?? $data['id'] ?? 0);
        if ($id <= 0) {
            response(['error' => 'ID inválido'], 422);
        }

        $actual = $db->prepare('SELECT * FROM pizzas WHERE id = ?');
        $actual->execute([$id]);
        $pizzaExistente = $actual->fetch();
        if (!$pizzaExistente) {
            response(['error' => 'Pizza no encontrada'], 404);
        }

        $nombre = $data['nombre'] ?? $pizzaExistente['nombre'];
        $descripcion = $data['descripcion'] ?? $pizzaExistente['descripcion'];
        $precio = isset($data['precio']) ? (float) $data['precio'] : (float) $pizzaExistente['precio'];
        $categoria = $data['categoria'] ?? $pizzaExistente['categoria'];
        $disponible = isset($data['disponible'])
            ? (int) (filter_var($data['disponible'], FILTER_VALIDATE_BOOLEAN) || $data['disponible'] === 1 || $data['disponible'] === '1' || $data['disponible'] === true)
            : (int) $pizzaExistente['disponible'];
        $imagen = $data['imagen'] ?? $pizzaExistente['imagen'];

        $query = $db->prepare('UPDATE pizzas SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, imagen = ?, disponible = ? WHERE id = ?');
        $query->execute([$nombre, $descripcion, $precio, $categoria, $imagen, $disponible, $id]);

        response([
            'id' => $id,
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'precio' => $precio,
            'categoria' => $categoria,
            'imagen' => $imagen,
            'disponible' => (bool) $disponible
        ]);
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
        // El comprobante se valida por tipo y tamaño antes de guardarlo en upload-pedido.
        if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] === UPLOAD_ERR_OK) {
            $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            $mime = function_exists('mime_content_type') ? mime_content_type($_FILES['comprobante']['tmp_name']) : '';
            if (!isset($allowed[$mime])) {
                $ext = strtolower(pathinfo($_FILES['comprobante']['name'] ?? '', PATHINFO_EXTENSION));
                if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                    response(['error' => 'El comprobante debe ser JPG, PNG o WEBP y pesar menos de 5 MB'], 422);
                }
                $allowedExt = ($ext === 'jpeg') ? 'jpg' : $ext;
            } else {
                $allowedExt = $allowed[$mime];
            }

            if ($_FILES['comprobante']['size'] > 5 * 1024 * 1024) {
                response(['error' => 'El comprobante debe ser JPG, PNG o WEBP y pesar menos de 5 MB'], 422);
            }

            $directory = __DIR__ . '/upload-pedido';
            if (!is_dir($directory)) {
                mkdir($directory, 0775, true);
            }
            $filename = bin2hex(random_bytes(16)) . '.' . $allowedExt;
            move_uploaded_file($_FILES['comprobante']['tmp_name'], $directory . '/' . $filename);
            $comprobante = 'upload-pedido/' . $filename;
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
