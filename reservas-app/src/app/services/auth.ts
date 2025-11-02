import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = 'http://localhost:3000/api/auth';
  
  // --- INICIO DE LOS CAMBIOS ---
  // Un BehaviorSubject que "recordará" los datos del usuario.
  // Inicia como 'null' (nadie está logueado).
  private currentUserSubject = new BehaviorSubject<any>(null);
  
  // Hacemos pública la versión "observable" (de solo lectura) de los datos.
  public currentUser$ = this.currentUserSubject.asObservable();
  // --- FIN DE LOS CAMBIOS ---

  constructor(private http: HttpClient) { }

  // Obtenemos el valor actual del usuario
  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  // El login ahora hace dos cosas: obtiene el token Y obtiene los datos del usuario
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        // 1. Guardamos el token
        localStorage.setItem('token', response.token);
        // 2. Pedimos los datos del usuario y los guardamos en el BehaviorSubject
        this.fetchAndStoreUser();
      })
    );
  }

  // Nueva función para obtener datos del usuario (usando el endpoint que ya teníamos)
  fetchAndStoreUser(): void {
    this.http.get(`${this.apiUrl}/me`).subscribe(user => {
      this.currentUserSubject.next(user);
    });
  }

  // El logout ahora también limpia el BehaviorSubject
  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null); // Borra al usuario de la "memoria"
  }
  
  register(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, credentials);
  }
}