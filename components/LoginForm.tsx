import React, { useState } from 'react';
import { User, ViewState } from '../types';
import { loginUser } from '../services/authService';
import { Loader2, Lock, Mail } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: User, remember: boolean) => void;
  onNavigate: (view: ViewState) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginUser(email, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user, rememberMe);
      } else {
        setError(result.message || 'Falha no login');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-8 bg-white">
      <div className="text-center mb-10">
        <div className="w-24 h-24 mx-auto mb-4 overflow-hidden rounded-3xl shadow-lg border-2 border-blue-50">
          <img src="logo.png" alt="GlicoFlow Logo" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">GlicoFlow</h2>
        <p className="text-gray-500 text-sm mt-1">Sua saúde sob controle</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              placeholder="Sua senha"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center transition transform active:scale-95 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Não tem uma conta?{' '}
          <button 
            onClick={() => onNavigate(ViewState.REGISTER)}
            className="text-blue-600 font-bold hover:underline"
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;