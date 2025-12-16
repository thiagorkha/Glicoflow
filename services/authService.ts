import { User, AuthResponse } from '../types';

const API_BASE_URL = '/api'; 

const getHeaders = () => {
  const token = localStorage.getItem('glicoflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const parseJSON = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error('Failed to parse JSON response. Raw text:', text);
    return { message: `Erro do servidor (Resposta inválida): ${text.substring(0, 100)}` };
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
      return data; 
    } else {
      // Debug intenso: Vamos ver o que chegou se deu erro ou se o token sumiu
      console.warn("Register Failed. Status:", response.status);
      console.warn("Response Body:", data);
      
      const errorMsg = data.message || data.error || `Erro desconhecido (Status: ${response.status} - Sem token na resposta)`;
      return { success: false, message: errorMsg };
    }
  } catch (error) {
    console.error("Network/System error:", error);
    return { success: false, message: 'Não foi possível conectar ao servidor.' };
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

    return { success: false, message: data.message || data.error || 'Usuário ou senha inválidos' };
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
    
    if (!response.ok) return true;
    
    const data = await parseJSON(response);
    return data.available;
  } catch (error) {
    console.error("Check username failed", error);
    return true;
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