import { Routes } from '@angular/router';

// USER PAGES
import { LoginComponent } from './pages/login/login';
import { Annonces } from './pages/annonces/annonces';
import { SavedComponent } from './pages/saved/saved';
import { ProfileComponent } from './pages/profile/profile';

// ADMIN PAGES
import { AdminDashboardComponent } from './pages/admin/dashboard/admin-dashboard/admin-dashboard';
import { AdminAnnoncesComponent } from './pages/admin/annonces/admin-annonces/admin-annonces';
import { AdminUsersComponent } from './pages/admin/users/admin-users/admin-users';

// GUARDS
import { AuthGuard } from './guards/auth-guard';
import { AdminGuard } from './guards/admin-guard-guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: 'annonces', component: Annonces, canActivate: [AuthGuard] },
  { path: 'saved', component: SavedComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },

  // Admin routes (backend: /admin/** requires role = admin)
  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'annonces', component: AdminAnnoncesComponent }
    ]
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
