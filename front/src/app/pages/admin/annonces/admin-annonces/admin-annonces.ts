import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Annonce, ApiService } from '../../../../services/api';
import { apiError } from '../../../../core/auth';
import { imageUrl } from '../../../../core/config';

@Component({
  selector: 'app-admin-annonces',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-annonces.html'
})
export class AdminAnnoncesComponent implements OnInit {

  annonces: Annonce[] = [];
  filteredAnnonces: Annonce[] = [];
  searchQuery = '';
  loading = false;
  busyId: number | null = null;

  readonly imageUrl = imageUrl;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAnnonces();
  }

  /** GET /admin/annonces.php (with nomUser, prenomUser, emailUser) */
  loadAnnonces(): void {
    this.loading = true;
    this.api.getAdminAnnonces().subscribe({
      next: res => {
        this.annonces = res;
        this.filterAnnonces();
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        if (err?.status === 403) this.router.navigate(['/annonces']);
      }
    });
  }

  filterAnnonces(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredAnnonces = this.annonces;
      return;
    }
    this.filteredAnnonces = this.annonces.filter(a =>
      (a.titre || '').toLowerCase().includes(q) ||
      `${a.nomUser ?? ''} ${a.prenomUser ?? ''}`.toLowerCase().includes(q) ||
      (a.emailUser ?? '').toLowerCase().includes(q)
    );
  }

  /** POST /admin/annonces.php {id_annonce} */
  deleteAnnonce(idAnnonce: number): void {
    if (!confirm('Supprimer cette annonce ?')) return;

    this.busyId = idAnnonce;
    this.api.deleteAdminAnnonce(idAnnonce).subscribe({
      next: () => {
        this.busyId = null;
        this.annonces = this.annonces.filter(a => a.id_annonce !== idAnnonce);
        this.filterAnnonces();
      },
      error: err => {
        this.busyId = null;
        alert(apiError(err, 'Erreur suppression annonce'));
      }
    });
  }

  /** POST /admin/delete-annonce-user.php {id_annonce} - deletes the owner and ALL their annonces */
  deleteAnnonceAndUser(a: Annonce): void {
    const owner = [a.nomUser, a.prenomUser].filter(Boolean).join(' ') || 'le propriétaire';
    if (!confirm(`Supprimer le compte de ${owner} et toutes ses annonces ?\nCette action est irréversible.`)) return;

    this.busyId = a.id_annonce;
    this.api.deleteAdminAnnonceAndUser(a.id_annonce).subscribe({
      next: () => {
        this.busyId = null;
        this.loadAnnonces(); // several annonces may have disappeared
      },
      error: err => {
        this.busyId = null;
        alert(apiError(err, 'Erreur suppression annonce + utilisateur'));
      }
    });
  }

  goDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
