# Pizzas Fray Luis Beltrán

Aplicación web para gestionar el menú y los pedidos de una pizzería. El frontend está desarrollado con Angular 19 y Bootstrap. La API REST está desarrollada en PHP y utiliza MySQL/MariaDB.

## Estructura

- `frontend/`: aplicación Angular.
- `backend/`: API REST PHP.
- `database/schema.sql`: base de datos, tablas y usuario administrador inicial.

## Requisitos

- Node.js 20 o superior.
- XAMPP con Apache, PHP y MySQL/MariaDB.

## Configuración local

1. Importar `database/schema.sql` desde phpMyAdmin.
2. Copiar `backend/` dentro de `C:\xampp\htdocs\pizzas-fray-luis-beltran\`.
3. Verificar que la API responda en:

   `http://localhost/pizzas-fray-luis-beltran/backend/public/api.php?recurso=pizzas`

4. Instalar y ejecutar el frontend:

```bash
cd frontend
npm install
npm start
```

5. Abrir `http://localhost:4200`.

## Acceso administrador

- Usuario: `admin`
- Contraseña: `admin`

El panel está disponible en `http://localhost:4200/admin/login`.

## Funcionalidades

- Catálogo público de pizzas disponibles.
- Carrito y creación de pedidos sin registro.
- Dirección, celular y comprobante de transferencia.
- Login administrativo protegido por guard.
- Consulta y actualización de estados de pedidos.
- Detalle de productos para preparación.
- Alta y edición de pizzas.
- Habilitación y marcado de pizzas agotadas.
- Reinicio de pedidos con confirmación.

## Compilación

```bash
cd frontend
npm run build
```

La carpeta `dist/` se genera localmente y está excluida del repositorio.
