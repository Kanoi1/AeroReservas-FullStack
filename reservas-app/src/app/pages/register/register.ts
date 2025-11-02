import { Component } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; // <-- Importante para *ngIf
import { Auth } from '../../services/auth';
import { Modal } from '../../services/modal';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CommonModule 
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  credentials = {
    email: '',
    password: ''
  };

  constructor(private auth: Auth, private router: Router,private modalService: Modal) { }

  onSubmit(form: NgForm) {
    if (form.invalid) {
      return;
    }

    // 1. Llama al método de registro del servicio
    this.auth.register(this.credentials).subscribe({
      next: (response) => {
        console.log('Registro exitoso', response);

        // 2. Si el registro fue exitoso, intenta hacer login automáticamente
        this.auth.login(this.credentials).subscribe({
          next: (loginResponse) => {
            console.log('Login automático exitoso', loginResponse);
            localStorage.setItem('token', loginResponse.token);
            this.router.navigate(['/home']);
          },
          error: (loginErr) => {
            console.error('Error en el login automático:', loginErr);
            this.modalService.open('Registro exitoso, pero ocurrió un error al iniciar sesión. Por favor, ve a la página de login.');
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        console.error('Error en el registro:', err);
        // El error desde la API usualmente está en err.error.msg
        this.modalService.open(`Error en el registro: ${err.error.msg || 'Por favor, intenta de nuevo.'}`);
      }
    });
  }
}