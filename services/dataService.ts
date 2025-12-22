import { GlucoseRecord } from '../types';

// O valor correto é '/api' para que o proxy do Vite ou o servidor Express direcione corretamente
const API_BASE_URL = '/api'; 

const getHeaders = () => {
  const token = localStorage.getItem('glicoflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const safeParseJSON = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error('Resposta não-JSON recebida:', text);
    throw new Error(`Erro do servidor: Resposta inválida (${response.status})`);
  }
};

export const addGlucoseRecord = async (
  userId: string,
  value: number,
  date: string,
  time: string
): Promise<GlucoseRecord> => {
  const response = await fetch(`${API_BASE_URL}/records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId, value, date, time }),
  });

  if (!response.ok) {
    const errorData = await safeParseJSON(response).catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(errorData.message || 'Falha ao salvar registro');
  }

  return safeParseJSON(response);
};

export const getUserHistory = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<GlucoseRecord[]> => {
  const params = new URLSearchParams({ userId });
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  try {
    const response = await fetch(`${API_BASE_URL}/records?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.error("Falha ao buscar histórico:", response.status);
      return [];
    }

    return await safeParseJSON(response);
  } catch (error) {
    console.error("Erro de conexão no histórico:", error);
    return [];
  }
};

export const getStats = async (userId: string) => {
  const records = await getUserHistory(userId);
  
  if (!records || records.length === 0) return { avg: 0, count: 0, last: 0 };

  const total = records.reduce((acc, curr) => acc + curr.value, 0);
  const avg = Math.round(total / records.length);
  
  // Ordena por data/hora decrescente para pegar o último registro
  const sorted = [...records].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  const last = sorted[0].value;

  return { avg, count: records.length, last };
};