import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reservation } from '../../services/reservation';
import { Router } from '@angular/router';
import { ModificationState } from '../../services/modification-state';
import { Modal } from '../../services/modal';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-reservations.html',
  styleUrls: ['./my-reservations.css']
})
export class MyReservations implements OnInit {
  reservations: any[] = [];

  constructor(private reservationService: Reservation,private router: Router,private modificationState: ModificationState, private modalService: Modal) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.reservationService.getMyReservations().subscribe({
      next: (data) => this.reservations = data,
      error: (err) => console.error('Error al obtener las reservas', err)
    });
  }

  cancelReservation(reservation: any): void {
    const confirmed = confirm(`¿Estás seguro de que deseas cancelar la reserva para el asiento ${reservation.seat_code}?`);
    if (confirmed) {
      const data = { seat_code: reservation.seat_code, cui: reservation.cui };
      this.reservationService.cancel(data).subscribe({
        next: () => {
          this.modalService.open('Reserva cancelada con éxito.');
          this.loadReservations(); // Recargar la lista
        },
        error: (err) => this.modalService.open(`Error: ${err.error.msg || 'No se pudo cancelar.'}`)
      });
    }
  }

  modifyReservation(reservation: any): void {
    // Guardamos la reserva en nuestro servicio "mensajero"
    this.modificationState.startModification(reservation);
    // Navegamos a la página principal
    this.router.navigate(['/home']);
  }
}