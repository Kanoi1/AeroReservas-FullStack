import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, take, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Modal {
  private isVisible = new BehaviorSubject<boolean>(false);
  private message = new BehaviorSubject<string>('');
  
  // --- NUEVAS PROPIEDADES ---
  // isConfirm indica al componente modal si debe mostrar 1 o 2 botones
  private isConfirm = new BehaviorSubject<boolean>(false);
  // action$ es un "canal" para enviar la respuesta (true/false) de vuelta
  private action$ = new Subject<boolean>();

  // --- OBSERVABLES PÚBLICOS ---
  public isVisible$ = this.isVisible.asObservable();
  public message$ = this.message.asObservable();
  public isConfirm$ = this.isConfirm.asObservable();

  constructor() { }

  /**
   * Abre un modal simple (como un 'alert').
   */
  open(message: string): void {
    this.message.next(message);
    this.isConfirm.next(false); // No es un modal de confirmación
    this.isVisible.next(true);
  }

  /**
   * Abre un modal de confirmación (como un 'confirm').
   * Devuelve un observable que espera la respuesta del usuario.
   */
  confirm(message: string): Observable<boolean> {
    this.message.next(message);
    this.isConfirm.next(true); // SÍ es un modal de confirmación
    this.isVisible.next(true);
    
    // Devuelve un observable que se completará después de 1 respuesta
    return this.action$.pipe(take(1));
  }

  /**
   * Función interna llamada por los botones del modal.
   */
  private completeAction(result: boolean): void {
    this.isVisible.next(false);
    this.action$.next(result); // Envía la respuesta (true o false)
  }

  // --- FUNCIONES PÚBLICAS PARA EL COMPONENTE MODAL ---
  
  close(): void {
    this.completeAction(false); // Cerrar siempre se considera 'false' o 'cancelar'
  }
  
  confirmAction(): void {
    this.completeAction(true); // El botón "Confirmar" envía 'true'
  }
}