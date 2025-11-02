import { Component } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { Navbar } from './components/navbar/navbar'; // Usando el nombre de clase 'Navbar'
import { ModalComponent } from './components/modal/modal';
import { Auth } from './services/auth';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, CommonModule,ModalComponent], // Añadir CommonModule para *ngIf
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  shouldShowNavbar = false;

  constructor(private router: Router, private authService: Auth) { // <-- 2. INYECTAR Auth
    this.checkTokenOnLoad(); // <-- 3. LLAMAR A LA NUEVA FUNCIÓN
    
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.shouldShowNavbar = !(event.url === '/login' || event.url === '/register');
    });
  }

  // 4. AÑADIR ESTA FUNCIÓN
  checkTokenOnLoad(): void {
    const token = localStorage.getItem('token');
    if (token) {
      // Si hay un token, pide los datos del usuario y cárgalos en el servicio
      this.authService.fetchAndStoreUser();
    }
  }
}