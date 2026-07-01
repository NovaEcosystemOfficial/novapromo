import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useCreativeStudio } from '../../context/CreativeStudioContext.jsx';
import { useBilling } from '../../context/BillingContext.jsx';
import { useBrandProjects, CUSTOM_PROJECT_ID, resolveProjectLabel } from '../../hooks/useBrandProjects.js';
import ProjectPicker from '../generator/ProjectPicker.jsx';
import { isFacebookPublishReady, isFacebookPublishPending, FACEBOOK_PUBLISH_PENDING_UI_MESSAGE } from '../../lib/facebookStatus.js';
import PremiumLock from '../ai/PremiumLock.jsx';
import '../../styles/modal.css';
import '../../styles/premium.css';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'multi', label: 'Entrambi', icon: '✦' },
];

const FORMATS = [
  { id: 'square', label: 'Quadrato', sub: '1:1 · Feed' },
  { id: 'portrait', label: 'Portrait', sub: '4:5 · Feed' },
  { id: 'story', label: 'Story', sub: '9:16' },
  { id: 'reel', label: 'Reel', sub: '9:16 · Video' },
];

const STYLES = [
  { id: 'premium', label: 'Premium', sub: 'Elegante, scuro' },
  { id: 'minimal', label: 'Minimal', sub: 'Pulito, essenziale' },
  { id: 'tech', label: 'Tech', sub: 'Viola / arancione' },
  { id: 'cinematic', label: 'Cinematic', sub: 'Drammatico' },
];

const STEPS = ['Progetto', 'Piattaforma', 'Formato', 'Idea', 'Stile', 'Genera'];

export default function CreativeStudioModal() {
  const { isOpen, prefill, closeCreativeStudio } = useCreativeStudio();
  const navigate = useNavigate();
  const { billing, refreshBilling } = useBilling();
  const { brands, loading: brandsLoading } = useBrandProjects();

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('wizard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lock, setLock] = useState(null);
  const [pack, setPack] = useState(null);
  const [savedPostId, setSavedPostId] = useState(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [integrations, setIntegrations] = useState({});

  const [form, setForm] = useState({
    brandId: 'nova-promo',
    project: '',
    customProject: '',
    idea: '',
    platform: 'instagram',
    format: 'square',
    style: 'premium',
    includeImage: true,
    includeVideoPrompt: true,
  });

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setPhase('wizard');
      setError('');
      setLock(null);
      setPack(null);
      setSavedPostId(null);
      setShowSchedule(false);
      setScheduleAt('');
      setForm({
        brandId: prefill?.brandId || 'nova-promo',
        project: prefill?.project || '',
        customProject: prefill?.customProject || '',
        idea: prefill?.idea || prefill?.topic || '',
        platform: prefill?.platform || 'instagram',
        format: prefill?.format || 'square',
        style: prefill?.style || 'premium',
        includeImage: true,
        includeVideoPrompt: true,
      });
      api.getIntegrationsStatus().then(setIntegrations).catch(() => setIntegrations({}));
    }
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const costs = billing?.creativeStudioCreditCosts || {
    creativePackWithImage: 8,
    creativePackNoImage: 3,
    regenerateImage: 5,
  };

  const creativeAvailable = billing?.creativeStudioAvailable;
  const packCost = form.includeImage ? costs.creativePackWithImage : costs.creativePackNoImage;

  const fbIntegration = integrations.facebook || {};
  const fbPublishReady = isFacebookPublishReady(fbIntegration);
  const fbPublishPending = isFacebookPublishPending(fbIntegration);
  const fbOnlyBlocked = form.platform === 'facebook' && !fbPublishReady;

  const handleStudioError = (err) => {
    if (['AI_NOT_CONFIGURED', 'AI_CREDITS_EXHAUSTED', 'CREATIVE_STUDIO_PREMIUM_ONLY', 'BUSINESS_NOT_ACTIVE', 'CREATIVE_STUDIO_DAILY_LIMIT', 'CREATIVE_STUDIO_RATE_LIMIT'].includes(err.code) || err.status === 402 || err.status === 403 || err.status === 429) {
      setLock({ reason: err.message, code: err.code });
      setError('');
    } else {
      setError(err.message);
      setLock(null);
    }
  };

  const resolveBrandId = () => (
    form.brandId === CUSTOM_PROJECT_ID ? 'nova-ecosystem' : form.brandId
  );

  const buildPackBody = (opts = {}) => ({
    idea: form.idea,
    platform: form.platform,
    format: form.format,
    style: form.style,
    project: resolveProjectLabel({
      brandId: form.brandId,
      project: form.project,
      customProject: form.customProject,
      brands,
    }),
    includeImage: form.includeImage,
    includeVideoPrompt: form.includeVideoPrompt,
    brandId: resolveBrandId(),
    ...opts,
  });

  const runCreativePack = async (opts = {}) => {
    setLoading(true);
    setError('');
    setLock(null);
    try {
      const result = await api.aiCreativePack(buildPackBody(opts));
      setPack(result);
      setPhase('result');
      await refreshBilling();
    } catch (err) {
      handleStudioError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!pack?.imagePrompt) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.aiCreativePack(buildPackBody({
        includeImage: true,
        includeVideoPrompt: false,
        regenerateImage: true,
        imagePrompt: pack.imagePrompt,
        caption: pack.caption,
        hashtags: pack.hashtags,
        cta: pack.cta,
        videoPrompt: pack.videoPrompt,
        musicMood: pack.musicMood,
        visualStyle: pack.visualStyle,
        platformVariants: pack.platformVariants,
        videoScript: pack.videoScript,
      }));
      setPack((p) => ({ ...p, ...result }));
      await refreshBilling();
    } catch (err) {
      handleStudioError(err);
    } finally {
      setLoading(false);
    }
  };

  const savePost = async (scheduledAt = null) => {
    const projectLabel = resolveProjectLabel({
      brandId: form.brandId,
      project: form.project,
      customProject: form.customProject,
      brands,
    });
    const payload = {
      project: projectLabel,
      platform: form.platform,
      contentType: form.format === 'story' ? 'story' : form.format === 'reel' ? 'reel' : 'post',
      tone: 'professionale',
      topic: form.idea,
      caption: pack.caption,
      hashtags: pack.hashtags,
      cta: pack.cta,
      scheduledAt,
      mediaPublicUrl: pack.imageUrl || null,
      mediaMimeType: pack.imageUrl ? 'image/png' : null,
      mediaStoragePath: pack.storagePath || null,
    };

    if (!pack.imageUrl && (form.platform === 'instagram' || form.platform === 'facebook' || form.platform === 'multi')) {
      throw new Error('Immagine AI richiesta per pubblicare su Instagram/Facebook');
    }

    if (savedPostId) {
      if (scheduledAt) return api.schedulePost(savedPostId, scheduledAt);
      return { id: savedPostId };
    }

    const post = await api.createPost(payload);
    setSavedPostId(post.id);
    return post;
  };

  const handlePublish = async () => {
    if (fbOnlyBlocked) {
      setError('Pubblicazione Facebook non disponibile — permesso Meta in attesa.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const post = await savePost();
      await api.publishPost(post.id);
      closeCreativeStudio();
      navigate('/history');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDraft = async () => {
    setLoading(true);
    try {
      await savePost();
      closeCreativeStudio();
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
    try {
      await savePost(new Date(scheduleAt).toISOString());
      closeCreativeStudio();
      navigate('/calendar');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) {
      if (!form.brandId) return false;
      if (form.brandId === CUSTOM_PROJECT_ID) return form.customProject.trim().length > 1;
      return true;
    }
    if (step === 3) return form.idea.trim().length > 10;
    return true;
  };

  const projectLabel = resolveProjectLabel({
    brandId: form.brandId,
    project: form.project,
    customProject: form.customProject,
    brands,
  });

  return (
    <div className="modal-overlay" onClick={closeCreativeStudio}>
      <div className="modal-shell modal-shell--creative" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>
              {phase === 'result' ? 'Creative Studio PRO — Pacchetto pronto' : 'Creative Studio PRO'}
            </h2>
            <p className="modal-sub">
              {phase === 'wizard' && `Passo ${step + 1} di ${STEPS.length} — ${STEPS[step]}`}
              {phase === 'result' && billing && (
                <>Crediti: {billing.aiCreditsUsed}/{billing.aiCreditsLimit}</>
              )}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={closeCreativeStudio} aria-label="Chiudi">×</button>
        </div>

        {!creativeAvailable && billing && (
          <PremiumLock
            reason={billing.creativeStudioLockReason || 'Disponibile nel piano Premium'}
            code={billing.creativeStudioLockCode || 'CREATIVE_STUDIO_PREMIUM_ONLY'}
            compact
          />
        )}

        {phase === 'wizard' && (
          <div className="modal-steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`modal-step-dot${i <= step ? ' active' : ''}${i === step ? ' current' : ''}`} />
            ))}
          </div>
        )}

        {error && <div className="alert alert-error modal-alert">{error}</div>}
        {lock && <PremiumLock reason={lock.reason} code={lock.code} compact />}

        <div className="modal-body">
          {phase === 'wizard' && step === 0 && (
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

          {phase === 'wizard' && step === 1 && (
            <div className="modal-grid modal-grid--3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`modal-card-select${form.platform === p.id ? ' selected' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, platform: p.id }))}
                >
                  <span className="modal-card-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 2 && (
            <div className="modal-grid modal-grid--2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`modal-card-select${form.format === f.id ? ' selected' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, format: f.id }))}
                >
                  <span className="modal-card-icon">▣</span>
                  <span>{f.label}</span>
                  <small style={{ opacity: 0.7 }}>{f.sub}</small>
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 3 && (
            <div className="creative-idea-step">
              <label>Descrivi cosa vuoi creare</label>
              <textarea
                value={form.idea}
                onChange={(e) => setForm((f) => ({ ...f, idea: e.target.value }))}
                placeholder="Es. Annuncio NovaPromo con focus su autopublish Instagram/Facebook, tono professionale..."
                rows={5}
                autoFocus
              />
            </div>
          )}

          {phase === 'wizard' && step === 4 && (
            <div className="modal-grid modal-grid--2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`modal-card-select${form.style === s.id ? ' selected' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, style: s.id }))}
                >
                  <span>{s.label}</span>
                  <small style={{ opacity: 0.7 }}>{s.sub}</small>
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 5 && (
            <div className="creative-review-step">
              <p className="modal-result-label">Riepilogo</p>
              <ul className="creative-review-list">
                <li><strong>Progetto:</strong> {projectLabel || '—'}</li>
                <li><strong>Idea:</strong> {form.idea.slice(0, 120)}{form.idea.length > 120 ? '…' : ''}</li>
                <li><strong>Piattaforma:</strong> {form.platform}</li>
                <li><strong>Formato:</strong> {form.format}</li>
                <li><strong>Stile:</strong> {form.style}</li>
              </ul>
              <label className="creative-toggle">
                <input
                  type="checkbox"
                  checked={form.includeImage}
                  onChange={(e) => setForm((f) => ({ ...f, includeImage: e.target.checked }))}
                />
                Genera immagine AI ({costs.creativePackWithImage} crediti)
              </label>
              <label className="creative-toggle">
                <input
                  type="checkbox"
                  checked={form.includeVideoPrompt}
                  onChange={(e) => setForm((f) => ({ ...f, includeVideoPrompt: e.target.checked }))}
                />
                Includi prompt video professionale
              </label>
              <p className="creative-cost-hint">
                Costo: <strong>{packCost} crediti</strong>
                {!form.includeImage && ` · senza immagine ${costs.creativePackNoImage} crediti`}
              </p>
              <button
                type="button"
                className="btn btn-ai modal-generate-btn"
                onClick={() => runCreativePack()}
                disabled={loading || !creativeAvailable}
              >
                {loading ? 'Generazione pacchetto…' : '✦ Genera pacchetto creativo'}
              </button>
            </div>
          )}

          {phase === 'result' && pack && (
            <div className="modal-result creative-result">
              {pack.imageUrl && (
                <div className="creative-preview-image">
                  <img src={pack.imageUrl} alt="Anteprima generata" />
                  <p className="creative-preview-meta">{pack.socialFormat || form.format} · {pack.visualStyle}</p>
                </div>
              )}

              <div className="modal-result-grid">
                <Field label="Caption" value={pack.caption} />
                <Field label="Hashtag" value={pack.hashtags} />
                <Field label="CTA" value={pack.cta} />
                <Field label="Mood musica" value={pack.musicMood} />
                <Field label="Prompt video" value={pack.videoPrompt} multiline />
                <Field label="Prompt immagine" value={pack.imagePrompt} multiline />
              </div>

              {pack.videoScript?.scenes?.length > 0 && (
                <div className="ai-result-section">
                  <p className="modal-result-label">Scene reel (15s)</p>
                  <ol className="premium-ai-list">
                    {pack.videoScript.scenes.map((scene, i) => (
                      <li key={i}>
                        <Field label={scene.seconds || `Scene ${i + 1}`} value={[scene.visual, scene.overlayText, scene.camera].filter(Boolean).join(' · ')} multiline />
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {fbOnlyBlocked && (
                <div className="alert alert-warning">{FACEBOOK_PUBLISH_PENDING_UI_MESSAGE}</div>
              )}
              {form.platform === 'multi' && fbPublishPending && (
                <div className="alert alert-info">Con Entrambi, Instagram verrà pubblicato; Facebook se il permesso Meta è attivo.</div>
              )}

              {showSchedule && (
                <div className="modal-schedule">
                  <label>Data e ora</label>
                  <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                </div>
              )}

              <div className="modal-result-actions">
                <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={loading || fbOnlyBlocked || !pack.imageUrl}>
                  Pubblica
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleSchedule} disabled={loading}>
                  Programma
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleDraft} disabled={loading}>
                  Salva bozza
                </button>
                {pack.imageUrl && creativeAvailable && (
                  <button type="button" className="btn btn-ai" onClick={handleRegenerateImage} disabled={loading}>
                    Rigenera immagine ({costs.regenerateImage} cr.)
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => runCreativePack()} disabled={loading}>
                  Rigenera tutto
                </button>
              </div>
            </div>
          )}
        </div>

        {phase === 'wizard' && step < 5 && (
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
      </div>
    </div>
  );
}

function Field({ label, value, multiline }) {
  if (!value) return null;
  return (
    <div className="modal-result-field">
      <span className="modal-result-label">{label}</span>
      <div className={`modal-result-value${multiline ? ' multiline' : ''}`}>{value}</div>
    </div>
  );
}
