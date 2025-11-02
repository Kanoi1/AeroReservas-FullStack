import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token de localStorage
  const token = localStorage.getItem('token');

  // Si el token existe, clonar la petición y añadirle el header
  if (token) {
    const clonedReq = req.clone({
      headers: req.headers.set('x-auth-token', token)
    });
    return next(clonedReq);
  }

  // Si no hay token, dejar pasar la petición original
  return next(req);
};