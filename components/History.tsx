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

  const chronologicalData = useMemo(() => {
    return [...records].sort((a, b) => a.createdAt - b.createdAt).map(r => ({
      timestamp: `${r.date.split('-').slice(1).reverse().join('/')} ${r.time}`,
      value: r.value
    }));
  }, [records]);

  const dailyAverageData = useMemo(() => {
    const dailyMap: Record<string, { total: number, count: number }> = {};
    records.forEach(r => {
      if (!dailyMap[r.date]) dailyMap[r.date] = { total: 0, count: 0 };
      dailyMap[r.date].total += r.value;
      dailyMap[r.date].count += 1;
    });
    return Object.keys(dailyMap).sort().map(date => ({
      date: date.split('-').reverse().slice(0, 2).join('/'),
      avg: Math.round(dailyMap[date].total / dailyMap[date].count)
    }));
  }, [records]);

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

  const getStatusInfo = (val: number) => {
    if (val < 70) return { label: 'Hipoglicemia', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', hex: '#2563eb' };
    if (val <= 130) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', hex: '#16a34a' };
    if (val <= 180) return { label: 'Elevada', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', hex: '#ca8a04' };
    return { label: 'Hiperglicemia', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', hex: '#dc2626' };
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* Styles for Printing */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { display: block !important; width: 100% !important; padding: 0 !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f8fafc !important; color: #475569; }
          .status-indicator { width: 10px; height: 10px; display: inline-block; border-radius: 50%; margin-right: 5px; }
        }
      `}</style>

      {/* UI INTERFACE (HIDDEN ON PRINT) */}
      <div className="p-6 space-y-6 no-print">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-bold text-gray-800">Análise e Histórico</h2>
          <button onClick={() => window.print()} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
            <Printer className="w-4 h-4" /> Relatório para Impressão
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm bg-gray-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm bg-gray-50" />
            </div>
          </div>
          <button onClick={loadData} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm flex justify-center items-center gap-2">
            <Filter className="w-4 h-4" /> Atualizar Dashboard
          </button>
        </div>

        {records.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-bold text-gray-400 uppercase">Tendência de Medições</p>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chronologicalData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-green-500" />
                <p className="text-xs font-bold text-gray-400 uppercase">Média Diária</p>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyAverageData}>
                    <defs>
                      <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Area type="stepAfter" dataKey="avg" stroke="#10b981" fill="url(#colorAvg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 pb-10">
          {loading ? <div className="text-center py-10 animate-pulse text-gray-400 font-medium">Processando histórico...</div> :
            records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                <CalendarOff className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Sem registros para o período.</p>
              </div>
            ) : (
              sortedDates.map(date => (
                <div key={date} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">{date}</div>
                  <div className="p-3 grid grid-cols-2 gap-3">
                    {groupedRecords[date].sort((a,b) => a.time.localeCompare(b.time)).map(rec => {
                      const status = getStatusInfo(rec.value);
                      return (
                        <div key={rec.id} className={`relative flex items-center gap-3 p-3 rounded-xl border ${status.bg} ${status.border}`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${status.color.replace('text', 'bg')}`} />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold opacity-60 uppercase">{rec.time}</span>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-xl font-black ${status.color}`}>{rec.value}</span>
                              <span className="text-[10px] font-bold opacity-50">mg/dL</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )
          }
        </div>
      </div>

      {/* PRINT-ONLY VIEW (HIDDEN ON SCREEN) */}
      <div className="hidden print-container p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Relatório de Glicemia - GlicoFlow</h1>
          <p className="text-gray-500">Paciente: {user.username} | Período: {startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Hora</th>
              <th>Valor (mg/dL)</th>
              <th>Classificação</th>
            </tr>
          </thead>
          <tbody>
            {sortedDates.map(date => (
              groupedRecords[date].sort((a,b) => a.time.localeCompare(b.time)).map((rec, idx) => {
                const status = getStatusInfo(rec.value);
                return (
                  <tr key={rec.id}>
                    {idx === 0 ? (
                      <td rowSpan={groupedRecords[date].length} className="font-bold bg-gray-50">{date}</td>
                    ) : null}
                    <td>{rec.time}</td>
                    <td className="font-bold">{rec.value}</td>
                    <td>
                      <span className="status-indicator" style={{ backgroundColor: status.hex }}></span>
                      {status.label}
                    </td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>

        <div className="mt-10 pt-10 border-t text-center text-[10px] text-gray-400">
          Gerado em {new Date().toLocaleString('pt-BR')} pelo GlicoFlow. 
          Consulte sempre um profissional de saúde para interpretar estes dados.
        </div>
      </div>
    </div>
  );
};

export default History;