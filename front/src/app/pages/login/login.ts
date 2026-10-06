import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ApiService } from '../../services/api';
import { apiError, currentUser, decodeToken, setToken } from '../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  mode: 'login' | 'register' = 'login';

  // login
  email = '';
  motDePasse = '';

  // register
  nom = '';
  prenom = '';
  confirmMotDePasse = '';

  error = '';
  loading = false;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  /** Already logged in with a valid token -> go straight to the right home page */
  ngOnInit(): void {
    const user = currentUser();
    if (user) this.redirect(user.role);
  }

  switchMode(): void {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.error = '';
  }

  /* ======================
     LOGIN
     backend: {status:'success', token} | {status:'error', message}
  ====================== */
  login(): void {
    this.error = '';

    if (!this.email.trim() || !this.motDePasse) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }

    this.loading = true;

    this.api.login(this.email.trim(), this.motDePasse).subscribe({
      next: res => {
        this.loading = false;

        if (res.status !== 'success' || !res.token) {
          this.error = res.message || 'Login failed';
          return;
        }

        const payload = decodeToken(res.token);
        if (!payload) {
          this.error = 'Token invalide';
          return;
        }

        setToken(res.token);
        this.redirect(payload.role);
      },
      error: err => {
        this.loading = false;
        this.error = apiError(err, 'Server error');
      }
    });
  }

  /* ======================
     REGISTER
     backend: {status:'success', message:'Registered'} | {status:'error', message}
  ====================== */
  register(): void {
    this.error = '';

    if (!this.nom.trim() || !this.prenom.trim() || !this.email.trim() || !this.motDePasse) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }

    if (this.motDePasse !== this.confirmMotDePasse) {
      this.error = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.loading = true;

    this.api.register({
      nom: this.nom.trim(),
      prenom: this.prenom.trim(),
      email: this.email.trim(),
      motDePasse: this.motDePasse
    }).subscribe({
      next: res => {
        this.loading = false;
        if (res.status === 'success') {
          alert('Compte créé avec succès ✔️');
          this.motDePasse = '';
          this.confirmMotDePasse = '';
          this.switchMode();
        } else {
          this.error = res.message || 'Register failed';
        }
      },
      error: err => {
        this.loading = false;
        this.error = apiError(err, 'Erreur lors de la création du compte');
      }
    });
  }

  private redirect(role: string): void {
    this.router.navigate([role === 'admin' ? '/admin/dashboard' : '/annonces']);
  }
}
