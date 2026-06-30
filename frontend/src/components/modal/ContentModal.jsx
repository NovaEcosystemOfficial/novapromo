import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { PROJECTS, CONTENT_TYPES, TONES, TOPIC_EXAMPLES } from '../../constants/projects.js';
import { useContentModal } from '../../context/ContentModalContext.jsx';
import { useBilling } from '../../context/BillingContext.jsx';
import { isTikTokEnabled } from '../../lib/features.js';
import MediaPicker, { appendMediaToFormData } from '../MediaPicker.jsx';
import PremiumLock from '../ai/PremiumLock.jsx';
import '../../styles/modal.css';
import '../../styles/premium.css';

const ALL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'both', label: 'Entrambi', icon: '✦' },
];

const VARIANT_LABELS = {
  instagram_post: 'Instagram Post',
  instagram_story: 'Instagram Story',
  facebook_post: 'Facebook Post',
  linkedin_post: 'LinkedIn Post',
  twitter_post: 'X / Twitter',
};

function getPlatforms() {
  if (isTikTokEnabled()) return ALL_PLATFORMS;
  return ALL_PLATFORMS.filter((p) => p.id === 'instagram');
}

const STEPS = ['Progetto', 'Piattaforma', 'Tipo', 'Tono', 'Argomento'];

function normalizeAiPack(pack) {
  return {
    caption: pack.caption || '',
    hashtags: pack.hashtags || '',
    cta: pack.cta || '',
    reelIdea: pack.reelIdea || '',
    overlayTitle: pack.caption?.slice(0, 28) || '',
    carouselSlides: pack.carouselSlides || [],
    storyText: pack.storyText || '',
    platformVariants: pack.platformVariants || {},
    aiGenerated: true,
    generationId: pack.generationId,
  };
}

export default function ContentModal() {
  const { isOpen, prefill, closeModal } = useContentModal();
  const navigate = useNavigate();
  const { billing, refreshBilling } = useBilling();

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('wizard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLock, setAiLock] = useState(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [sourceMode, setSourceMode] = useState('template');

  const [form, setForm] = useState({
    project: '',
    platform: 'instagram',
    contentType: 'post',
    tone: 'professionale',
    topic: '',
  });

  const [generated, setGenerated] = useState(null);
  const [savedPostId, setSavedPostId] = useState(null);
  const [media, setMedia] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setPhase('wizard');
      setError('');
      setAiLock(null);
      setGenerated(null);
      setSavedPostId(null);
      setMedia(null);
      setShowSchedule(false);
      setScheduleAt('');
      setSourceMode('template');
      setForm({
        project: prefill?.project || '',
        platform: prefill?.platform || 'instagram',
        contentType: prefill?.contentType || 'post',
        tone: 'professionale',
        topic: prefill?.topic || '',
      });
    }
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const availableTypes = CONTENT_TYPES.filter(
    (t) => t.platforms.includes(form.platform)
  );

  const handleAiError = (err) => {
    if (err.code === 'AI_NOT_CONFIGURED' || err.code === 'AI_CREDITS_EXHAUSTED' || err.code === 'BUSINESS_NOT_ACTIVE' || err.status === 403 || err.status === 402) {
      setAiLock({ reason: err.message, code: err.code });
      setError('');
    } else {
      setError(err.message);
      setAiLock(null);
    }
  };

  const handleGenerate = async () => {
    setError('');
    setAiLock(null);
    setLoading(true);
    setSourceMode('template');
    try {
      const result = await api.generateContent(form);
      setGenerated(result);
      setPhase('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    setError('');
    setAiLock(null);
    setLoading(true);
    setSourceMode('ai');
    try {
      const pack = await api.aiGenerateContentPack(form);
      setGenerated(normalizeAiPack(pack));
      setPhase('result');
      await refreshBilling();
    } catch (err) {
      handleAiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransformPlatforms = async () => {
    if (!generated?.caption) return;
    setError('');
    setAiLock(null);
    setLoading(true);
    try {
      const result = await api.aiTransformContent({
        ...form,
        sourceText: [generated.caption, generated.hashtags].filter(Boolean).join('\n\n'),
      });
      setGenerated((g) => ({
        ...g,
        platformVariants: { ...g.platformVariants, ...result.platformVariants },
      }));
      await refreshBilling();
    } catch (err) {
      handleAiError(err);
    } finally {
      setLoading(false);
    }
  };

  const platforms = getPlatforms();

  const savePostWithMedia = async (scheduledAt = null) => {
    if (savedPostId) {
      if (scheduledAt) return api.schedulePost(savedPostId, scheduledAt);
      return { id: savedPostId };
    }

    const payload = {
      ...form,
      caption: generated?.caption,
      hashtags: generated?.hashtags,
      cta: generated?.cta,
      reelIdea: generated?.reelIdea,
      overlayTitle: generated?.overlayTitle,
      scheduledAt: scheduledAt || null,
    };

    const needsMedia = form.platform === 'instagram' || form.platform === 'both';
    if (needsMedia && !media) {
      const post = await api.createPost(payload);
      setSavedPostId(post.id);
      return post;
    }

    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v != null && v !== '') fd.append(k, v);
    });
    if (scheduledAt) fd.append('scheduledAt', scheduledAt);
    appendMediaToFormData(fd, media);
    const post = await api.createDraft(fd);
    setSavedPostId(post.id);
    return post;
  };

  const handleDraft = async () => {
    setLoading(true);
    setError('');
    try {
      await savePostWithMedia();
      closeModal();
      navigate('/drafts');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleAt) {
      setShowSchedule(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const post = await savePostWithMedia(new Date(scheduleAt).toISOString());
      if (!savedPostId && post.id) await api.schedulePost(post.id, new Date(scheduleAt).toISOString());
      closeModal();
      navigate('/calendar');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    try {
      const needsMedia = form.platform === 'instagram' || form.platform === 'both';
      if (needsMedia && !media && !savedPostId) {
        setError('Instagram richiede un\'immagine o video. Aggiungi media prima di pubblicare.');
        setLoading(false);
        return;
      }

      let postId = savedPostId;
      if (!postId) {
        const post = await savePostWithMedia();
        postId = post.id;
      }
      await api.publishPost(postId);
      closeModal();
      navigate('/history');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!form.project;
    if (step === 4) return !!form.topic.trim();
    return true;
  };

  const aiAvailable = billing?.aiAvailable;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>
              {phase === 'result'
                ? sourceMode === 'ai'
                  ? 'AI Studio — Contenuto generato'
                  : 'Contenuto generato'
                : 'Nuovo contenuto'}
            </h2>
            {phase === 'wizard' && (
              <p className="modal-sub">Passo {step + 1} di {STEPS.length} — {STEPS[step]}</p>
            )}
            {sourceMode === 'ai' && phase === 'result' && (
              <p className="modal-sub">
                Crediti AI: {billing?.aiCreditsUsed ?? 0}/{billing?.aiCreditsLimit ?? 3}
              </p>
            )}
          </div>
          <button type="button" className="modal-close" onClick={closeModal} aria-label="Chiudi">×</button>
        </div>

        {phase === 'wizard' && (
          <div className="modal-steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`modal-step-dot${i <= step ? ' active' : ''}${i === step ? ' current' : ''}`} />
            ))}
          </div>
        )}

        {error && <div className="alert alert-error modal-alert">{error}</div>}
        {aiLock && <PremiumLock reason={aiLock.reason} code={aiLock.code} compact />}

        <div className="modal-body">
          {phase === 'wizard' && step === 0 && (
            <div className="modal-grid">
              {PROJECTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`modal-chip${form.project === p.id ? ' selected' : ''}`}
                  style={{ '--chip-color': p.color, '--chip-rgb': p.colorRgb }}
                  onClick={() => update('project', p.id)}
                >
                  <span className="modal-chip-dot" />
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 1 && (
            <div className="modal-grid modal-grid--3">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`modal-card-select${form.platform === p.id ? ' selected' : ''}`}
                  onClick={() => {
                    const types = CONTENT_TYPES.filter((t) => t.platforms.includes(p.id));
                    const nextType = types.find((t) => t.id === form.contentType)
                      ? form.contentType
                      : types[0]?.id || 'post';
                    setForm((f) => ({ ...f, platform: p.id, contentType: nextType }));
                  }}
                >
                  <span className="modal-card-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 2 && (
            <div className="modal-grid">
              {availableTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`modal-chip modal-chip--type${form.contentType === t.id ? ' selected' : ''}`}
                  onClick={() => update('contentType', t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 3 && (
            <div className="modal-grid">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`modal-chip${form.tone === t.id ? ' selected' : ''}`}
                  onClick={() => update('tone', t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 4 && (
            <div className="modal-topic">
              <label>Argomento del contenuto</label>
              <input
                value={form.topic}
                onChange={(e) => update('topic', e.target.value)}
                placeholder="Es. NovaDocs 1.1, Cloud Sync, AI Locale..."
                autoFocus
              />
              <div className="modal-examples">
                {TOPIC_EXAMPLES.map((ex) => (
                  <button key={ex} type="button" className="modal-example-tag" onClick={() => update('topic', ex)}>
                    {ex}
                  </button>
                ))}
              </div>
              <div className="ai-generate-row">
                <button
                  type="button"
                  className="btn btn-primary modal-generate-btn"
                  onClick={handleGenerate}
                  disabled={!form.topic.trim() || loading}
                >
                  {loading && sourceMode === 'template' ? 'Generazione...' : 'Genera (template)'}
                </button>
                <button
                  type="button"
                  className="btn btn-ai modal-generate-btn"
                  onClick={handleAiGenerate}
                  disabled={!form.topic.trim() || loading || !aiAvailable}
                  title={!aiAvailable ? billing?.aiLockReason : 'Genera con OpenAI'}
                >
                  {loading && sourceMode === 'ai' ? 'AI in corso...' : '✦ Genera con AI'}
                </button>
              </div>
              {!aiAvailable && billing && (
                <PremiumLock reason={billing.aiLockReason} code={billing.aiLockCode} compact />
              )}
            </div>
          )}

          {phase === 'result' && generated && (
            <div className="modal-result">
              <div className="modal-result-grid">
                <ResultField label="Caption" value={generated.caption} />
                <ResultField label="Hashtag" value={generated.hashtags} />
                <ResultField label="Idea Reel" value={generated.reelIdea} multiline />
                <ResultField label="CTA" value={generated.cta} />
                {generated.storyText && (
                  <ResultField label="Story" value={generated.storyText} multiline />
                )}
                {generated.overlayTitle && (
                  <ResultField label="Titolo sovrapposto" value={generated.overlayTitle} highlight />
                )}
              </div>

              {generated.carouselSlides?.length > 0 && (
                <div className="ai-result-section">
                  <p className="modal-result-label">Slide carosello</p>
                  <ol className="premium-ai-list">
                    {generated.carouselSlides.map((slide, i) => (
                      <li key={i}>
                        <ResultField label={`Slide ${i + 1}`} value={slide} multiline />
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {generated.platformVariants && Object.keys(generated.platformVariants).length > 0 && (
                <div className="ai-result-section ai-platform-variants">
                  <p className="modal-result-label">Varianti piattaforma</p>
                  {Object.entries(generated.platformVariants).map(([key, text]) =>
                    text ? (
                      <ResultField key={key} label={VARIANT_LABELS[key] || key} value={text} multiline />
                    ) : null
                  )}
                </div>
              )}

              {(form.platform === 'instagram' || form.platform === 'both') && (
                <MediaPicker value={media} onChange={setMedia} label="Media per Instagram (obbligatorio per pubblicare)" />
              )}

              {showSchedule && (
                <div className="modal-schedule">
                  <label>Data e ora pubblicazione</label>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                  />
                </div>
              )}

              <div className="modal-result-actions">
                <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={loading}>
                  Pubblica subito
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleSchedule} disabled={loading}>
                  Programma
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleDraft} disabled={loading}>
                  Salva bozza
                </button>
                {aiAvailable && (
                  <button type="button" className="btn btn-ai" onClick={handleTransformPlatforms} disabled={loading}>
                    Trasforma per altre piattaforme
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={sourceMode === 'ai' ? handleAiGenerate : handleGenerate}
                  disabled={loading}
                >
                  Rigenera
                </button>
              </div>
            </div>
          )}
        </div>

        {phase === 'wizard' && step < 4 && (
          <div className="modal-footer">
            {step > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
                Indietro
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
            >
              Avanti
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setPhase('wizard')}>
              ← Modifica
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultField({ label, value, multiline, highlight }) {
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`modal-result-field${highlight ? ' highlight' : ''}`}>
      <span className="modal-result-label">
        {label}
        {value && (
          <button type="button" className="modal-result-copy" onClick={copy}>
            Copia
          </button>
        )}
      </span>
      <div className={`modal-result-value${multiline ? ' multiline' : ''}`}>{value}</div>
    </div>
  );
}
