import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Reservation { // <-- Usando el nombre de clase 'Reservation'
  private apiUrl = 'http://localhost:3000/api/reservations';

  constructor(private http: HttpClient) { }

  // Crea una nueva reserva
  create(reservationData: any): Observable<any> {
    return this.http.post(this.apiUrl, reservationData);
  }

  // Obtiene las reservas del usuario actual
  getMyReservations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-reservations`);
  }

  // <-- NUEVO MÉTODO PARA CANCELAR -->
  cancel(data: { seat_code: string, cui: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/cancel`, data);
  }

  // <-- NUEVO MÉTODO PARA MODIFICAR -->
  modify(data: { current_seat_code: string, cui: string, new_seat_id: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/modify`, data);
  }

  // --- NUEVO MÉTODO PARA LLAMAR AL ENDPOINT DE RESUMEN ---
  sendSummaryEmail(data: { reservations: any[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-summary-email`, data);
  }
}