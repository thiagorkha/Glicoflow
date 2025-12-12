import React from 'react';
import { LogOut, Home, ArrowLeft } from 'lucide-react';
import { User, ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  currentView, 
  onNavigate, 
  onLogout,
  title 
}) => {
  const isAuthScreen = currentView === ViewState.LOGIN || currentView === ViewState.REGISTER;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col">
        {/* Header */}
        {!isAuthScreen && (
          <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-2">
              {currentView !== ViewState.HOME ? (
                <button 
                  onClick={() => onNavigate(ViewState.HOME)}
                  className="p-1 hover:bg-blue-700 rounded-full transition"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              ) : (
                <div className="p-1">
                  <Home className="w-6 h-6" />
                </div>
              )}
              <h1 className="text-lg font-bold">{title || 'GlicoFlow'}</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium bg-blue-700 px-2 py-1 rounded">
                {user?.username}
              </span>
              <button 
                onClick={onLogout} 
                className="p-2 hover:bg-blue-700 rounded-full transition"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

        {/* Content */}
        <main className="flex-1 flex flex-col relative overflow-y-auto scrollbar-hide">
          {children}
        </main>
        
        {/* Simple Footer/Copyright */}
        <footer className="p-4 text-center text-gray-400 text-xs bg-gray-50 border-t">
          &copy; {new Date().getFullYear()} GlicoFlow
        </footer>
      </div>
    </div>
  );
};

export default Layout;