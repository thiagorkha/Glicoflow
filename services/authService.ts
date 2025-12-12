import { User, AuthResponse } from '../types';
import * as MockDB from './mockDatabase';

// In a real Render deployment, replace these function bodies with fetch() calls to your backend

export const registerUser = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  await MockDB.delay(800);
  
  // Check existence
  if (MockDB.findUserByUsername(username)) {
    return { success: false, message: 'Usuário já existe' };
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    email
  };

  MockDB.saveUser({ ...newUser, password }); // In real app, never save plain password!
  
  return { success: true, user: newUser };
};

export const loginUser = async (username: string, password: string): Promise<AuthResponse> => {
  await MockDB.delay(800);

  const found = MockDB.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());

  if (found && found.password === password) {
    // Return user without password
    const { password: _, ...cleanUser } = found;
    return { success: true, user: cleanUser as User };
  }

  return { success: false, message: 'Usuário ou senha inválidos' };
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  await MockDB.delay(300); // Quick check
  return !MockDB.findUserByUsername(username);
};

export const checkAutoLogin = async (): Promise<User | null> => {
  // Check local storage for session token/id
  const sessionId = localStorage.getItem('glicoflow_session');
  if (!sessionId) return null;

  const users = MockDB.getUsers();
  const found = users.find(u => u.id === sessionId);
  
  if (found) {
    const { password: _, ...cleanUser } = found;
    return cleanUser as User;
  }
  return null;
};

export const logoutUser = () => {
  localStorage.removeItem('glicoflow_session');
};