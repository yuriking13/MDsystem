import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await api<{ token: string }>(path, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(res.token);
      nav('/projects');
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          Switch to {mode === 'login' ? 'Register' : 'Login'}
        </button>
        {error ? <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre> : null}
      </form>
    </div>
  );
}
