import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pizza, PedidoItem } from '../models/pizza.model';
import { PizzeriaService } from '../services/pizzeria.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink],
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

  pedidoForm = this.fb.nonNullable.group({
    cliente: ['', Validators.required],
    direccion: ['', Validators.required],
    celular: ['', [Validators.required, Validators.pattern(/^[0-9 +()-]{8,}$/)]]
  });

  ngOnInit(): void {
    // El catálogo queda suscripto al servicio para actualizarse cuando llega la respuesta de la API.
    this.service.pizzas$.subscribe(pizzas => (this.pizzas = pizzas));
    this.service.cargarPizzas();
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
