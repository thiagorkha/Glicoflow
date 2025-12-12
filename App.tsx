import React, { useState, useEffect } from 'react';
import { User, ViewState } from './types';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import AddEntry from './components/AddEntry';
import History from './components/History';
import { checkAutoLogin, logoutUser } from './services/authService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  const [initializing, setInitializing] = useState(true);

  // Check for stored session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = await checkAutoLogin();
      if (storedUser) {
        setUser(storedUser);
        setCurrentView(ViewState.HOME);
      }
      setInitializing(false);
    };
    initAuth();
  }, []);

  const handleLoginSuccess = (userData: User, remember: boolean) => {
    setUser(userData);
    setCurrentView(ViewState.HOME);
    if (remember) {
      localStorage.setItem('glicoflow_session', userData.id);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCurrentView(ViewState.LOGIN);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case ViewState.LOGIN:
        return (
          <LoginForm 
            onLoginSuccess={handleLoginSuccess} 
            onNavigate={setCurrentView} 
          />
        );
      case ViewState.REGISTER:
        return (
          <RegisterForm 
            onNavigate={setCurrentView} 
          />
        );
      case ViewState.HOME:
        return user ? (
          <Dashboard 
            user={user} 
            onNavigate={setCurrentView} 
          />
        ) : null;
      case ViewState.ADD_ENTRY:
        return user ? (
          <AddEntry 
            user={user} 
            onSuccess={() => setCurrentView(ViewState.HOME)} 
          />
        ) : null;
      case ViewState.HISTORY:
        return user ? (
          <History user={user} />
        ) : null;
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      onNavigate={setCurrentView}
      onLogout={handleLogout}
      title={currentView === ViewState.HISTORY ? 'Histórico' : 'GlicoFlow'}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;