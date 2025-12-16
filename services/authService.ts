import { User, AuthResponse } from '../types';

// Use relative URL so it works automatically when served by the backend
const API_BASE_URL = 'backend/server.js'; 

// Helper para obter cabeçalhos com o token
const getHeaders = () => {
  const token = localStorage.getItem('glicoflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Helper seguro para fazer parse do JSON
const parseJSON = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error('Failed to parse JSON response:', text);
    throw new Error('Resposta inválida do servidor');
  }
};

export const registerUser = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    
    const data = await parseJSON(response);
    
    if (response.ok && data.token) {
      localStorage.setItem('glicoflow_token', data.token);
    } else if (!response.ok) {
      return { success: false, message: data.message || 'Erro ao cadastrar' };
    }
    
    return data;
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Erro de conexão com o servidor' };
  }
};

export const loginUser = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await parseJSON(response);

    if (response.ok && data.token) {
      localStorage.setItem('glicoflow_token', data.token);
      return { success: true, user: data.user, token: data.token };
    }

    return { success: false, message: data.message || 'Usuário ou senha inválidos' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Erro de conexão ao tentar entrar.' };
  }
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    
    if (!response.ok) return false;
    const data = await parseJSON(response);
    return data.available;
  } catch (error) {
    console.error("Check username failed", error);
    return false;
  }
};

export const checkAutoLogin = async (): Promise<User | null> => {
  const token = localStorage.getItem('glicoflow_token');
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (response.ok) {
      const data = await parseJSON(response);
      return data.user;
    } else {
      // Token inválido ou expirado
      localStorage.removeItem('glicoflow_token');
      return null;
    }
  } catch (error) {
    return null;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('glicoflow_token');
};