import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'inicio', 
    redirectTo: '', 
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) 
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      { 
        path: 'resumen', 
        loadComponent: () => import('./admin/pages/resumen/resumen.component').then(m => m.ResumenComponent) 
      },
      { 
        path: 'pedidos', 
        loadComponent: () => import('./admin/pages/pedidos/pedidos.component').then(m => m.PedidosComponent) 
      },
      { 
        path: 'menu', 
        loadComponent: () => import('./admin/pages/menu/menu.component').then(m => m.MenuComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '' }
];