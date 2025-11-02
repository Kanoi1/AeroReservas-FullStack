import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Modal } from '../../services/modal';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrls: ['./modal.css']
})
export class ModalComponent {
  isVisible$: Observable<boolean>;
  message$: Observable<string>;
  isConfirm$: Observable<boolean>; // <-- NUEVA PROPIEDAD

  constructor(private modalService: Modal) {
    this.isVisible$ = this.modalService.isVisible$;
    this.message$ = this.modalService.message$;
    this.isConfirm$ = this.modalService.isConfirm$; // <-- CONECTAR AL SERVICIO
  }

  // --- MÉTODOS ACTUALIZADOS ---
  close(): void {
    this.modalService.close(); // Llama a 'close' (que envía 'false')
  }
  
  confirm(): void {
    this.modalService.confirmAction(); // Llama a 'confirmAction' (que envía 'true')
  }
}