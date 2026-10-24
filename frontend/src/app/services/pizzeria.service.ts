import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Pizza, Pedido } from '../models/pizza.model';

const API_URL = 'http://localhost/Pizza-Beltran/backend/public/api.php';

@Injectable({ providedIn: 'root' })
export class PizzeriaService {
  private readonly http = inject(HttpClient);
  // Conservamos un catálogo inicial para que la pantalla no quede vacía mientras responde PHP.
  private readonly pizzasSubject = new BehaviorSubject<Pizza[]>([
    { id: 1, nombre: 'Fray Luis', descripcion: 'Mozzarella, jamón, morrones asados y aceitunas.', precio: 8500, categoria: 'Especiales', imagen: '🍕', disponible: true },
    { id: 2, nombre: 'La Beltrán', descripcion: 'Mozzarella, pepperoni artesanal y albahaca fresca.', precio: 7800, categoria: 'Clásicas', imagen: '🍕', disponible: true },
    { id: 3, nombre: 'Cuatro Quesos', descripcion: 'Mozzarella, provolone, azul y parmesano.', precio: 8200, categoria: 'Especiales', imagen: '🍕', disponible: true },
    { id: 4, nombre: 'Vegetariana', descripcion: 'Tomate, cebolla morada, champiñones y rúcula.', precio: 7600, categoria: 'Clásicas', imagen: '🍕', disponible: true }
  ]);
  pizzas$ = this.pizzasSubject.asObservable();

  getPizzas(): Observable<Pizza[]> {
    return this.http
      .get<Pizza[]>(`${API_URL}?recurso=pizzas`)
      .pipe(map(pizzas => pizzas.map(pizza => this.normalizarPizza(pizza))));
  }

  getPizzasAdmin(): Observable<Pizza[]> {
    return this.http
      .get<Pizza[]>(`${API_URL}?recurso=pizzas&admin=1`)
      .pipe(map(pizzas => pizzas.map(pizza => this.normalizarPizza(pizza))));
  }

  login(usuario: string, password: string): Observable<{ id: number; usuario: string; rol: string }> {
    return this.http.post<{ id: number; usuario: string; rol: string }>(`${API_URL}?recurso=login`, { usuario, password });
  }

  cargarPizzas(): void {
    this.getPizzas().subscribe({ next: pizzas => this.pizzasSubject.next(pizzas), error: () => undefined });
  }

  // FormData permite enviar el pedido como JSON y el comprobante como archivo en la misma petición.
  crearPedido(pedido: Pedido, comprobante: File): Observable<Pedido> {
    const datos = new FormData();
    datos.append('pedido', JSON.stringify(pedido));
    datos.append('comprobante', comprobante, comprobante.name);
    return this.http.post<Pedido>(`${API_URL}?recurso=pedidos`, datos);
  }

  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API_URL}?recurso=pedidos`);
  }

  actualizarPedido(id: number, estado: Pedido['estado']): Observable<Pedido> {
    return this.http.patch<Pedido>(`${API_URL}?recurso=pedidos&id=${id}`, { estado });
  }

  reiniciarPedidos(): Observable<void> {
    // La limpieza se hace en el servidor para que también desaparezca de MySQL.
    return this.http.delete<void>(`${API_URL}?recurso=pedidos&accion=reiniciar`);
  }

  crearPizza(pizza: Omit<Pizza, 'id'> | FormData): Observable<Pizza> {
    return this.http
      .post<Pizza>(`${API_URL}?recurso=pizzas`, pizza)
      .pipe(map(p => this.normalizarPizza(p)));
  }

  actualizarPizza(id: number, pizza: Partial<Pizza> | FormData): Observable<Pizza> {
    if (pizza instanceof FormData) {
      return this.http
        .post<Pizza>(`${API_URL}?recurso=pizzas&id=${id}`, pizza)
        .pipe(map(p => this.normalizarPizza(p)));
    }
    return this.http
      .patch<Pizza>(`${API_URL}?recurso=pizzas&id=${id}`, pizza)
      .pipe(map(p => this.normalizarPizza(p)));
  }

  eliminarPizza(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${API_URL}?recurso=pizzas&id=${id}`);
  }

  obtenerUrlImagen(imagen?: string | null): string {
    if (!imagen || imagen.trim() === '' || imagen === '🍕' || imagen.length < 4) {
      return 'pizza portada.png';
    }
    if (imagen.startsWith('http://') || imagen.startsWith('https://') || imagen.startsWith('data:') || imagen.startsWith('/')) {
      return imagen;
    }
    const cleanPath = imagen.replace(/^\/+/, '');
    return `http://localhost/Pizza-Beltran/backend/public/${cleanPath}`;
  }

  private normalizarPizza(pizza: Pizza): Pizza {
    return {
      ...pizza,
      id: Number(pizza.id),
      precio: Number(pizza.precio),
      disponible: String(pizza.disponible) === 'true'
        || String(pizza.disponible) === '1'
    };
  }
}
