import React, { useState, useEffect } from 'react';
import { User, GlucoseRecord } from '../types';
import { getUserHistory } from '../services/dataService';
import { Filter, CalendarOff, Printer } from 'lucide-react';

interface HistoryProps {
  user: User;
}

const History: React.FC<HistoryProps> = ({ user }) => {
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getUserHistory(user.id, startDate, endDate);
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    
    setStartDate(firstDay);
    setEndDate(today);
    // We will trigger loadData in the next effect when state updates, or we can call it here manually
    // but better to let the user click "Filter" or load initially
    
    getUserHistory(user.id, firstDay, today).then(setRecords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Group by date for display
  const groupedRecords = records.reduce((acc, rec) => {
    // Format date YYYY-MM-DD to DD/MM/YYYY for display
    const parts = rec.date.split('-');
    const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    
    if (!acc[displayDate]) acc[displayDate] = [];
    acc[displayDate].push(rec);
    return acc;
  }, {} as Record<string, GlucoseRecord[]>);

  const sortedDates = Object.keys(groupedRecords).sort((a, b) => {
     const da = a.split('/').reverse().join('-');
     const db = b.split('/').reverse().join('-');
     return db.localeCompare(da); // Descending
  });

  const getStatusColor = (val: number) => {
    if (val < 70) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (val > 180) return 'bg-red-50 text-red-800 border-red-200';
    return 'bg-green-50 text-green-800 border-green-200';
  };

  return (
    <div className="flex-1 flex flex-col p-6 h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Histórico</h2>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Início</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg text-sm bg-gray-50" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Fim</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg text-sm bg-gray-50" 
            />
          </div>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm flex justify-center items-center gap-2 transition"
        >
          <Filter className="w-4 h-4" />
          Filtrar Resultados
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto -mx-2 px-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400 animate-pulse">Carregando...</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <CalendarOff className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
             <div className="flex justify-between items-center text-xs text-gray-400 font-medium px-1">
               <span>{records.length} medições</span>
               <button onClick={() => window.print()} className="flex items-center gap-1 hover:text-gray-600">
                 <Printer className="w-3 h-3" /> Imprimir
               </button>
             </div>

             {sortedDates.map(date => (
               <div key={date} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                 <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">
                   {date}
                 </div>
                 <div className="p-3 grid grid-cols-3 gap-2">
                   {groupedRecords[date].sort((a,b) => a.time.localeCompare(b.time)).map(rec => (
                     <div 
                        key={rec.id} 
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border ${getStatusColor(rec.value)}`}
                      >
                       <span className="text-[10px] opacity-70 mb-0.5">{rec.time}</span>
                       <span className="text-lg font-bold leading-none">{rec.value}</span>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;