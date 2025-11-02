import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class File {
  private apiUrl = 'http://localhost:3000/api/files';

  constructor(private http: HttpClient) { }

  // Pide el archivo XML como un 'blob' (datos binarios)
  downloadXml(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/xml`, {
      responseType: 'blob'
    });
  }

  // Sube el archivo XML usando FormData
  uploadXml(file: globalThis.File): Observable<any> {
    const formData = new FormData();
    formData.append('reservationsFile', file, file.name);

    return this.http.post(`${this.apiUrl}/import/xml`, formData);
  }
}