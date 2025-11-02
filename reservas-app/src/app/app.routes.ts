import { Routes } from '@angular/router';
import { Login} from './pages/login/login';
import { Register} from './pages/register/register';
import { Home } from './pages/home/home'; // <-- 1. IMPORTAR Home
import { authGuard } from './guards/auth-guard'; // <-- 2. IMPORTAR authGuard
import { MyReservations } from './pages/my-reservations/my-reservations';
import { Reports } from './pages/reports/reports';
import { DataManagement } from './pages/data-management/data-management';
import { SeatMapViewer } from './pages/seat-map-viewer/seat-map-viewer';


export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },      // Usando Login
  { path: 'register', component: Register },  // Usando Register
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard] // <-- 3. APLICAR EL GUARDIÁN A ESTA RUTA
  }
  ,{
    path: 'my-reservations',
    component: MyReservations,
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    component: Reports,
    canActivate: [authGuard]
  },
  {
    path: 'data-management',
    component: DataManagement,
    canActivate: [authGuard]
  },

  {
    path: 'seat-map',
    component: SeatMapViewer,
    canActivate: [authGuard]
  }
];
