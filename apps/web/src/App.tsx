import React from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { setToken, getToken } from './api/client';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectSearch from './pages/ProjectSearch';
import Articles from './pages/Articles';

export default function App() {
  const nav = useNavigate();
  const token = getToken();

  function logout() {
    setToken(null);
    nav('/login');
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <strong>Thesis</strong>
        <Link to="/projects">Projects</Link>
        <span style={{ flex: 1 }} />
        {token ? <button onClick={logout}>Logout</button> : <Link to="/login">Login</Link>}
      </header>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id/search" element={<ProjectSearch />} />
        <Route path="/projects/:id/articles" element={<Articles />} />
        <Route path="*" element={<Projects />} />
      </Routes>
    </div>
  );
}
