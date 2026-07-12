import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Check if token already exists in browser storage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('username');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUsername(storedUser);
    }
    setAppReady(true);
  }, []);

  const handleLoginSuccess = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername('');
  };

  if (!appReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium tracking-wide">Bootstrapping PixelForge Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {token ? (
        <Dashboard token={token} username={username} onLogout={handleLogout} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 gap-8 relative overflow-hidden">
          {/* Subtle background glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0"></div>
          
          <div className="flex flex-col items-center text-center max-w-[500px] gap-3 z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mt-2 sm:text-5xl">
              PixelForge <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Async</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-[400px]">
              High-performance asynchronous image processing sandboxed on RabbitMQ pipelines
            </p>
          </div>

          <div className="z-10 w-full flex justify-center">
            <Auth onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
