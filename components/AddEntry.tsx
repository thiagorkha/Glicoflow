import React, { useState, useEffect } from 'react';
import { User, ViewState } from '../types';
import { addGlucoseRecord } from '../services/dataService';
import { Check, Loader2, Calendar, Clock } from 'lucide-react';

interface AddEntryProps {
  user: User;
  onSuccess: () => void;
}

const AddEntry: React.FC<AddEntryProps> = ({ user, onSuccess }) => {
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    setDate(now.toISOString().split('T')[0]); // YYYY-MM-DD
    setTime(now.toTimeString().slice(0, 5)); // HH:mm
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || !date || !time) return;

    setLoading(true);
    try {
      await addGlucoseRecord(user.id, parseInt(value), date, time);
      onSuccess();
    } catch (err) {
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Nova Medição</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
        
        <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100 text-center shadow-inner">
          <label className="block text-blue-800 text-sm font-semibold mb-2">Valor da Glicemia</label>
          <div className="relative max-w-[200px] mx-auto">
            <input 
              type="number" 
              required 
              placeholder="000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="text-5xl font-bold text-center text-blue-900 w-full bg-transparent border-b-2 border-blue-300 focus:border-blue-600 focus:outline-none py-2 placeholder-blue-200"
              autoFocus
            />
            <span className="block mt-2 text-sm text-blue-400 font-medium">mg/dL</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1 uppercase">
              <Calendar className="w-3 h-3" /> Data
            </label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent font-medium text-gray-700 focus:outline-none" 
            />
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1 uppercase">
              <Clock className="w-3 h-3" /> Hora
            </label>
            <input 
              type="time" 
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent font-medium text-gray-700 focus:outline-none" 
            />
          </div>
        </div>

        <div className="mt-auto">
          <button 
            type="submit" 
            disabled={loading || !value}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span className="text-lg">SALVAR MARCAÇÃO</span>
                <Check className="w-6 h-6" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEntry;