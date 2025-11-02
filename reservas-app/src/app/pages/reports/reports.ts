import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Report } from '../../services/report';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class Reports implements OnInit {
  summary: any = null; // Para guardar los datos del reporte

  constructor(private reportService: Report) {}

  ngOnInit(): void {
    this.reportService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
      },
      error: (err) => {
        console.error("Error al cargar el resumen de reportes", err);
        alert("No se pudieron cargar los reportes.");
      }
    });
  }
}