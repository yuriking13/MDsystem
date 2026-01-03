import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

type Article = {
  id: string;
  titleEn: string;
  titleRu?: string | null;
  abstractEn?: string | null;
  abstractRu?: string | null;
  authors?: string | null;
  year?: number | null;
  doi?: string | null;
  url?: string | null;
  hasStats: boolean;
};

export default function Articles() {
  const { id } = useParams();
  const projectId = id!;
  const [state, setState] = useState<'found'|'selected'|'excluded'>('found');
  const [items, setItems] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api<{ articles: Article[] }>(`/api/projects/${projectId}/articles?state=${state}`);
      setItems(res.articles);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [state]);

  async function setArticleState(articleId: string, newState: 'found'|'selected'|'excluded') {
    await api(`/api/projects/${projectId}/articles/${articleId}/state`, {
      method: 'POST',
      body: JSON.stringify({ state: newState })
    });
    await load();
  }

  return (
    <div>
      <h2>Articles</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <label>View:</label>
        <select value={state} onChange={(e) => setState(e.target.value as any)}>
          <option value="found">Found</option>
          <option value="selected">Selected</option>
          <option value="excluded">Excluded</option>
        </select>
        <button onClick={load}>Reload</button>
        <span style={{ marginLeft: 12 }}>Count: {items.length}</span>
      </div>

      {error ? <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre> : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((a) => (
          <div key={a.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong style={{ flex: 1 }}>{a.titleEn}</strong>
              {a.hasStats ? <span title="Stats detected">⚡</span> : null}
              {a.url ? <a href={a.url} target="_blank" rel="noreferrer">PubMed</a> : null}
            </div>

            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {a.year ? <span>{a.year}</span> : null}
              {a.doi ? <span> — DOI: {a.doi}</span> : null}
            </div>

            {a.abstractEn ? <p style={{ marginTop: 8 }}>{a.abstractEn}</p> : null}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {state !== 'selected' ? <button onClick={() => setArticleState(a.id, 'selected')}>Select</button> : null}
              {state !== 'excluded' ? <button onClick={() => setArticleState(a.id, 'excluded')}>Exclude</button> : null}
              {state !== 'found' ? <button onClick={() => setArticleState(a.id, 'found')}>Back to Found</button> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
