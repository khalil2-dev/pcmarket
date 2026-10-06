import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Annonce, ApiService } from '../../services/api';
import { NavbarComponent } from '../../components/navbar/navbar';
import { apiError } from '../../core/auth';
import { imageUrl } from '../../core/config';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './saved.html'
})
export class SavedComponent implements OnInit {

  annonces: Annonce[] = [];
  loading = false;
  removingId: number | null = null;

  readonly imageUrl = imageUrl;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSaved();
  }

  /**
   * /favoris.php only returns annonce ids (most recent first),
   * so they are matched against /annonce.php, keeping the favoris order.
   */
  loadSaved(): void {
    this.loading = true;

    forkJoin({ ids: this.api.getFavoris(), all: this.api.getAnnonces() }).subscribe({
      next: ({ ids, all }) => {
        const byId = new Map(all.map(a => [a.id_annonce, a] as const));
        this.annonces = ids.map(id => byId.get(id)).filter((a): a is Annonce => !!a);
        this.loading = false;
      },
      error: err => {
        console.error('LOAD SAVED ERROR', err);
        this.annonces = [];
        this.loading = false;
      }
    });
  }

  /** POST /favoris.php {unsave:true, idProduit} */
  unsave(id: number): void {
    this.removingId = id;
    this.api.removeFavori(id).subscribe({
      next: () => {
        this.removingId = null;
        this.annonces = this.annonces.filter(a => a.id_annonce !== id);
      },
      error: err => {
        this.removingId = null;
        alert(apiError(err, 'Erreur favoris'));
      }
    });
  }

  goToAnnonces(): void {
    this.router.navigate(['/annonces']);
  }
}
