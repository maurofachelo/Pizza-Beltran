import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: 'admin/login', loadComponent: () => import('./pages/admin/login.component').then(m => m.LoginComponent) },
	{ path: 'admin', canActivate: [() => import('./guards/admin.guard').then(m => m.adminGuard)], loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) }
];
