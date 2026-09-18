import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Evita que alguien entre directamente al panel sin haber pasado por el login.
  return sessionStorage.getItem('admin-auth') === 'true' ? true : router.createUrlTree(['/admin/login']);
};
