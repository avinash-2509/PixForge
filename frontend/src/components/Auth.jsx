import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please try again.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', username);
      onLoginSuccess(data.token, username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] rounded-xl border border-border bg-card text-card-foreground shadow-lg backdrop-blur-md p-8">
      <div className="flex flex-col space-y-2 text-center mb-6">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isLogin ? 'Sign in to start forging images' : 'Enter your details below to register'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm bg-destructive/10 border border-destructive/20 text-destructive text-center p-3 rounded-lg font-medium">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label 
            htmlFor="username" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
          >
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="flex h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="password" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="flex h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full shadow-md hover:shadow-primary/25"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Please wait
            </>
          ) : (
            isLogin ? 'Login to PixelForge' : 'Register Account'
          )}
        </button>
      </form>

      <div className="text-center mt-6">
        <button
          className="text-xs text-primary hover:underline font-medium bg-transparent border-none cursor-pointer"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setUsername('');
            setPassword('');
          }}
          disabled={loading}
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
