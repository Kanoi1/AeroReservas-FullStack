import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Seat } from '../../services/seat';
import { Reservation } from '../../services/reservation';
import { ModificationState } from '../../services/modification-state';
import { Modal } from '../../services/modal';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, OnDestroy {
  allSeats: any[] = [];
  businessSeats: any[] = [];
  economySeats: any[] = [];
  selectedSeat: any = null;
  passengerData = { full_name: '', cui: '', has_baggage: false };
  selectedClass: 'business' | 'economy' | null = null;

  // --- NUEVAS PROPIEDADES PARA EL FLUJO MÚLTIPLE ---
  step: 'quantity' | 'mode' | 'class' | 'selection' | 'details' = 'quantity';
  seatsToReserve = 1;
  reservationsMade = 0;
  isRandomSelection = false;
  randomlySelectedSeats: any[] = [];
  completedReservations: any[] = [];
  

  isModificationMode = false;
  reservationToModify: any = null;
  private modificationSubscription!: Subscription;

  constructor(
    private seatService: Seat,
    private reservationService: Reservation,
    private modificationState: ModificationState,
    private router: Router,
    private modalService: Modal
  ) {}

  ngOnInit(): void {
    this.loadSeats();
    this.modificationSubscription = this.modificationState.reservation$.subscribe(res => {
      this.isModificationMode = !!res;
      this.reservationToModify = res;
      if (this.isModificationMode) {
        this.step = 'selection'; // Si estamos modificando, saltamos directo a la selección
        this.selectedClass = res.class;
      } else {
        this.resetFlow(); // Asegurarnos de que el flujo normal empiece desde cero
      }
    });
  }

  ngOnDestroy(): void {
    if (this.modificationSubscription) this.modificationSubscription.unsubscribe();
  }

  loadSeats(): void {
    this.seatService.getSeats().subscribe({
      next: (seats) => {
        this.allSeats = seats;
        this.businessSeats = seats.filter(s => s.class === 'business');
        this.economySeats = seats.filter(s => s.class === 'economy');
      },
      error: (err) => console.error('Error al cargar los asientos', err)
    });
  }

  // --- FUNCIONES DEL NUEVO FLUJO ---
  setReservationQuantity(form: NgForm): void {
    if (form.valid && this.seatsToReserve > 0) {
      this.step = 'mode';
    }
  }

  setSelectionMode(isRandom: boolean): void {
    this.isRandomSelection = isRandom;
    this.selectedClass = null;
    if (isRandom) {
    this.step = 'selection'; // Aleatorio pide clase después
    } else {
    this.step = 'class'; // Manual pide clase ANTES de mostrar asientos
  }
  }

  selectManualClass(seatClass: 'business' | 'economy'): void {
  this.selectedClass = seatClass;
  this.selectedSeat = null; // Reiniciar selección si cambia de clase
  this.step = 'selection'; // Ahora sí, mostrar asientos de esa clase
  }

  selectRandomSeats(seatClass: 'business' | 'economy'): void {
    this.selectedClass = seatClass;
    const availableSeats = this.allSeats.filter(s => s.class === seatClass && !s.is_occupied);
    if (availableSeats.length < this.seatsToReserve) {
      this.modalService.open(`No hay suficientes asientos disponibles en la clase ${seatClass}. Por favor, elige otra clase o reduce la cantidad de asientos.`);
      return;
    }
    this.randomlySelectedSeats = availableSeats.sort(() => 0.5 - Math.random()).slice(0, this.seatsToReserve);
    this.step = 'details';
  }
  
  // --- LÓGICA DE SELECCIÓN Y RESERVA ACTUALIZADA ---
  selectSeat(seat: any): void {
    if (seat.is_occupied || this.randomlySelectedSeats.includes(seat)) return;

    if (this.isModificationMode) {
      this.confirmNewSeat(seat);
    } else if (this.step === 'selection' && !this.isRandomSelection) {
      this.selectedSeat = seat;
      
    }
  }

  proceedToDetails(): void {
      if (this.selectedSeat) {
          this.step = 'details';
      } else {
         this.modalService.open('Por favor, selecciona un asiento primero.');
      }
  }

  onConfirmReservation(form: NgForm): void {
    const seatToReserve = this.isRandomSelection ? this.randomlySelectedSeats[this.reservationsMade] : this.selectedSeat;
    if (form.invalid || !seatToReserve) return;

    const reservationData = {
      seat_id: seatToReserve.seat_id,
      is_random_selection: this.isRandomSelection,
      ...this.passengerData
    };

    this.reservationService.create(reservationData).subscribe({
      next: (response) => {
        this.reservationsMade++;
        this.completedReservations.push({ 
            ...response.reservation, 
            price: seatToReserve.price, 
            full_name: this.passengerData.full_name
        });

        this.modalService.open(`Reserva ${this.reservationsMade} de ${this.seatsToReserve} completada.`);
        this.loadSeats();
        this.resetPassengerForm();

        if (this.reservationsMade >= this.seatsToReserve) {
          this.modalService.open('¡Todas las reservas han sido completadas!');
          if (this.completedReservations.length > 0) {
            this.reservationService.sendSummaryEmail({ reservations: this.completedReservations }).subscribe();
          }
          this.resetFlow();
          this.router.navigate(['/my-reservations']);
        } else {
          this.step = this.isRandomSelection ? 'details' : 'selection';
        }
      },
      error: (err) => {
        console.error('Error al crear la reserva:', err);
        // Extrae el mensaje de error específico de la respuesta de la API
        const errorMessage = err.error?.errors?.[0]?.msg || err.error?.msg || 'No se pudo completar la reserva.';
        this.modalService.open(`Error: ${errorMessage}`);
}
    });
  }

  skipCurrentReservation(): void {
      this.reservationsMade++;
      this.modalService.open(`Paso ${this.reservationsMade} de ${this.seatsToReserve} omitido.`);
      
      if (this.reservationsMade >= this.seatsToReserve) {
          this.modalService.open('Proceso de reserva finalizado.');
          if (this.completedReservations.length > 0) {
              this.reservationService.sendSummaryEmail({ reservations: this.completedReservations }).subscribe();
          }
          this.resetFlow();
          this.router.navigate(['/my-reservations']);
      } else {
          this.resetPassengerForm();
          this.step = this.isRandomSelection ? 'details' : 'selection';
      }
  }

  resetPassengerForm(): void {
    this.selectedSeat = null;
    this.passengerData = { full_name: '', cui: '', has_baggage: false };
  }
  
  resetFlow(): void {
      this.step = 'quantity';
      this.reservationsMade = 0;
      this.seatsToReserve = 1;
      this.isRandomSelection = false;
      this.randomlySelectedSeats = [];
      this.completedReservations = [];
      this.selectedClass = null; // Reiniciar clase
      this.resetPassengerForm();
  }
  
  // --- MÉTODOS DE MODIFICACIÓN (SIN CAMBIOS) ---
  confirmNewSeat(newSeat: any): void {
    if (newSeat.seat_id === this.reservationToModify.seat_id) {
      this.modalService.open("Por favor, selecciona un asiento diferente al actual.");
      return;
    }
    if (newSeat.class !== this.reservationToModify.class) {
      this.modalService.open("Por favor, selecciona un asiento de la misma clase.");
      return;
    }

    // 1. Define el mensaje
    const message = `¿Confirmas cambiar el asiento ${this.reservationToModify.seat_code} por ${newSeat.seat_code}? Se aplicará un recargo del 10%.`;

    // 2. Llama al modal de confirmación y suscríbete a la respuesta
    this.modalService.confirm(message).subscribe((userConfirmed) => {
      
      // 3. Mueve la lógica original dentro de la suscripción
      if (userConfirmed) {
        const data = {
          current_seat_code: this.reservationToModify.seat_code,
          cui: this.reservationToModify.cui,
          new_seat_id: newSeat.seat_id
        };
        
        this.reservationService.modify(data).subscribe({
          next: (res) => {
            this.modalService.open(`${res.msg} | Nuevo precio: $${res.new_price}`);
            this.modificationState.clearModification();
            this.router.navigate(['/my-reservations']);
          },
          error: (err) => this.modalService.open(`Error: ${err.error.msg || 'No se pudo modificar.'}`)
        });
      }
      // Si userConfirmed es 'false' (hizo clic en Cancelar), no se hace nada.
    });
  }

  cancelModificationMode(): void {
    this.modificationState.clearModification();
    this.router.navigate(['/my-reservations']);
  }

  // Helper para el HTML
  isSeatRandomlySelected(seat: any): boolean {
    return this.randomlySelectedSeats.some(s => s.seat_id === seat.seat_id);
  }
}