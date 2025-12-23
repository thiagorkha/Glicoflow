import React, { useEffect, useState } from 'react';
import { User, ViewState } from '../types';
import { getStats, getUserHistory } from '../services/dataService';
import { PlusCircle, Search, Activity, Smartphone, X } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardProps {
  user: User;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({ avg: 0, count: 0, last: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const s = await getStats(user.id);
      setStats(s);
      const h = await getUserHistory(user.id);
      // Pega as últimas 7 medições para o mini-gráfico
      const recent = [...h].slice(0, 7).reverse().map(r => ({
        name: r.time,
        value: r.value
      }));
      setChartData(recent);
    };
    fetchData();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [user.id]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto scrollbar-hide">
      <div className="flex justify-between items-center">
        <div className="text-left">
          <h2 className="text-xl font-bold text-gray-800">Olá, {user.username}!</h2>
          <p className="text-gray-500 text-xs">Visão geral do seu controle</p>
        </div>
        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border-2 border-white bg-blue-600">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* PWA Install Notification */}
      {deferredPrompt && showInstallBanner && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-2xl flex items-center justify-between text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 z-10">
            <div className="bg-white/20 p-2 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-bold">Instalar GlicoFlow</span>
              <span className="text-[10px] opacity-80 font-medium italic">Acesso rápido na tela inicial</span>
            </div>
          </div>
          <div className="flex items-center gap-2 z-10">
            <button 
              onClick={handleInstallClick}
              className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight active:scale-95 transition"
            >
              Instalar
            </button>
            <button onClick={() => setShowInstallBanner(false)} className="p-1 opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Decorative element */}
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Média</span>
          <span className="text-3xl font-black text-gray-800">{stats.avg}</span>
          <span className="text-[10px] text-gray-400 font-bold">mg/dL</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Última</span>
          <span className="text-3xl font-black text-gray-800">{stats.last}</span>
          <span className="text-[10px] text-gray-400 font-bold">mg/dL</span>
        </div>
      </div>

      {/* Mini-Evolution Chart */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-[180px]">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Activity className="w-3 h-3 text-blue-500" /> Evolução Recente
          </p>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Últimas 7</span>
        </div>
        {chartData.length > 1 ? (
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '10px' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorDash)" 
                  dot={{ r: 3, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-300">
            <Activity className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Aguardando mais medições</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 mb-2">
        <button 
          onClick={() => onNavigate(ViewState.ADD_ENTRY)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-3 transition transform active:scale-[0.98]"
        >
          <PlusCircle className="w-6 h-6" />
          <span className="font-bold">Nova Medição</span>
        </button>

        <button 
          onClick={() => onNavigate(ViewState.HISTORY)}
          className="w-full bg-white hover:bg-gray-50 text-blue-600 border border-blue-50 py-4 px-6 rounded-2xl shadow-sm flex items-center justify-center gap-3 transition"
        >
          <Search className="w-6 h-6" />
          <span className="font-bold">Histórico e Gráficos</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;