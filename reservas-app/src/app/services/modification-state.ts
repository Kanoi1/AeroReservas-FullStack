import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModificationState { // Usando el nombre de clase 'ModificationState'
  // Un BehaviorSubject es como una caja que guarda el valor actual y notifica a quien esté interesado.
  private reservationBeingModified = new BehaviorSubject<any>(null);

  // Creamos una versión "pública" de solo lectura para que los componentes se suscriban.
  public reservation$ = this.reservationBeingModified.asObservable();

  // Cuando el usuario hace clic en "Modificar", llamamos a esta función.
  startModification(reservation: any) {
    this.reservationBeingModified.next(reservation);
  }

  // Cuando la modificación termina (o se cancela), llamamos a esta para limpiar la caja.
  clearModification() {
    this.reservationBeingModified.next(null);
  }
}