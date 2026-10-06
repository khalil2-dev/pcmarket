import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './navbar.html'
})
export class NavbarComponent {

  @Input() search: string = '';
  @Output() searchChange = new EventEmitter<string>();
  @Output() addAnnonce = new EventEmitter<void>();

  constructor(private router: Router) {}

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }
  onAddAnnonce(): void {
    this.addAnnonce.emit();
  }


  goToAnnonces(): void {
    this.router.navigate(['/annonces']);
  }


  goToSaved(): void {
    this.router.navigate(['/saved']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
