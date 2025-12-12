import { User, GlucoseRecord } from '../types';

const DB_USERS_KEY = 'glicoflow_users';
const DB_RECORDS_KEY = 'glicoflow_records';

// Helper to simulate network delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- User Helpers ---

export const getUsers = (): (User & { password?: string })[] => {
  const usersStr = localStorage.getItem(DB_USERS_KEY);
  return usersStr ? JSON.parse(usersStr) : [];
};

export const saveUser = (user: User & { password?: string }): void => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
};

export const findUserByUsername = (username: string) => {
  const users = getUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase());
};

// --- Record Helpers ---

export const getRecords = (): GlucoseRecord[] => {
  const recordsStr = localStorage.getItem(DB_RECORDS_KEY);
  return recordsStr ? JSON.parse(recordsStr) : [];
};

export const saveRecord = (record: GlucoseRecord): void => {
  const records = getRecords();
  records.push(record);
  localStorage.setItem(DB_RECORDS_KEY, JSON.stringify(records));
};

export const getRecordsByUser = (userId: string): GlucoseRecord[] => {
  const records = getRecords();
  return records.filter(r => r.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
};