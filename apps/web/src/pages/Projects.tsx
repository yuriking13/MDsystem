import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type Project = { id: string; title: string; role: string };

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api<{ projects: Project[] }>('/api/projects');
      setProjects(res.projects);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setError(null);
    try {
      await api('/api/projects', { method: 'POST', body: JSON.stringify({ title }) });
      setTitle('');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Projects</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
        <button onClick={create} disabled={!title.trim()}>Create</button>
        <button onClick={load}>Reload</button>
      </div>

      {error ? <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre> : null}

      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <strong>{p.title}</strong> ({p.role}) —{' '}
            <Link to={`/projects/${p.id}/search`}>Search</Link>{' '}
            | <Link to={`/projects/${p.id}/articles`}>Articles</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
