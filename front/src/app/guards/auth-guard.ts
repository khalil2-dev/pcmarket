import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { clearSession, currentUser } from '../core/auth';

/** Any logged-in user with a valid, non-expired token. */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (currentUser()) return true;
    clearSession();
    return this.router.parseUrl('/login');
  }
}
