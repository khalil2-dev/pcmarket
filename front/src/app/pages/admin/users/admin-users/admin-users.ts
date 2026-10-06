import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService, User } from '../../../../services/api';
import { apiError, currentUser } from '../../../../core/auth';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html'
})
export class AdminUsersComponent implements OnInit {

  users: User[] = [];
  filteredUsers: User[] = [];
  searchQuery = '';
  loading = false;
  deletingId: number | null = null;
  myId = currentUser()?.idUser ?? 0;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  /** GET /admin/users.php -> [{idUser, nom, prenom, email, role}] */
  loadUsers(): void {
    this.loading = true;
    this.api.getAdminUsers().subscribe({
      next: res => {
        this.users = res;
        this.filterUsers();
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        if (err?.status === 403) this.router.navigate(['/annonces']);
      }
    });
  }

  filterUsers(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredUsers = this.users;
      return;
    }
    this.filteredUsers = this.users.filter(u =>
      `${u.nom} ${u.prenom}`.toLowerCase().includes(q) ||
      `${u.prenom} ${u.nom}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  /** The backend refuses admin accounts and yourself - the button is hidden for those. */
  canDelete(u: User): boolean {
    return u.role !== 'admin' && u.idUser !== this.myId;
  }

  /** POST /admin/users.php {deleteUser:true, idUser} (also deletes their annonces + favoris) */
  deleteUser(u: User): void {
    if (!confirm(`Supprimer ${u.nom} ${u.prenom} et toutes ses annonces ?`)) return;

    this.deletingId = u.idUser;
    this.api.deleteAdminUser(u.idUser).subscribe({
      next: () => {
        this.deletingId = null;
        this.users = this.users.filter(x => x.idUser !== u.idUser);
        this.filterUsers();
      },
      error: err => {
        this.deletingId = null;
        alert(apiError(err, 'Erreur suppression utilisateur'));
      }
    });
  }

  goDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
