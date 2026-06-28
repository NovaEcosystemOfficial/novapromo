import { useState } from 'react';
import { generateContent } from '../utils/contentGenerator.js';
import MediaPicker, { appendMediaToFormData } from './MediaPicker.jsx';

const DEFAULT_FORM = {
  project: '',
  platform: 'instagram',
  contentType: 'post',
  tone: 'professionale',
  caption: '',
  hashtags: '',
  scheduledAt: '',
};

function toLocalDatetime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContentForm({ initial = {}, onSubmit, submitLabel = 'Salva bozza', loading = false }) {
  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    ...initial,
    scheduledAt: toLocalDatetime(initial.scheduledAt),
  });
  const [media, setMedia] = useState(null);
  const [error, setError] = useState('');

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleGenerate = () => {
    if (!form.project) {
      setError('Inserisci un progetto/prodotto per generare il contenuto');
      return;
    }
    const generated = generateContent({
      project: form.project,
      platform: form.platform,
      tone: form.tone,
    });
    setForm((f) => ({ ...f, ...generated }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.project) return setError('Progetto/prodotto obbligatorio');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (!v) return;
      if (k === 'scheduledAt') {
        fd.append(k, new Date(v).toISOString());
      } else {
        fd.append(k, v);
      }
    });
    appendMediaToFormData(fd, media);

    try {
      await onSubmit(fd, form);
    } catch (err) {
      setError(err.message);
    }
  };

  const contentTypes =
    form.platform === 'tiktok'
      ? [['tiktok_video', 'TikTok Video']]
      : form.platform === 'instagram'
        ? [
            ['post', 'Post'],
            ['story', 'Storia'],
            ['reel', 'Reel'],
          ]
        : [
            ['post', 'Post IG'],
            ['story', 'Storia IG'],
            ['reel', 'Reel IG'],
            ['tiktok_video', 'TikTok Video'],
          ];

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label>Progetto / Prodotto</label>
          <input
            value={form.project}
            onChange={(e) => update('project', e.target.value)}
            placeholder="Es. NovaSneakers"
          />
        </div>
        <div className="form-group">
          <label>Piattaforma</label>
          <select value={form.platform} onChange={(e) => update('platform', e.target.value)}>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="both">Entrambi</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Tipo contenuto</label>
          <select value={form.contentType} onChange={(e) => update('contentType', e.target.value)}>
            {contentTypes.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Tono</label>
          <select value={form.tone} onChange={(e) => update('tone', e.target.value)}>
            <option value="professionale">Professionale</option>
            <option value="hype">Hype</option>
            <option value="ironico">Ironico</option>
            <option value="motivazionale">Motivazionale</option>
            <option value="misterioso">Misterioso</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ margin: 0 }}>Caption</label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleGenerate}>
            ✨ Genera testo
          </button>
        </div>
        <textarea value={form.caption} onChange={(e) => update('caption', e.target.value)} />
      </div>

      <div className="form-group">
        <label>Hashtag</label>
        <input value={form.hashtags} onChange={(e) => update('hashtags', e.target.value)} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <MediaPicker value={media} onChange={setMedia} />
        </div>
        <div className="form-group">
          <label>Data e ora pubblicazione</label>
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => update('scheduledAt', e.target.value)}
          />
        </div>
      </div>

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Salvataggio...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
