import React, { useState, useEffect, useMemo } from 'react';
import { User, GlucoseRecord } from '../types';
import { getUserHistory } from '../services/dataService';
import { Filter, CalendarOff, Printer, TrendingUp, BarChart2 } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

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
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    
    setStartDate(firstDay);
    setEndDate(today);
    
    getUserHistory(user.id, firstDay, today).then(setRecords);
  }, [user.id]);

  // Process data for Chart 1: All measurements (Chronological)
  const chronologicalData = useMemo(() => {
    return [...records].sort((a, b) => a.createdAt - b.createdAt).map(r => ({
      timestamp: `${r.date.split('-').slice(1).reverse().join('/')} ${r.time}`,
      value: r.value
    }));
  }, [records]);

  // Process data for Chart 2: Daily Averages
  const dailyAverageData = useMemo(() => {
    const dailyMap: Record<string, { total: number, count: number }> = {};
    
    records.forEach(r => {
      if (!dailyMap[r.date]) dailyMap[r.date] = { total: 0, count: 0 };
      dailyMap[r.date].total += r.value;
      dailyMap[r.date].count += 1;
    });

    return Object.keys(dailyMap)
      .sort()
      .map(date => ({
        date: date.split('-').reverse().slice(0, 2).join('/'),
        avg: Math.round(dailyMap[date].total / dailyMap[date].count)
      }));
  }, [records]);

  // Group by date for display list
  const groupedRecords = records.reduce((acc, rec) => {
    const parts = rec.date.split('-');
    const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    
    if (!acc[displayDate]) acc[displayDate] = [];
    acc[displayDate].push(rec);
    return acc;
  }, {} as Record<string, GlucoseRecord[]>);

  const sortedDates = Object.keys(groupedRecords).sort((a, b) => {
     const da = a.split('/').reverse().join('-');
     const db = b.split('/').reverse().join('-');
     return db.localeCompare(da); 
  });

  const getStatusClasses = (val: number) => {
    if (val < 70) return 'bg-blue-50 text-blue-800 border-blue-200'; // Hipoglicemia
    if (val <= 130) return 'bg-green-50 text-green-800 border-green-200'; // Normal
    if (val <= 180) return 'bg-yellow-50 text-yellow-800 border-yellow-200'; // Elevada
    return 'bg-red-50 text-red-800 border-red-200'; // Hiperglicemia
  };

  const getIndicatorColor = (val: number) => {
    if (val < 70) return 'bg-blue-500';
    if (val <= 130) return 'bg-green-500';
    if (val <= 180) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1 flex flex-col p-6 h-full space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="text-xl font-bold text-gray-800">Análise e Histórico</h2>
        <button onClick={() => window.print()} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Início</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Fim</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm flex justify-center items-center gap-2 transition"
        >
          <Filter className="w-4 h-4" />
          Atualizar Análise
        </button>
      </div>

      {!loading && records.length > 0 && (
        <div className="space-y-6">
          {/* Chart 1: All Measurements */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-bold text-gray-400 uppercase">Tendência de Medições</p>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chronologicalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={['dataMin - 10', 'dataMax + 10']} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontSize: '10px', color: '#94a3b8' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Daily Average */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-green-500" />
              <p className="text-xs font-bold text-gray-400 uppercase">Média Diária (Tendência)</p>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyAverageData}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="avg" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorAvg)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-visible">
        {loading ? (
          <div className="text-center py-10 text-gray-400 animate-pulse font-medium">Processando dados...</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            <CalendarOff className="w-12 h-12 mb-2 opacity-10" />
            <p className="text-sm">Nenhum registro no período.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-10">
             <div className="flex justify-between items-center text-xs text-gray-400 font-bold px-1 uppercase tracking-wider">
               <span>Lista de Registros</span>
               <span>{records.length} itens</span>
             </div>

             {sortedDates.map(date => (
               <div key={date} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                 <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">
                   {date}
                 </div>
                 <div className="p-3 grid grid-cols-2 gap-3">
                   {groupedRecords[date].sort((a,b) => a.time.localeCompare(b.time)).map(rec => (
                     <div 
                        key={rec.id} 
                        className={`relative flex items-center gap-3 p-3 rounded-xl border transition hover:shadow-md ${getStatusClasses(rec.value)}`}
                      >
                       <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${getIndicatorColor(rec.value)}`} />
                       <div className="flex flex-col">
                         <span className="text-[10px] font-bold opacity-60 uppercase">{rec.time}</span>
                         <div className="flex items-baseline gap-1">
                           <span className="text-xl font-black">{rec.value}</span>
                           <span className="text-[10px] font-bold opacity-60">mg/dL</span>
                         </div>
                       </div>
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