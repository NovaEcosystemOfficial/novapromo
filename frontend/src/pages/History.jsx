import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PostTable from '../components/PostTable.jsx';
import { formatDateTime, PLATFORM_LABELS } from '../utils/labels.js';

export default function History() {
  const [posts, setPosts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('posts');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getPosts(),
      api.getLogs({ limit: 50 }),
    ])
      .then(([p, l]) => {
        setPosts(p.filter((post) => post.status === 'published' || post.status === 'error'));
        setLogs(l);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <>
      <div className="page-header">
        <h2>Storico pubblicazioni</h2>
        <p>Contenuti pubblicati e log delle operazioni API</p>
      </div>

      <div className="actions" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`btn btn-sm ${tab === 'posts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('posts')}
        >
          Contenuti
        </button>
        <button
          className={`btn btn-sm ${tab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('logs')}
        >
          Log API
        </button>
      </div>

      {tab === 'posts' ? (
        <PostTable posts={posts} showActions={false} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Piattaforma</th>
                <th>Azione</th>
                <th>Stato</th>
                <th>Messaggio</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{PLATFORM_LABELS[log.platform] || log.platform}</td>
                  <td>{log.action}</td>
                  <td>{log.status}</td>
                  <td>{log.message}</td>
                  <td>{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
