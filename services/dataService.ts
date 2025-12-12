import { GlucoseRecord } from '../types';
import * as MockDB from './mockDatabase';

// In a real Render deployment, these functions would fetch() to your NodeJS API

export const addGlucoseRecord = async (
  userId: string,
  value: number,
  date: string,
  time: string
): Promise<GlucoseRecord> => {
  await MockDB.delay(500); // Simulate API latency

  const newRecord: GlucoseRecord = {
    id: crypto.randomUUID(),
    userId,
    value,
    date,
    time,
    createdAt: Date.now(),
  };

  MockDB.saveRecord(newRecord);
  return newRecord;
};

export const getUserHistory = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<GlucoseRecord[]> => {
  await MockDB.delay(600);
  
  let records = MockDB.getRecordsByUser(userId);

  if (startDate && endDate) {
    records = records.filter(r => r.date >= startDate && r.date <= endDate);
  }

  return records;
};

export const getStats = async (userId: string) => {
  const records = await getUserHistory(userId);
  if (records.length === 0) return { avg: 0, count: 0, last: 0 };

  const total = records.reduce((acc, curr) => acc + curr.value, 0);
  const avg = Math.round(total / records.length);
  const last = records[0].value; // Records are sorted desc by default in mock

  return { avg, count: records.length, last };
};
