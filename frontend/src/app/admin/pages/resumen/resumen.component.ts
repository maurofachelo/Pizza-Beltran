import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pedido, Pizza } from '../../../models/pizza.model';
import { PizzeriaService } from '../../../services/pizzeria.service';

export interface PizzaRankingItem {
  nombre: string;
  cantidad: number;
  recaudado: number;
  porcentaje: number;
  posicion: number;
  icono?: string;
}

@Component({
  selector: 'app-admin-resumen',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './resumen.component.html',
  styleUrl: './resumen.component.scss'
})
export class ResumenComponent implements OnInit {
  private readonly service = inject(PizzeriaService);

  pedidos: Pedido[] = [];
  pizzas: Pizza[] = [];
  cargando = true;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.service.getPedidos().subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });

    this.service.getPizzasAdmin().subscribe({
      next: pizzas => (this.pizzas = pizzas),
      error: () => undefined
    });
  }

  // Métricas existentes
  get pedidosRecibidos(): number {
    return this.pedidos.length;
  }

  get pendientes(): number {
    return this.pedidos.filter(pedido => pedido.estado === 'pendiente').length;
  }

  get pedidosConfirmadosList(): Pedido[] {
    return this.pedidos.filter(pedido =>
      ['confirmado', 'en preparación', 'enviado', 'finalizado ok'].includes(pedido.estado)
    );
  }

  get ventasConfirmadas(): number {
    return this.pedidosConfirmadosList.reduce(
      (total, pedido) => total + Number(pedido.total),
      0
    );
  }

  // Sección de Ganancias generadas
  // Ventas netas confirmadas o completadas
  get gananciasTotales(): number {
    return this.ventasConfirmadas;
  }

  get ticketPromedio(): number {
    const confirmados = this.pedidosConfirmadosList.length;
    return confirmados > 0 ? this.gananciasTotales / confirmados : 0;
  }

  get pedidosCancelados(): number {
    return this.pedidos.filter(p => p.estado === 'cancelado').length;
  }

  get tasaEfectividad(): number {
    if (this.pedidos.length === 0) return 0;
    return Math.round((this.pedidosConfirmadosList.length / this.pedidos.length) * 100);
  }

  // Sección de Pizzas más vendidas (mini ranking)
  get pizzasMasVendidas(): PizzaRankingItem[] {
    const mapa = new Map<string, { cantidad: number; recaudado: number; icono?: string }>();

    // Tomamos pedidos válidos (no cancelados)
    const pedidosValidos = this.pedidos.filter(p => p.estado !== 'cancelado');

    for (const pedido of pedidosValidos) {
      for (const item of pedido.items || []) {
        const existente = mapa.get(item.nombre) || { cantidad: 0, recaudado: 0 };
        existente.cantidad += Number(item.cantidad || 0);
        existente.recaudado += Number(item.cantidad || 0) * Number(item.precio || 0);

        if (!existente.icono) {
          const pizzaMatch = this.pizzas.find(p => p.nombre.toLowerCase() === item.nombre.toLowerCase());
          existente.icono = pizzaMatch?.imagen || '🍕';
        }

        mapa.set(item.nombre, existente);
      }
    }

    const items = Array.from(mapa.entries()).map(([nombre, datos]) => ({
      nombre,
      cantidad: datos.cantidad,
      recaudado: datos.recaudado,
      icono: datos.icono || '🍕',
      porcentaje: 0,
      posicion: 0
    }));

    // Ordenar de mayor a menor cantidad vendida
    items.sort((a, b) => b.cantidad - a.cantidad);

    const totalUnidades = items.reduce((sum, item) => sum + item.cantidad, 0);

    return items.map((item, index) => ({
      ...item,
      posicion: index + 1,
      porcentaje: totalUnidades > 0 ? Math.round((item.cantidad / totalUnidades) * 100) : 0
    }));
  }

  get totalUnidadesVendidas(): number {
    return this.pizzasMasVendidas.reduce((sum, item) => sum + item.cantidad, 0);
  }
}
