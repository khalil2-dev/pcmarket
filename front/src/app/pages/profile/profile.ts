import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../../services/api';
import { apiError, clearSession, isAdmin } from '../../core/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {

  user = {
    nom: '',
    prenom: '',
    email: '',
    motDePasse: ''
  };

  loading = false;
  saving = false;
  error = '';

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  /** GET /profile.php -> {idUser, nom, prenom, email, role} */
  loadProfile(): void {
    this.loading = true;
    this.api.getProfile().subscribe({
      next: u => {
        this.user.nom = u.nom;
        this.user.prenom = u.prenom;
        this.user.email = u.email;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        // 401 is already handled by the interceptor (redirect to /login)
        if (err?.status !== 401) this.error = apiError(err, 'Impossible de charger le profil');
      }
    });
  }

  /** PUT /profile.php {nom, prenom, email, motDePasse?} - empty password = unchanged */
  updateProfile(): void {
    this.error = '';

    const nom = this.user.nom.trim();
    const prenom = this.user.prenom.trim();
    const email = this.user.email.trim();

    if (!nom || !prenom || !email) {
      this.error = 'Nom, prénom et email sont obligatoires';
      return;
    }

    const body: { nom: string; prenom: string; email: string; motDePasse?: string } = { nom, prenom, email };
    if (this.user.motDePasse) body.motDePasse = this.user.motDePasse;

    this.saving = true;
    this.api.updateProfile(body).subscribe({
      next: res => {
        this.saving = false;
        this.user.motDePasse = '';
        alert(res?.message || 'Profil modifié avec succès');
      },
      error: err => {
        this.saving = false;
        // 409 -> "Email already exists"
        this.error = apiError(err, 'Erreur lors de la modification');
      }
    });
  }

  /** DELETE /profile.php (backend removes the user's annonces, images and favoris) */
  deleteAccount(): void {
    if (!confirm('Voulez-vous vraiment supprimer votre compte ?')) return;

    this.api.deleteProfile().subscribe({
      next: () => {
        alert('Compte supprimé');
        this.logout();
      },
      error: err => alert(apiError(err, 'Erreur suppression compte'))
    });
  }

  logout(): void {
    clearSession();
    this.router.navigate(['/login']);
  }

  goHome(): void {
    this.router.navigate([isAdmin() ? '/admin/dashboard' : '/annonces']);
  }
}
