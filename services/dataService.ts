import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';
import { GlucoseRecord } from '../types';

const COLLECTION_NAME = 'glucose_records';

export const addGlucoseRecord = async (
  userId: string,
  value: number,
  date: string,
  time: string
): Promise<GlucoseRecord> => {
  try {
    const timestamp = Date.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      value,
      date,
      time,
      createdAt: timestamp
    });

    return {
      id: docRef.id,
      userId,
      value,
      date,
      time,
      createdAt: timestamp
    };
  } catch (error) {
    console.error("Erro ao salvar no Firestore:", error);
    throw new Error('Falha ao salvar registro');
  }
};

export const getUserHistory = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<GlucoseRecord[]> => {
  try {
    // Usamos apenas createdAt para ordenação. 
    // Isso ainda exige um índice composto (userId ASC, createdAt DESC).
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const records: GlucoseRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        ...data
      } as GlucoseRecord);
    });

    // Filtro de data feito no cliente para simplificar os índices do Firebase
    if (startDate && endDate) {
      return records.filter(r => r.date >= startDate && r.date <= endDate);
    }

    return records;
  } catch (error: any) {
    console.error("Erro ao buscar histórico no Firestore:", error);
    if (error.message && error.message.includes('index')) {
      console.warn("⚠️ AÇÃO NECESSÁRIA: Clique no link acima para criar o índice no Firebase Console.");
    }
    return [];
  }
};

export const getStats = async (userId: string) => {
  const records = await getUserHistory(userId);
  
  if (!records || records.length === 0) return { avg: 0, count: 0, last: 0 };

  const total = records.reduce((acc, curr) => acc + curr.value, 0);
  const avg = Math.round(total / records.length);
  const last = records[0].value; 

  return { avg, count: records.length, last };
};