import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    return true; // Si hay token, permite el acceso
  } else {
    router.navigate(['/login']); // Si no hay token, redirige al login
    return false;
  }
};