import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function ProjectSearch() {
  const { id } = useParams();
  const projectId = id!;
  const [topic, setTopic] = useState('');
  const [from, setFrom] = useState('2021-01-01');
  const [to, setTo] = useState('');
  const [free, setFree] = useState(true);
  const [pubTypes, setPubTypes] = useState<string>('Systematic Review, Meta-Analysis, Randomized Controlled Trial');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setMsg(null);
    try {
      const publicationTypes = pubTypes.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api<{ query: { id: string; status: string } }>(`/api/projects/${projectId}/search`, {
        method: 'POST',
        body: JSON.stringify({
          topic,
          filters: {
            publishedFrom: from || undefined,
            publishedTo: to || undefined,
            freeFullTextOnly: free,
            publicationTypes
          }
        })
      });
      setMsg(`Search queued: ${res.query.id} (status=${res.query.status}). Open Articles page and reload in ~1-2 minutes.`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Search</h2>
      <p><Link to={`/projects/${projectId}/articles`}>Go to Articles</Link></p>

      <div style={{ display: 'grid', gap: 8, maxWidth: 720 }}>
        <label>
          Topic / query
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. diabetes metformin randomized trial" />
        </label>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label>
            Published from
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Published to
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} />
            Free full text only
          </label>
        </div>

        <label>
          Publication types (comma separated)
          <input value={pubTypes} onChange={(e) => setPubTypes(e.target.value)} />
        </label>

        <button onClick={run} disabled={!topic.trim()}>Run search</button>

        {msg ? <pre style={{ whiteSpace: 'pre-wrap' }}>{msg}</pre> : null}
        {error ? <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre> : null}
      </div>
    </div>
  );
}
