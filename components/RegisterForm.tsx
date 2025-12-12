import React, { useState } from 'react';
import { ViewState } from '../types';
import { checkUsernameAvailability, registerUser } from '../services/authService';
import { Loader2, Mail, Lock, User as UserIcon, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

interface RegisterFormProps {
  onNavigate: (view: ViewState) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounce logic for username check
  React.useEffect(() => {
    const check = async () => {
      if (username.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      setIsCheckingUser(true);
      try {
        const available = await checkUsernameAvailability(username);
        setUsernameAvailable(available);
      } catch (e) {
        // ignore
      } finally {
        setIsCheckingUser(false);
      }
    };

    const timer = setTimeout(check, 600);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameAvailable) return;
    
    setLoading(true);
    setError('');

    try {
      const result = await registerUser(username, email, password);
      if (result.success) {
        alert('Cadastro realizado com sucesso! Faça login.');
        onNavigate(ViewState.LOGIN);
      } else {
        setError(result.message || 'Erro ao cadastrar');
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 bg-white">
      <button 
        onClick={() => onNavigate(ViewState.LOGIN)}
        className="self-start text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Criar Conta</h2>
        <p className="text-gray-500 text-sm mt-1">Comece a monitorar sua saúde hoje</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Usuário</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} // No spaces
              className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition ${
                usernameAvailable === false && username.length >= 3 ? 'border-red-300 focus:ring-red-200' : 
                usernameAvailable === true ? 'border-green-300 focus:ring-green-200' : 'border-gray-200 focus:ring-blue-500'
              }`}
              placeholder="Escolha um usuário único"
            />
            <div className="absolute right-3 top-3.5">
              {isCheckingUser && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {!isCheckingUser && usernameAvailable === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {!isCheckingUser && usernameAvailable === false && username.length >= 3 && <XCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>
          {usernameAvailable === false && username.length >= 3 && (
            <p className="text-xs text-red-500">Este nome de usuário já está em uso.</p>
          )}
        </div>

        <div className="space-y-1">
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

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !usernameAvailable || username.length < 3 || password.length < 6}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 flex items-center justify-center transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cadastrar e Entrar'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;