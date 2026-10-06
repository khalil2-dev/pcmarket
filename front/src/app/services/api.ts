import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_URL } from '../core/config';

// =========================================================
// MODELS (exact JSON shapes returned by the Spring backend)
// =========================================================

/** AnnonceService.list() */
export interface Annonce {
  id_annonce: number;
  idUser: number;
  titre: string;
  prix: number | null;
  description: string | null;
  telephone: string | null;
  etat: string;                 // DB column "statut"
  datePublication: string | null;
  image: string[];              // file names, served at /backend/images/<name>
  // only on /admin/annonces.php
  nomUser?: string;
  prenomUser?: string;
  emailUser?: string;
}

export interface AnnonceInput {
  titre: string;
  prix: number;
  description: string;
  telephone: string;
  etat?: string;
}

export interface User {
  idUser: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

export interface Counts { total: number; day: number; week: number; month: number; }
export interface AdminStats { users: Counts; annonces: Counts; }

/** login.php / register.php answer with {status, message?, token?} */
export interface AuthResponse { status: 'success' | 'error'; message?: string; token?: string; }

/** every other write answers with {success, message, ...} */
export interface ApiResponse { success: boolean; message: string; [k: string]: any; }

/**
 * The Authorization header is added by core/auth.interceptor.ts,
 * so none of these methods take a token any more.
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = API_URL;

  constructor(private http: HttpClient) {}

  // =========================================================
  // AUTH  (POST /login.php, /register.php)
  // =========================================================

  login(email: string, motDePasse: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login.php`, { email, motDePasse });
  }

  register(data: { nom: string; prenom: string; email: string; motDePasse: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register.php`, data);
  }

  // =========================================================
  // PROFILE  (GET / PUT / DELETE /profile.php)
  // =========================================================

  getProfile(): Observable<User> {
    return this.http.get<any>(`${this.baseUrl}/profile.php`).pipe(map(normalizeUser));
  }

  updateProfile(data: { nom: string; prenom: string; email: string; motDePasse?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/profile.php`, data);
  }

  deleteProfile(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/profile.php`);
  }

  // =========================================================
  // ANNONCES  (/annonce.php)
  // =========================================================

  /** GET /annonce.php[?search=...] - newest first */
  getAnnonces(search?: string): Observable<Annonce[]> {
    let params = new HttpParams();
    if (search && search.trim()) params = params.set('search', search.trim());
    return this.http
      .get<any[]>(`${this.baseUrl}/annonce.php`, { params })
      .pipe(map(list => (Array.isArray(list) ? list.map(normalizeAnnonce) : [])));
  }

  /** POST multipart: fields + images[] (JPG/PNG, max 2 MB each, at least one) */
  addAnnonce(data: AnnonceInput, images: File[]): Observable<ApiResponse> {
    const fd = new FormData();
    fd.append('titre', data.titre);
    fd.append('prix', String(data.prix));
    fd.append('description', data.description);
    fd.append('telephone', data.telephone);
    fd.append('etat', data.etat || 'active');
    images.forEach(file => fd.append('images[]', file));
    return this.http.post<ApiResponse>(`${this.baseUrl}/annonce.php`, fd);
  }

  /** POST json {action:'update', id_annonce, ...} (owner or admin) */
  updateAnnonce(idAnnonce: number, data: AnnonceInput): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/annonce.php`, {
      action: 'update',
      id_annonce: idAnnonce,
      titre: data.titre,
      prix: data.prix,
      description: data.description,
      telephone: data.telephone,
      etat: data.etat || 'active'
    });
  }

  /** POST json {delete:true, id_annonce} (owner or admin) */
  deleteAnnonce(idAnnonce: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/annonce.php`, {
      delete: true,
      id_annonce: idAnnonce
    });
  }

  // =========================================================
  // FAVORIS  (/favoris.php) - "idProduit" carries the ANNONCE id
  // =========================================================

  /** GET -> [idAnnonce, ...] most recently saved first */
  getFavoris(): Observable<number[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/favoris.php`)
      .pipe(map(ids => (Array.isArray(ids) ? ids.map(Number).filter(n => !Number.isNaN(n)) : [])));
  }

  /** POST {idProduit} -> toggles; response.saved = new state */
  toggleFavori(idAnnonce: number): Observable<ApiResponse & { saved: boolean }> {
    return this.http.post<ApiResponse & { saved: boolean }>(`${this.baseUrl}/favoris.php`, {
      idProduit: idAnnonce
    });
  }

  /** POST {unsave:true, idProduit} -> always removes */
  removeFavori(idAnnonce: number): Observable<ApiResponse & { saved: boolean }> {
    return this.http.post<ApiResponse & { saved: boolean }>(`${this.baseUrl}/favoris.php`, {
      unsave: true,
      idProduit: idAnnonce
    });
  }

  // =========================================================
  // ADMIN  (/admin/*.php - role admin only)
  // =========================================================

  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.baseUrl}/admin/stats.php`);
  }

  getAdminUsers(): Observable<User[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/admin/users.php`)
      .pipe(map(list => (Array.isArray(list) ? list.map(normalizeUser) : [])));
  }

  /** Refused by the backend for admin accounts and for yourself */
  deleteAdminUser(idUser: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/admin/users.php`, { deleteUser: true, idUser });
  }

  /** Includes nomUser / prenomUser / emailUser */
  getAdminAnnonces(): Observable<Annonce[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/admin/annonces.php`)
      .pipe(map(list => (Array.isArray(list) ? list.map(normalizeAnnonce) : [])));
  }

  deleteAdminAnnonce(idAnnonce: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/admin/annonces.php`, { id_annonce: idAnnonce });
  }

  /** Deletes the owner account (and so all of their annonces). Refused for admin owners. */
  deleteAdminAnnonceAndUser(idAnnonce: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/admin/delete-annonce-user.php`, { id_annonce: idAnnonce });
  }
}

// =========================================================
// NORMALIZERS
// =========================================================

function normalizeAnnonce(a: any): Annonce {
  return {
    ...a,
    id_annonce: Number(a.id_annonce),
    idUser: Number(a.idUser),
    titre: a.titre ?? '',
    prix: a.prix !== null && a.prix !== undefined && a.prix !== '' ? Number(a.prix) : null,
    description: a.description ?? '',
    telephone: a.telephone !== null && a.telephone !== undefined ? String(a.telephone) : '',
    etat: a.etat || 'active',
    datePublication: a.datePublication ?? null,
    image: Array.isArray(a.image) ? a.image : []
  };
}

/**
 * /profile.php and /admin/users.php use queryForList, so the key case follows the database:
 * PostgreSQL returns unquoted columns in lower case ("iduser"). Accept both.
 */
function normalizeUser(u: any): User {
  return {
    idUser: Number(u?.idUser ?? u?.iduser),
    nom: u?.nom ?? '',
    prenom: u?.prenom ?? '',
    email: u?.email ?? '',
    role: u?.role ?? 'user'
  };
}
