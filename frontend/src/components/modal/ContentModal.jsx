import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { CONTENT_TYPES, TONES, TOPIC_EXAMPLES } from '../../constants/projects.js';
import { useContentModal } from '../../context/ContentModalContext.jsx';
import { useBilling } from '../../context/BillingContext.jsx';
import { useBrandProjects, CUSTOM_PROJECT_ID, resolveProjectLabel } from '../../hooks/useBrandProjects.js';
import ProjectPicker from '../generator/ProjectPicker.jsx';
import { isTikTokEnabled } from '../../lib/features.js';
import { isFacebookPublishReady, isFacebookPublishPending, FACEBOOK_PUBLISH_PENDING_UI_MESSAGE } from '../../lib/facebookStatus.js';
import MediaPicker, { appendMediaToFormData } from '../MediaPicker.jsx';
import PremiumLock from '../ai/PremiumLock.jsx';
import '../../styles/modal.css';
import '../../styles/premium.css';

const ALL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'multi', label: 'Entrambi', icon: '✦' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'both', label: 'IG + TikTok', icon: '◇' },
];

const VARIANT_LABELS = {
  instagram_post: 'Instagram Post',
  instagram_story: 'Instagram Story',
  facebook_post: 'Facebook Post',
  linkedin_post: 'LinkedIn Post',
  twitter_post: 'X / Twitter',
};

function platformNeedsMedia(platform) {
  return platform === 'instagram' || platform === 'facebook' || platform === 'multi' || platform === 'both';
}

function getPlatforms() {
  if (isTikTokEnabled()) return ALL_PLATFORMS;
  return ALL_PLATFORMS.filter((p) => ['instagram', 'facebook', 'multi'].includes(p.id));
}

const ALL_STEPS = ['Progetto', 'Piattaforma', 'Tipo', 'Tono', 'Argomento'];

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
  const [brandContext, setBrandContext] = useState(null);
  const [sourceMode, setSourceMode] = useState('template');

  const [intent, setIntent] = useState('manual');
  const { brands, loading: brandsLoading } = useBrandProjects();

  const [form, setForm] = useState({
    brandId: 'nova-promo',
    project: '',
    customProject: '',
    platform: 'instagram',
    contentType: 'post',
    tone: 'professionale',
    topic: '',
  });

  const [generated, setGenerated] = useState(null);
  const [savedPostId, setSavedPostId] = useState(null);
  const [media, setMedia] = useState(null);
  const [integrations, setIntegrations] = useState({});

  const buildFormPayload = () => ({
    ...form,
    project: resolveProjectLabel({
      brandId: form.brandId,
      project: form.project,
      customProject: form.customProject,
      brands,
    }),
  });

  const usesBrandTone = Boolean(brandContext?.hasProfile && brandContext?.toneOfVoice?.length);
  const steps = usesBrandTone
    ? ALL_STEPS.filter((s) => s !== 'Tono')
    : ALL_STEPS;

  useEffect(() => {
    if (!isOpen) return;

    api.getBrandAiContext()
      .then(setBrandContext)
      .catch(() => setBrandContext(null));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const nextIntent = prefill?.intent || 'manual';
      setStep(0);
      setPhase('wizard');
      setError('');
      setAiLock(null);
      setGenerated(null);
      setSavedPostId(null);
      setMedia(null);
      setShowSchedule(false);
      setScheduleAt('');
      setSourceMode(nextIntent === 'ai' ? 'ai' : 'template');
      setIntent(nextIntent);
      setIntegrations({});
      setForm({
        brandId: prefill?.brandId || 'nova-promo',
        project: prefill?.project || '',
        customProject: prefill?.customProject || '',
        platform: prefill?.platform || 'instagram',
        contentType: prefill?.contentType || 'post',
        tone: 'professionale',
        topic: prefill?.topic || '',
      });
      api.getIntegrationsStatus()
        .then(setIntegrations)
        .catch(() => setIntegrations({}));
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
      const payload = buildFormPayload();
      if (usesBrandTone) {
        delete payload.tone;
      }
      const result = await api.generateContent(payload);
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
      const pack = await api.aiGenerateContentPack(buildFormPayload());
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
        ...buildFormPayload(),
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
  const fbIntegration = integrations.facebook || {};
  const fbPublishReady = isFacebookPublishReady(fbIntegration);
  const fbPublishPending = isFacebookPublishPending(fbIntegration);
  const fbOnlyBlocked = form.platform === 'facebook' && !fbPublishReady;
  const multiFbPending = form.platform === 'multi' && fbPublishPending;

  const savePostWithMedia = async (scheduledAt = null) => {
    if (savedPostId) {
      if (scheduledAt) return api.schedulePost(savedPostId, scheduledAt);
      return { id: savedPostId };
    }

    const payload = {
      ...buildFormPayload(),
      caption: generated?.caption,
      hashtags: generated?.hashtags,
      cta: generated?.cta,
      reelIdea: generated?.reelIdea,
      overlayTitle: generated?.overlayTitle,
      scheduledAt: scheduledAt || null,
    };

    const needsMedia = platformNeedsMedia(form.platform);
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
      if (form.platform === 'facebook' && !fbPublishReady) {
        setError(
          'Pubblicazione Facebook non disponibile: permesso pages_manage_posts in attesa da Meta (Advanced Access / App Review). Vai su Account per i dettagli.'
        );
        setLoading(false);
        return;
      }

      const needsMedia = platformNeedsMedia(form.platform);
      if (needsMedia && !media && !savedPostId) {
        const label = form.platform === 'facebook'
          ? 'Facebook richiede un\'immagine. Aggiungi media prima di pubblicare.'
          : form.platform === 'multi'
            ? 'Instagram + Facebook richiedono un\'immagine. Aggiungi media prima di pubblicare.'
            : 'Instagram richiede un\'immagine o video. Aggiungi media prima di pubblicare.';
        setError(label);
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

  const currentStepId = steps[step];

  const canNext = () => {
    if (currentStepId === 'Progetto') {
      if (!form.brandId) return false;
      if (form.brandId === CUSTOM_PROJECT_ID) return form.customProject.trim().length > 1;
      return true;
    }
    if (currentStepId === 'Argomento') return !!form.topic.trim();
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
                : intent === 'ai'
                  ? 'AI Studio testo'
                  : 'Nuovo contenuto manuale'}
            </h2>
            {phase === 'wizard' && (
              <p className="modal-sub">
                Passo {step + 1} di {steps.length} — {currentStepId}
                {usesBrandTone && (
                  <span className="modal-brand-hint"> · Tono da Brand Intelligence</span>
                )}
              </p>
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
            {steps.map((s, i) => (
              <div key={s} className={`modal-step-dot${i <= step ? ' active' : ''}${i === step ? ' current' : ''}`} />
            ))}
          </div>
        )}

        {error && <div className="alert alert-error modal-alert">{error}</div>}
        {fbOnlyBlocked && phase === 'wizard' && step === 1 && (
          <div className="alert alert-warning modal-alert">{FACEBOOK_PUBLISH_PENDING_UI_MESSAGE}</div>
        )}
        {multiFbPending && phase === 'wizard' && step === 1 && (
          <div className="alert alert-info modal-alert">
            Modalità Entrambi: Instagram verrà pubblicato; Facebook resta in attesa permesso Meta finché non approvi pages_manage_posts.
          </div>
        )}
        {aiLock && <PremiumLock reason={aiLock.reason} code={aiLock.code} compact />}

        <div className="modal-body">
          {phase === 'wizard' && currentStepId === 'Progetto' && (
            <ProjectPicker
              brands={brands}
              loading={brandsLoading}
              brandId={form.brandId}
              customProject={form.customProject}
              onSelectBrand={(id, name) => setForm((f) => ({
                ...f,
                brandId: id,
                project: id === CUSTOM_PROJECT_ID ? '' : (name || ''),
                customProject: id === CUSTOM_PROJECT_ID ? f.customProject : '',
              }))}
              onCustomProjectChange={(value) => setForm((f) => ({ ...f, customProject: value, project: value }))}
            />
          )}

          {phase === 'wizard' && currentStepId === 'Piattaforma' && (
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

          {phase === 'wizard' && currentStepId === 'Tipo' && (
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

          {phase === 'wizard' && currentStepId === 'Tono' && (
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

          {phase === 'wizard' && currentStepId === 'Argomento' && (
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
                {intent !== 'ai' && (
                  <button
                    type="button"
                    className="btn btn-primary modal-generate-btn"
                    onClick={handleGenerate}
                    disabled={!form.topic.trim() || loading}
                  >
                    {loading && sourceMode === 'template' ? 'Generazione...' : 'Genera (template)'}
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn-ai modal-generate-btn${intent === 'ai' ? ' modal-generate-btn--solo' : ''}`}
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
              {generated.brandApplied && (
                <p className="modal-brand-banner">🧠 Contenuto generato con Brand Intelligence</p>
              )}
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

              {platformNeedsMedia(form.platform) && (
                <MediaPicker
                  value={media}
                  onChange={setMedia}
                  label={
                    form.platform === 'facebook'
                      ? 'Immagine per Facebook (obbligatoria quando la pubblicazione è attiva)'
                      : form.platform === 'multi'
                        ? 'Immagine per Instagram (e Facebook quando disponibile)'
                        : 'Media per Instagram (obbligatorio per pubblicare)'
                  }
                />
              )}

              {fbOnlyBlocked && (
                <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                  {FACEBOOK_PUBLISH_PENDING_UI_MESSAGE}
                </div>
              )}
              {multiFbPending && (
                <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                  Con &quot;Entrambi&quot;, NovaPromo pubblicherà su Instagram. Facebook verrà saltato finché Meta non concede pages_manage_posts.
                </div>
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
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePublish}
                  disabled={loading || fbOnlyBlocked}
                  title={fbOnlyBlocked ? 'Pubblicazione Facebook in attesa permesso Meta' : undefined}
                >
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

        {phase === 'wizard' && currentStepId !== 'Argomento' && (
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
