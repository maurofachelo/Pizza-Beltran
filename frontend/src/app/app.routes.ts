import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { ResumenComponent } from './admin/pages/resumen/resumen.component';
import { PedidosComponent } from './admin/pages/pedidos/pedidos.component';
import { MenuComponent } from './admin/pages/menu/menu.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'inicio', redirectTo: '', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      { path: 'resumen', component: ResumenComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'menu', component: MenuComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
