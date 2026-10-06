import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { clearSession, currentUser } from '../core/auth';

/** role = "admin" in the JWT (the backend also enforces it on /admin/**). */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    const user = currentUser();
    if (!user) {
      clearSession();
      return this.router.parseUrl('/login');
    }
    return user.role === 'admin' ? true : this.router.parseUrl('/annonces');
  }
}
