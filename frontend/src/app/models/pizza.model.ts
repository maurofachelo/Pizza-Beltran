export interface Pizza {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  disponible: boolean;
}

export interface PedidoItem {
  pizzaId: number;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface Pedido {
  id?: number;
  cliente: string;
  direccion: string;
  celular: string;
  items: PedidoItem[];
  total: number;
  comprobante?: string;
  estado: 'pendiente' | 'confirmado' | 'en preparación' | 'enviado' | 'finalizado ok' | 'cancelado';
  creadoEn?: string;
}
