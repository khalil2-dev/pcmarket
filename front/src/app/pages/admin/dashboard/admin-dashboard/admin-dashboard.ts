import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AdminStats, ApiService } from '../../../../services/api';
import { clearSession } from '../../../../core/auth';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {

  loading = false;
  error = false;

  /** GET /admin/stats.php -> {users:{total,day,week,month}, annonces:{...}} (last 1 / 7 / 30 days) */
  stats: AdminStats = {
    users: { total: 0, day: 0, week: 0, month: 0 },
    annonces: { total: 0, day: 0, week: 0, month: 0 }
  };

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;

    this.api.getAdminStats().subscribe({
      next: res => {
        this.stats = res;
        this.loading = false;
      },
      error: err => {
        console.error('Error loading stats:', err);
        this.error = true;
        this.loading = false;
        // 401 handled by the interceptor; 403 = not admin
        if (err?.status === 403) this.router.navigate(['/annonces']);
      }
    });
  }

  goUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  goAnnonces(): void {
    this.router.navigate(['/admin/annonces']);
  }

  logout(): void {
    clearSession();
    this.router.navigate(['/login']);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
