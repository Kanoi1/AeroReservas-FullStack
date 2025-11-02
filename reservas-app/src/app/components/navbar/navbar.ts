import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth'; // Importamos Auth
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit { // Implementamos OnInit
  currentUser$: Observable<any>; // Observable para los datos del usuario

  constructor(private router: Router, private authService: Auth) {
    // Conectamos el observable del componente al del servicio
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // (currentUser$ se manejará automáticamente con el pipe 'async' en el HTML)
  }

  logout(): void {
    this.authService.logout(); // Usamos el método de logout del servicio
    this.router.navigate(['/login']);
  }
}