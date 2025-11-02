import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Seat } from '../../services/seat';

@Component({
  selector: 'app-seat-map-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seat-map-viewer.html',
  styleUrls: ['./seat-map-viewer.css']
})
export class SeatMapViewer implements OnInit {
  businessSeats: any[] = [];
  economySeats: any[] = [];

  constructor(private seatService: Seat) { }

  ngOnInit(): void {
    this.seatService.getSeats().subscribe({
      next: (seats) => {
        this.businessSeats = seats.filter(s => s.class === 'business');
        this.economySeats = seats.filter(s => s.class === 'economy');
      },
      error: (err) => console.error('Error al cargar los asientos', err)
    });
  }
}