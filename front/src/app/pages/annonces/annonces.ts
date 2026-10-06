import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Annonce, ApiService } from '../../services/api';
import { NavbarComponent } from '../../components/navbar/navbar';
import { apiError, clearSession, currentUser } from '../../core/auth';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, MAX_UPLOAD_SIZE, imageUrl } from '../../core/config';

interface AnnonceForm {
  id_annonce: number | null;
  titre: string;
  prix: number | null;
  description: string;
  etat: string;
  telephone: string;
}

const EMPTY_FORM: AnnonceForm = {
  id_annonce: null,
  titre: '',
  prix: null,
  description: '',
  etat: 'active',
  telephone: ''
};

@Component({
  selector: 'app-annonces',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './annonces.html'
})
export class Annonces implements OnInit {

  // DATA
  annonces: Annonce[] = [];
  search = '';
  userId!: number;
  isAdmin = false;
  savedIds: number[] = [];

  // FORM
  showForm = false;
  mode: 'add' | 'edit' = 'add';
  currentAnnonce: AnnonceForm = { ...EMPTY_FORM };
  selectedFiles: File[] = [];
  formError = '';

  // IMAGE PREVIEW
  showImagePreview = false;
  previewImage: string | null = null;

  // LOADING STATES
  loadingAnnonces = false;
  savingAnnonce = false;
  deletingAnnonceId: number | null = null;
  togglingId: number | null = null;

  readonly imageUrl = imageUrl;
  readonly acceptedTypes = ALLOWED_IMAGE_TYPES.join(',');

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    const user = currentUser();
    if (!user) {
      this.logout();
      return;
    }
    this.userId = user.idUser;
    this.isAdmin = user.role === 'admin';

    // independent requests: a favoris error must not hide the annonces
    this.loadAnnonces();
    this.loadSaved();
  }

  // =====================================================
  // LOAD
  // =====================================================

  /** GET /annonce.php (already sorted newest first by the backend) */
  loadAnnonces(): void {
    this.loadingAnnonces = true;
    this.api.getAnnonces().subscribe({
      next: list => {
        this.annonces = list;
        this.loadingAnnonces = false;
      },
      error: err => {
        console.error('LOAD ANNONCES ERROR', err);
        this.annonces = [];
        this.loadingAnnonces = false;
      }
    });
  }

  /** GET /favoris.php -> [idAnnonce] */
  loadSaved(): void {
    this.api.getFavoris().subscribe({
      next: ids => (this.savedIds = ids),
      error: err => {
        console.error('LOAD FAVORIS ERROR', err);
        this.savedIds = [];
      }
    });
  }

  // =====================================================
  // FAVORIS
  // =====================================================

  isSaved(id: number): boolean {
    return this.savedIds.includes(Number(id));
  }

  /** POST /favoris.php {idProduit} toggles and returns {saved} */
  toggleSave(id: number): void {
    if (this.togglingId !== null) return;
    this.togglingId = id;

    this.api.toggleFavori(id).subscribe({
      next: res => {
        this.togglingId = null;
        if (res.saved) {
          if (!this.isSaved(id)) this.savedIds = [id, ...this.savedIds];
        } else {
          this.savedIds = this.savedIds.filter(x => x !== id);
        }
      },
      error: err => {
        this.togglingId = null;
        alert(apiError(err, 'Erreur favoris'));
      }
    });
  }

  // =====================================================
  // PERMISSIONS (backend: owner or admin can edit/delete)
  // =====================================================

  canManage(a: Annonce): boolean {
    return a.idUser === this.userId || this.isAdmin;
  }

  // =====================================================
  // SEARCH (client side, same rule as backend: titre LIKE %q%)
  // =====================================================

  get filteredAnnonces(): Annonce[] {
    const q = this.search.toLowerCase().trim();
    if (!q) return this.annonces;
    return this.annonces.filter(a => (a.titre || '').toLowerCase().includes(q));
  }

  // =====================================================
  // FORM
  // =====================================================

  openAddForm(): void {
    this.mode = 'add';
    this.currentAnnonce = { ...EMPTY_FORM };
    this.selectedFiles = [];
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(a: Annonce): void {
    this.mode = 'edit';
    this.currentAnnonce = {
      id_annonce: a.id_annonce,
      titre: a.titre || '',
      prix: a.prix,
      description: a.description || '',
      etat: a.etat || 'active',
      telephone: a.telephone || ''
    };
    this.selectedFiles = [];
    this.formError = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedFiles = [];
    this.formError = '';
    this.currentAnnonce = { ...EMPTY_FORM };
  }

  /** Same checks as ImageStorage.validate(): JPG/PNG only, 2 MB max each, 20 MB per request */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.formError = '';

    const wrongType = files.find(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
    if (wrongType) {
      this.formError = `« ${wrongType.name} » : seulement JPG et PNG.`;
      input.value = '';
      this.selectedFiles = [];
      return;
    }

    const tooBig = files.find(f => f.size > MAX_IMAGE_SIZE);
    if (tooBig) {
      this.formError = `« ${tooBig.name} » : image trop grande (max 2MB).`;
      input.value = '';
      this.selectedFiles = [];
      return;
    }

    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > MAX_UPLOAD_SIZE) {
      this.formError = 'Taille totale des images trop grande (max 20MB).';
      input.value = '';
      this.selectedFiles = [];
      return;
    }

    this.selectedFiles = files;
  }

  // =====================================================
  // SAVE (add = multipart, edit = JSON {action:'update'})
  // =====================================================

  saveAnnonce(): void {
    if (this.savingAnnonce) return;
    this.formError = '';

    const titre = this.currentAnnonce.titre.trim();
    const description = this.currentAnnonce.description.trim();
    const telephone = this.currentAnnonce.telephone.trim();
    const prix = this.currentAnnonce.prix;
    const etat = this.currentAnnonce.etat || 'active';

    if (!titre) { this.formError = 'Veuillez saisir le titre.'; return; }
    if (prix === null || prix === undefined || (prix as any) === '' || Number.isNaN(Number(prix)) || Number(prix) < 0) {
      this.formError = 'Veuillez saisir un prix valide.';
      return;
    }
    if (!description) { this.formError = 'Veuillez saisir une description.'; return; }
    if (!telephone) { this.formError = 'Veuillez saisir le numéro de téléphone.'; return; }

    const data = { titre, prix: Number(prix), description, telephone, etat };

    if (this.mode === 'add') {
      if (this.selectedFiles.length === 0) {
        this.formError = 'Veuillez ajouter au moins une image.';
        return;
      }

      this.savingAnnonce = true;
      this.api.addAnnonce(data, this.selectedFiles).subscribe({
        next: () => {
          this.savingAnnonce = false;
          this.closeForm();
          this.loadAnnonces();
        },
        error: err => {
          this.savingAnnonce = false;
          this.formError = apiError(err, 'Erreur lors de l’ajout de l’annonce.');
        }
      });
      return;
    }

    const id = this.currentAnnonce.id_annonce;
    if (!id) {
      this.formError = 'Annonce invalide.';
      return;
    }

    this.savingAnnonce = true;
    this.api.updateAnnonce(id, data).subscribe({
      next: () => {
        this.savingAnnonce = false;
        this.closeForm();
        this.loadAnnonces();
      },
      error: err => {
        this.savingAnnonce = false;
        this.formError = apiError(err, 'Erreur lors de la modification.');
      }
    });
  }

  // =====================================================
  // IMAGE PREVIEW
  // =====================================================

  openImage(src: string): void {
    if (!src) return;
    this.previewImage = src;
    this.showImagePreview = true;
  }

  closeImage(): void {
    this.showImagePreview = false;
    this.previewImage = null;
  }

  // =====================================================
  // DELETE (backend also removes images + favoris rows)
  // =====================================================

  deleteAnnonce(id: number): void {
    if (!confirm('Supprimer cette annonce ?')) return;

    this.deletingAnnonceId = id;
    this.api.deleteAnnonce(id).subscribe({
      next: () => {
        this.deletingAnnonceId = null;
        this.annonces = this.annonces.filter(a => a.id_annonce !== id);
        this.savedIds = this.savedIds.filter(x => x !== id);
      },
      error: err => {
        this.deletingAnnonceId = null;
        alert(apiError(err, 'Erreur lors de la suppression.'));
      }
    });
  }

  logout(): void {
    clearSession();
    this.router.navigate(['/login']);
  }
}
