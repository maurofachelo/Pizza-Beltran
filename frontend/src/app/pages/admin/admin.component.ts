import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Pizza, Pedido } from '../../models/pizza.model';
import { PizzeriaService } from '../../services/pizzeria.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  private readonly service = inject(PizzeriaService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  pedidos: Pedido[] = [];
  pizzas: Pizza[] = [];
  pedidoAbierto: number | null = null;
  pizzaSeleccionada: Pizza | null = null;
  editando = false;

  pizzaForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(1)]],
    categoria: ['', Validators.required],
    imagen: ['🍕'],
    disponible: [true]
  });

  get pendientes(): number {
    return this.pedidos.filter(pedido => pedido.estado === 'pendiente').length;
  }

  get recaudado(): number {
    return this.pedidos
      .filter(pedido => pedido.estado === 'confirmado')
      .reduce((total, pedido) => total + Number(pedido.total), 0);
  }

  constructor() {
    this.cargarDatos();
  }

  // Pedidos y menú se cargan por separado porque cada sección se administra de forma independiente.
  cargarDatos(): void {
    this.service.getPedidos().subscribe({
      next: pedidos => this.pedidos = pedidos,
      error: () => undefined
    });

    this.service.getPizzasAdmin().subscribe({
      next: pizzas => this.pizzas = pizzas,
      error: () => undefined
    });
  }

  // Guarda cuál pedido está abierto para mostrar los productos que debe preparar la cocina.
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

  // La confirmación evita borrar pedidos por un clic accidental al comenzar el día.
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

  cambiarDisponibilidad(pizza: Pizza): void {
    const nuevaDisponibilidad = !pizza.disponible;

    this.service.actualizarPizza(pizza.id, {
      ...pizza,
      disponible: nuevaDisponibilidad
    }).subscribe({
      next: () => pizza.disponible = nuevaDisponibilidad,
      error: () => window.alert('No se pudo actualizar la disponibilidad de la pizza.')
    });
  }

  nuevoPizza(): void {
    this.pizzaSeleccionada = null;
    this.editando = true;
    this.limpiarFormulario();
  }

  editarPizza(pizza: Pizza): void {
    this.pizzaSeleccionada = pizza;
    this.editando = true;
    this.pizzaForm.patchValue(pizza);
  }

  // El mismo formulario sirve para crear y editar; la pizza seleccionada define la operación.
  cancelarEdicion(): void {
    this.editando = false;
    this.pizzaSeleccionada = null;
  }

  guardarPizza(): void {
    if (this.pizzaForm.invalid) return;

    const datos = this.pizzaForm.getRawValue();
    const request = this.pizzaSeleccionada
      ? this.service.actualizarPizza(this.pizzaSeleccionada.id, datos)
      : this.service.crearPizza(datos);

    request.subscribe({
      next: () => {
        this.limpiarFormulario();
        this.cancelarEdicion();
        this.cargarDatos();
      }
    });
  }

  // Deja el formulario listo para cargar otro producto y evita reutilizar datos anteriores.
  private limpiarFormulario(): void {
    this.pizzaForm.reset({
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: 'Clásicas',
      imagen: '🍕',
      disponible: true
    });
  }

  logout(): void {
    sessionStorage.removeItem('admin-auth');
    sessionStorage.removeItem('admin-user');
    this.router.navigate(['/admin/login']);
  }
}
