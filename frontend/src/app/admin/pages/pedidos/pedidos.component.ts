import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Pedido } from '../../../models/pizza.model';
import { PizzeriaService } from '../../../services/pizzeria.service';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss'
})
export class PedidosComponent implements OnInit {
  private readonly service = inject(PizzeriaService);

  pedidos: Pedido[] = [];
  pedidoAbierto: number | null = null;
  filtroEstado: string = 'todos';
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
  }

  get pedidosFiltrados(): Pedido[] {
    if (this.filtroEstado === 'todos') {
      return this.pedidos;
    }
    return this.pedidos.filter(p => p.estado === this.filtroEstado);
  }

  alternarPedido(pedido: Pedido): void {
    const id = pedido.id ?? null;
    this.pedidoAbierto = this.pedidoAbierto === id ? null : id;
  }

  cambiarEstado(pedido: Pedido, estado: Pedido['estado']): void {
    if (!pedido.id) return;

    this.service.actualizarPedido(pedido.id, estado).subscribe(() => {
      pedido.estado = estado;
    });
  }

  reiniciarPedidos(): void {
    const confirmado = window.confirm(
      '¿Confirmás reiniciar los pedidos? Se eliminarán todos los pedidos y sus productos, y esta acción no se puede deshacer.'
    );

    if (!confirmado) return;

    this.service.reiniciarPedidos().subscribe({
      next: () => {
        this.pedidos = [];
        this.pedidoAbierto = null;
      },
      error: () => window.alert('No se pudieron reiniciar los pedidos.')
    });
  }
}
