import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL } from './config';
import { clearSession, getToken } from './auth';

/**
 * - Adds "Authorization: Bearer <jwt>" to every backend call (AuthInterceptor.java requires it
 *   on everything except /login.php, /register.php and /images/**).
 * - On 401 ("No token" / "Invalid token" = expired) the session is cleared and the user is sent
 *   back to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = getToken();

  const isApi = req.url.startsWith(API_URL);
  const isPublic = /\/(login|register)\.php$/.test(req.url);

  if (isApi && !isPublic && token && !req.headers.has('Authorization')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError(err => {
      if (isApi && !isPublic && err?.status === 401) {
        clearSession();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
