import React, { useEffect, useState } from 'react';
import { User, ViewState } from '../types';
import { getStats, getUserHistory } from '../services/dataService';
import { PlusCircle, Search, Activity, Smartphone } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardProps {
  user: User;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({ avg: 0, count: 0, last: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const s = await getStats(user.id);
      setStats(s);
      const h = await getUserHistory(user.id);
      const recent = h.slice(0, 10).reverse().map(r => ({
        name: r.date.split('/').slice(0, 2).join('/'),
        value: r.value
      }));
      setChartData(recent);
    };
    fetchData();

    // Listener para o evento de instalação (Chrome/Android)
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
    <div className="flex-1 flex flex-col p-6 gap-6">
      <div className="flex justify-between items-start">
        <div className="text-left">
          <h2 className="text-xl font-semibold text-gray-800">Olá, {user.username}!</h2>
          <p className="text-gray-500 text-sm">Resumo da sua glicemia</p>
        </div>
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <img src="logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* PWA Install Notification */}
      {deferredPrompt && (
        <div className="bg-blue-600 p-4 rounded-2xl flex items-center justify-between text-white shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5" />
            <span className="text-sm font-bold">Instalar GlicoFlow?</span>
          </div>
          <button 
            onClick={handleInstallClick}
            className="bg-white text-blue-600 px-4 py-1 rounded-lg text-xs font-black uppercase"
          >
            Instalar
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Média Geral</span>
          <span className="text-3xl font-bold text-blue-900 mt-1">{stats.avg}</span>
          <span className="text-xs text-blue-400 mt-1">mg/dL</span>
        </div>
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-green-400 uppercase tracking-wide">Última</span>
          <span className="text-3xl font-bold text-green-900 mt-1">{stats.last}</span>
          <span className="text-xs text-green-400 mt-1">mg/dL</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-48 w-full">
        <p className="text-xs font-bold text-gray-400 mb-2">EVOLUÇÃO RECENTE</p>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" hide />
              <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: '#1e40af', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorG)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <Activity className="w-8 h-8 mb-2" />
            <span className="text-xs">Dados insuficientes para gráfico</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-auto mb-4">
        <button 
          onClick={() => onNavigate(ViewState.ADD_ENTRY)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 transition transform hover:scale-[1.02]"
        >
          <PlusCircle className="w-6 h-6" />
          Marcar Medição
        </button>

        <button 
          onClick={() => onNavigate(ViewState.HISTORY)}
          className="w-full bg-white hover:bg-gray-50 text-blue-600 border border-blue-100 text-lg font-medium py-4 px-6 rounded-xl shadow-sm flex items-center justify-center gap-3 transition"
        >
          <Search className="w-6 h-6" />
          Consultar Histórico
        </button>
      </div>
    </div>
  );
};

export default Dashboard;