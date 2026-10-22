import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pizza } from '../../../models/pizza.model';
import { PizzeriaService } from '../../../services/pizzeria.service';

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit {
  private readonly service = inject(PizzeriaService);
  private readonly fb = inject(FormBuilder);

  pizzas: Pizza[] = [];
  pizzaSeleccionada: Pizza | null = null;
  editando = false;
  cargando = true;

  pizzaForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(1)]],
    categoria: ['', Validators.required],
    imagen: ['🍕'],
    disponible: [true]
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.service.getPizzasAdmin().subscribe({
      next: pizzas => {
        this.pizzas = pizzas;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
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
    this.pizzaForm.patchValue({
      nombre: pizza.nombre,
      descripcion: pizza.descripcion,
      precio: pizza.precio,
      categoria: pizza.categoria,
      imagen: pizza.imagen || '🍕',
      disponible: pizza.disponible
    });
  }

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
      },
      error: () => {
        window.alert('No se pudo guardar la pizza.');
      }
    });
  }

  cambiarDisponibilidad(pizza: Pizza): void {
    const nuevaDisponibilidad = !pizza.disponible;

    this.service
      .actualizarPizza(pizza.id, {
        ...pizza,
        disponible: nuevaDisponibilidad
      })
      .subscribe({
        next: () => (pizza.disponible = nuevaDisponibilidad),
        error: () =>
          window.alert('No se pudo actualizar la disponibilidad de la pizza.')
      });
  }

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
}
