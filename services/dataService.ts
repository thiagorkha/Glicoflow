import { GlucoseRecord } from '../types';

// TODO: Altere esta URL para o endereço do seu backend no Render
const API_BASE_URL = 'https://glicoflow-backend.onrender.com'; 

const getHeaders = () => {
  const token = localStorage.getItem('glicoflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
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
    throw new Error('Falha ao salvar registro');
  }

  return response.json();
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
      console.error("Falha ao buscar histórico");
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Erro de conexão", error);
    return [];
  }
};

export const getStats = async (userId: string) => {
  // Busca o histórico completo ou parcial para calcular estatísticas
  // O ideal seria um endpoint dedicado /stats, mas calcularemos no front por enquanto
  // para manter compatibilidade com a estrutura anterior
  const records = await getUserHistory(userId);
  
  if (!records || records.length === 0) return { avg: 0, count: 0, last: 0 };

  const total = records.reduce((acc, curr) => acc + curr.value, 0);
  const avg = Math.round(total / records.length);
  
  // Ordena por data/hora decrescente para pegar o último registro
  // Assume que o backend retorna datas no formato YYYY-MM-DD
  records.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  const last = records[0].value;

  return { avg, count: records.length, last };
};