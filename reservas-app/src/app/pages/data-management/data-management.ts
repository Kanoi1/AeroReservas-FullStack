import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { File } from '../../services/file';
import { Modal } from '../../services/modal';

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-management.html',
  styleUrls: ['./data-management.css']
})
export class DataManagement {
  selectedFile: globalThis.File | null = null;
  uploadResult: any = null;
  isUploading = false;

  constructor(private fileService: File,private modalService: Modal) {}

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] ?? null;
  }

  downloadReservations(): void {
    this.fileService.downloadXml().subscribe(blob => {
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = 'reservations.xml';
      a.click();
      URL.revokeObjectURL(objectUrl);
    });
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.modalService.open('Por favor, selecciona un archivo primero.');
      return;
    }
    this.isUploading = true;
    this.uploadResult = null;

    this.fileService.uploadXml(this.selectedFile).subscribe({
      next: (result) => {
        this.isUploading = false;
        this.uploadResult = result;
      },
      error: (err) => {
        this.isUploading = false;
        this.modalService.open(`Error al subir el archivo: ${err.error.msg || 'Error del servidor'}`);
        console.error(err);
      }
    });
  }
}
