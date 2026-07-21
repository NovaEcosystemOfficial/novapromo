import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PostTable from '../components/PostTable.jsx';

export default function Drafts() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    api.getPosts({ status: 'draft' })
      .then(setPosts)
      .catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const handlePublish = async (id) => {
    setMessage('');
    try {
      await api.publishPost(id);
      setMessage('Pubblicazione avviata!');
      load();
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa bozza?')) return;
    setError('');
    setMessage('');
    try {
      await api.deletePost(id);
      setMessage('Bozza eliminata.');
      load();
    } catch (err) {
      setError(err.message || 'Impossibile eliminare la bozza. Riprova.');
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Bozze</h2>
        <p>Contenuti salvati non ancora programmati o pubblicati</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <PostTable posts={posts} onPublish={handlePublish} onDelete={handleDelete} />
    </>
  );
}
