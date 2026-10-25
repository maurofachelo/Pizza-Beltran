import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pizza, PedidoItem } from '../models/pizza.model';
import { PizzeriaService } from '../services/pizzeria.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PizzeriaService);

  pizzas: Pizza[] = [];
  carrito: PedidoItem[] = [];
  enviado = false;
  comprobante: File | null = null;
  nombreComprobante = '';

  // Filtros y orden
  busqueda = '';
  categoriaSeleccionada = 'todas';
  ordenSeleccionado = 'populares';

  get categorias(): string[] {
    const set = new Set<string>();
    this.pizzas.forEach(p => {
      if (p.categoria && p.categoria.trim()) {
        set.add(p.categoria.trim());
      }
    });
    return Array.from(set);
  }

  readonly opcionesOrden = [
    { id: 'populares', label: 'Más vendidos / Populares' },
    { id: 'precio-asc', label: 'Precio: Menor a Mayor' },
    { id: 'precio-desc', label: 'Precio: Mayor a Menor' },
    { id: 'ofertas', label: 'Ofertas y Combos' }
  ];

  pedidoForm = this.fb.nonNullable.group({
    cliente: ['', Validators.required],
    direccion: ['', Validators.required],
    celular: ['', [Validators.required, Validators.pattern(/^[0-9 +()-]{8,}$/)]]
  });

  obtenerImagenUrl(imagen?: string | null): string {
    return this.service.obtenerUrlImagen(imagen);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('pizza portada.png')) {
      img.src = 'pizza portada.png';
    }
  }

  ngOnInit(): void {
    // El catálogo queda suscripto al servicio para actualizarse cuando llega la respuesta de la API.
    this.service.pizzas$.subscribe(pizzas => (this.pizzas = pizzas));
    this.service.cargarPizzas();
  }

  get hayFiltrosActivos(): boolean {
    return (
      this.busqueda.trim() !== '' ||
      this.categoriaSeleccionada !== 'todas' ||
      this.ordenSeleccionado !== 'populares'
    );
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.categoriaSeleccionada = 'todas';
    this.ordenSeleccionado = 'populares';
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  get pizzasFiltradas(): Pizza[] {
    const filtradas = this.pizzas.filter(pizza => {
      // 1. Filtro por búsqueda (nombre, ingredientes en descripción, o categoría)
      if (this.busqueda.trim()) {
        const termino = this.normalizarTexto(this.busqueda.trim());
        const coincideNombre = this.normalizarTexto(pizza.nombre).includes(termino);
        const coincideDesc = this.normalizarTexto(pizza.descripcion).includes(termino);
        const coincideCat = this.normalizarTexto(pizza.categoria).includes(termino);
        if (!coincideNombre && !coincideDesc && !coincideCat) {
          return false;
        }
      }

      // 2. Filtro por categoría seleccionada
      if (this.categoriaSeleccionada !== 'todas') {
        if (this.normalizarTexto(pizza.categoria) !== this.normalizarTexto(this.categoriaSeleccionada)) {
          return false;
        }
      }

      return true;
    });

    // 3. Ordenamiento dinámico
    return this.aplicarOrden(filtradas, this.ordenSeleccionado);
  }

  private aplicarOrden(items: Pizza[], criterio: string): Pizza[] {
    const lista = [...items];
    switch (criterio) {
      case 'precio-asc':
        return lista.sort((a, b) => a.precio - b.precio);
      case 'precio-desc':
        return lista.sort((a, b) => b.precio - a.precio);
      case 'ofertas':
        return lista.sort((a, b) => {
          const regexOferta = /promo|combo|oferta|2x1|descuento/i;
          const esOfertaA = regexOferta.test(`${a.nombre} ${a.descripcion} ${a.categoria}`) ? 1 : 0;
          const esOfertaB = regexOferta.test(`${b.nombre} ${b.descripcion} ${b.categoria}`) ? 1 : 0;
          if (esOfertaA !== esOfertaB) {
            return esOfertaB - esOfertaA;
          }
          return a.precio - b.precio;
        });
      case 'populares':
      default:
        return lista.sort((a, b) => a.id - b.id);
    }
  }

  // Si la pizza ya está en el carrito, solo aumentamos la cantidad.
  agregar(pizza: Pizza): void {
    const item = this.carrito.find(value => value.pizzaId === pizza.id);
    if (item) {
      item.cantidad++;
    } else {
      this.carrito = [
        ...this.carrito,
        {
          pizzaId: pizza.id,
          nombre: pizza.nombre,
          cantidad: 1,
          precio: pizza.precio
        }
      ];
    }
  }

  quitar(item: PedidoItem): void {
    item.cantidad--;
    if (item.cantidad === 0) {
      this.carrito = this.carrito.filter(value => value !== item);
    }
  }

  get total(): number {
    return this.carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
  }

  seleccionarComprobante(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.comprobante = input.files?.[0] ?? null;
    this.nombreComprobante = this.comprobante?.name ?? '';
  }

  // El backend recibe los datos y la imagen juntos mediante FormData.
  enviarPedido(): void {
    if (this.pedidoForm.invalid || !this.carrito.length || !this.comprobante) {
      this.pedidoForm.markAllAsTouched();
      return;
    }

    this.service
      .crearPedido(
        {
          ...this.pedidoForm.getRawValue(),
          items: this.carrito,
          total: this.total,
          estado: 'pendiente'
        },
        this.comprobante
      )
      .subscribe({
        next: () => {
          this.enviado = true;
          this.carrito = [];
          this.comprobante = null;
          this.nombreComprobante = '';
          this.pedidoForm.reset();
        },
        error: () => (this.enviado = true)
      });
  }
}
