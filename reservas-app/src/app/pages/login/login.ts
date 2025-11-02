import { Component } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth'; // <-- 1. IMPORTAR CON RUTA Y NOMBRE CORRECTOS
import { Modal } from '../../services/modal';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  credentials = {
    email: '',
    password: ''
  };

  // 2. INYECTAR EL SERVICIO CON EL NOMBRE 'Auth'
  constructor(private auth: Auth, private router: Router,private modalService: Modal) { }

  onSubmit(form: NgForm) {
    if (form.invalid) {
      return;
    }

    // 3. USAR EL SERVICIO CON EL NOMBRE 'auth'
    this.auth.login(this.credentials).subscribe({
      next: (response) => {
        console.log('Login exitoso!', response);
        this.modalService.open('¡Inicio de sesión exitoso!');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        const errorMessage = err.error?.msg || 'Credenciales incorrectas.';
        this.modalService.open(`Error: ${errorMessage}`);
      }
    });
  }
}