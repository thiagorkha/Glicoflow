export interface User {
  id: string;
  username: string;
  email: string;
}

export interface GlucoseRecord {
  id: string;
  userId: string;
  value: number; // mg/dL
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  createdAt: number;
}

export enum ViewState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  HOME = 'HOME',
  ADD_ENTRY = 'ADD_ENTRY',
  HISTORY = 'HISTORY',
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  token?: string;
}