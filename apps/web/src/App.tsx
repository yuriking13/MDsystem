import React from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { clearToken, getToken } from './api/client';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectSearch from './pages/ProjectSearch';
import Articles from './pages/Articles';
import Settings from './pages/Settings';
import { RequireAuth } from './components/RequireAuth';

export default function App() {
  const nav = useNavigate();
  const token = getToken();

  function logout() {
    clearToken();
    nav('/login');
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <strong>Thesis</strong>
        <Link to="/projects">Projects</Link>
        <Link to="/settings">Settings</Link>
        <span style={{ flex: 1 }} />
        {token ? <button onClick={logout}>Logout</button> : <Link to="/login">Login</Link>}
      </header>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
        <Route path="/projects/:id/search" element={<RequireAuth><ProjectSearch /></RequireAuth>} />
        <Route path="/projects/:id/articles" element={<RequireAuth><Articles /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<RequireAuth><Projects /></RequireAuth>} />
      </Routes>
    </div>
  );
}
