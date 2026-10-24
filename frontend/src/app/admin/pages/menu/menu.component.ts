import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pizza } from '../../../models/pizza.model';
import { PizzeriaService } from '../../../services/pizzeria.service';

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, FormsModule],
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
  guardando = false;

  // Archivo e imagen
  archivoSeleccionado: File | null = null;
  previewImagen: string | null = null;
  nombreArchivo = '';

  // Filtros de búsqueda en la vista admin
  filtroTexto = '';
  filtroCategoria = 'todas';
  filtroDisponibilidad = 'todas';

  pizzaForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(1)]],
    categoria: ['', Validators.required],
    imagen: [''],
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

  get categorias(): string[] {
    const set = new Set<string>();
    this.pizzas.forEach(p => {
      if (p.categoria && p.categoria.trim()) {
        set.add(p.categoria.trim());
      }
    });
    return Array.from(set);
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  get hayFiltrosActivos(): boolean {
    return (
      this.filtroTexto.trim() !== '' ||
      this.filtroCategoria !== 'todas' ||
      this.filtroDisponibilidad !== 'todas'
    );
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroCategoria = 'todas';
    this.filtroDisponibilidad = 'todas';
  }

  get pizzasFiltradas(): Pizza[] {
    return this.pizzas.filter(pizza => {
      // 1. Filtro por texto
      if (this.filtroTexto.trim()) {
        const query = this.normalizarTexto(this.filtroTexto.trim());
        const coincideNombre = this.normalizarTexto(pizza.nombre).includes(query);
        const coincideDesc = this.normalizarTexto(pizza.descripcion).includes(query);
        const coincideCat = this.normalizarTexto(pizza.categoria).includes(query);
        if (!coincideNombre && !coincideDesc && !coincideCat) {
          return false;
        }
      }

      // 2. Filtro por categoría
      if (this.filtroCategoria !== 'todas') {
        if (this.normalizarTexto(pizza.categoria) !== this.normalizarTexto(this.filtroCategoria)) {
          return false;
        }
      }

      // 3. Filtro por disponibilidad
      if (this.filtroDisponibilidad === 'disponibles' && !pizza.disponible) {
        return false;
      }
      if (this.filtroDisponibilidad === 'agotadas' && pizza.disponible) {
        return false;
      }

      return true;
    });
  }

  obtenerImagenUrl(imagen?: string | null): string {
    return this.service.obtenerUrlImagen(imagen);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('pizza portada.png')) {
      img.src = 'pizza portada.png';
    }
  }

  nuevoPizza(): void {
    this.pizzaSeleccionada = null;
    this.editando = true;
    this.archivoSeleccionado = null;
    this.previewImagen = null;
    this.nombreArchivo = '';
    this.limpiarFormulario();
    this.scrollHaciaArriba();
  }

  editarPizza(pizza: Pizza): void {
    this.pizzaSeleccionada = pizza;
    this.editando = true;
    this.archivoSeleccionado = null;
    this.nombreArchivo = '';
    this.previewImagen = this.obtenerImagenUrl(pizza.imagen);

    this.pizzaForm.patchValue({
      nombre: pizza.nombre,
      descripcion: pizza.descripcion,
      precio: pizza.precio,
      categoria: pizza.categoria,
      imagen: pizza.imagen || '',
      disponible: pizza.disponible
    });

    this.scrollHaciaArriba();
  }

  private scrollHaciaArriba(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      document.querySelector('.pizza-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.archivoSeleccionado = file;
      this.nombreArchivo = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        this.previewImagen = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  quitarArchivoSeleccionado(): void {
    this.archivoSeleccionado = null;
    this.nombreArchivo = '';
    if (this.pizzaSeleccionada) {
      this.previewImagen = this.obtenerImagenUrl(this.pizzaSeleccionada.imagen);
    } else {
      this.previewImagen = null;
    }
  }

  cancelarEdicion(): void {
    this.editando = false;
    this.pizzaSeleccionada = null;
    this.archivoSeleccionado = null;
    this.previewImagen = null;
    this.nombreArchivo = '';
  }

  guardarPizza(): void {
    if (this.pizzaForm.invalid || this.guardando) return;

    this.guardando = true;
    const datos = this.pizzaForm.getRawValue();

    const formData = new FormData();
    formData.append('nombre', datos.nombre);
    formData.append('descripcion', datos.descripcion);
    formData.append('precio', datos.precio.toString());
    formData.append('categoria', datos.categoria);
    formData.append('disponible', datos.disponible ? '1' : '0');

    if (this.archivoSeleccionado) {
      formData.append('imagen', this.archivoSeleccionado, this.archivoSeleccionado.name);
    } else if (this.pizzaSeleccionada?.imagen) {
      formData.append('imagen', this.pizzaSeleccionada.imagen);
    }

    const request = this.pizzaSeleccionada
      ? this.service.actualizarPizza(this.pizzaSeleccionada.id, formData)
      : this.service.crearPizza(formData);

    request.subscribe({
      next: () => {
        this.guardando = false;
        this.limpiarFormulario();
        this.cancelarEdicion();
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.error || 'No se pudo guardar la pizza.';
        window.alert(msg);
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

  eliminarPizza(pizza: Pizza): void {
    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente "${pizza.nombre}" del catálogo? Esta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    this.service.eliminarPizza(pizza.id).subscribe({
      next: () => {
        this.pizzas = this.pizzas.filter(p => p.id !== pizza.id);
        if (this.pizzaSeleccionada?.id === pizza.id) {
          this.cancelarEdicion();
        }
      },
      error: (err) => {
        const msg = err?.error?.error || 'No se pudo eliminar el producto.';
        window.alert(msg);
      }
    });
  }

  private limpiarFormulario(): void {
    this.pizzaForm.reset({
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: 'Clásicas',
      imagen: '',
      disponible: true
    });
  }
}
