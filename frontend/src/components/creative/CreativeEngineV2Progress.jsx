import { useEffect, useMemo, useRef, useState } from 'react';

const PIPELINE_STEPS = [
  { id: 'brand', label: 'Analisi del brand' },
  { id: 'concept', label: 'Scelta del concept creativo' },
  { id: 'layout', label: 'Pianificazione layout' },
  { id: 'prompt', label: 'Generazione prompt professionale' },
  { id: 'image', label: 'Generazione immagine AI' },
  { id: 'quality', label: 'Controllo qualità' },
  { id: 'caption', label: 'Preparazione caption' },
  { id: 'hashtags', label: 'Creazione hashtag' },
  { id: 'assemble', label: 'Assemblaggio progetto' },
  { id: 'optimize', label: 'Ottimizzazione finale' },
];

const DYNAMIC_MESSAGES = [
  'Analizzo il tuo brand...',
  'Sto studiando il layout migliore...',
  'Scelgo la palette colori...',
  'Definisco il concept creativo...',
  'Costruisco un prompt professionale...',
  'Genero una fotografia realistica...',
  'Controllo eventuali difetti...',
  'Preparo le varianti A/B...',
  'Allineo caption e CTA...',
  'Seleziono gli hashtag migliori...',
  'Sto rifinendo il risultato...',
  'Controllo qualità in corso...',
  'Quasi fatto...',
];

const WAITING_MESSAGES = [
  'Sto rifinendo il risultato...',
  'Controllo qualità in corso...',
  'Ultimi ritocchi sul creativo...',
  'Ottimizzo coerenza brand...',
];

/** Approximate step durations (ms) — UX only, independent of backend. */
const STEP_DURATIONS_MS = [2200, 2800, 2400, 3200, 9000, 3500, 2800, 2200, 2600, 3000];

const PREVIEW_TITLE = 'La tua creatività prende forma';
const PREVIEW_CAPTION = 'Un messaggio chiaro, premium e coerente con il brand. Pronto per il feed.';
const PREVIEW_HASHTAGS = '#NovaPromo  #CreativeAI  #BrandDesign  #SocialReady';

const READY_ITEMS = [
  'Immagine pronta',
  'Caption pronta',
  'Hashtag pronti',
  'Story pronta',
  'Varianti A/B pronte',
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatBar(percent) {
  const filled = Math.round((percent / 100) * 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
}

function typeSlice(text, progress) {
  const n = Math.floor(clamp(progress, 0, 1) * text.length);
  return text.slice(0, n);
}

/**
 * Resolve live-preview stage from pipeline step index.
 * Pure UI mapping — no generation logic.
 */
function resolvePreviewStage(stepIndex, stepProgress, waiting, showSuccess) {
  if (showSuccess) return { stage: 'complete', clarity: 1, copyProgress: 1 };
  if (waiting) return { stage: 'refine', clarity: 0.92, copyProgress: 1 };

  // brand, concept
  if (stepIndex < 2) return { stage: 'skeleton', clarity: 0, copyProgress: 0 };

  // layout in progress
  if (stepIndex === 2) {
    return {
      stage: stepProgress > 0.55 ? 'layout' : 'skeleton',
      clarity: 0.15,
      copyProgress: 0,
    };
  }

  // prompt — layout preview stays
  if (stepIndex === 3) return { stage: 'layout', clarity: 0.22, copyProgress: 0 };

  // image generation — progressive clarity
  if (stepIndex === 4) {
    const clarity = 0.25 + stepProgress * 0.65;
    return { stage: 'image', clarity, copyProgress: 0 };
  }

  // quality
  if (stepIndex === 5) return { stage: 'quality', clarity: 0.95, copyProgress: 0.05 };

  // caption
  if (stepIndex === 6) {
    return { stage: 'caption', clarity: 0.97, copyProgress: 0.15 + stepProgress * 0.55 };
  }

  // hashtags
  if (stepIndex === 7) {
    return { stage: 'hashtags', clarity: 0.98, copyProgress: 0.7 + stepProgress * 0.25 };
  }

  // assemble / optimize
  return { stage: 'assemble', clarity: 1, copyProgress: 1 };
}

function LivePreviewPanel({
  stage,
  clarity,
  copyProgress,
  showSuccess,
  onOpenContent,
}) {
  const blurPx = showSuccess ? 0 : Math.max(0, (1 - clarity) * 18);
  const scale = 0.97 + clarity * 0.03;
  const titleText = typeSlice(PREVIEW_TITLE, Math.min(1, copyProgress / 0.45));
  const captionText = typeSlice(PREVIEW_CAPTION, clamp((copyProgress - 0.25) / 0.45, 0, 1));
  const hashtagText = typeSlice(PREVIEW_HASHTAGS, clamp((copyProgress - 0.7) / 0.3, 0, 1));
  const showCopy = stage === 'caption' || stage === 'hashtags' || stage === 'assemble' || stage === 'refine' || showSuccess;
  const showQualityBadge = stage === 'quality';

  return (
    <aside className="cev2-live" aria-label="Anteprima Live">
      <div className="cev2-live-header">
        <span className="cev2-live-kicker">Anteprima Live</span>
        {showQualityBadge && !showSuccess && (
          <span className="cev2-quality-badge">✔ Controllo qualità</span>
        )}
      </div>

      <div className={`cev2-live-stage cev2-live-stage--${showSuccess ? 'complete' : stage}`}>
        {stage === 'skeleton' && !showSuccess && (
          <div className="cev2-skeleton">
            <p className="cev2-skeleton-label">Generazione anteprima...</p>
            <div className="cev2-skeleton-frame">
              <div className="cev2-skel cev2-skel--hero" />
              <div className="cev2-skel cev2-skel--line" />
              <div className="cev2-skel cev2-skel--line cev2-skel--short" />
              <div className="cev2-skel cev2-skel--cta" />
            </div>
          </div>
        )}

        {!showSuccess && stage !== 'skeleton' && (
          <div
            className="cev2-preview-canvas"
            style={{
              filter: `blur(${blurPx.toFixed(2)}px)`,
              transform: `scale(${scale.toFixed(3)})`,
              opacity: 0.45 + clarity * 0.55,
            }}
          >
            <div className={`cev2-layout-mock${stage === 'layout' ? ' cev2-layout-mock--wire' : ''}`}>
              <div className="cev2-layout-hero">
                <div className="cev2-layout-glow" />
                <div className="cev2-layout-subject" />
              </div>
              <div className="cev2-layout-meta">
                <div className="cev2-layout-title-bar" />
                <div className="cev2-layout-sub-bar" />
                <div className="cev2-layout-cta-bar" />
              </div>
            </div>
            {(stage === 'image' || stage === 'quality' || stage === 'caption' || stage === 'hashtags' || stage === 'assemble' || stage === 'refine') && (
              <div
                className="cev2-image-veil"
                style={{ opacity: clamp(1 - clarity, 0, 0.75) }}
              />
            )}
          </div>
        )}

        {showCopy && !showSuccess && (
          <div className="cev2-live-copy">
            <p className="cev2-live-title">{titleText || ' '}</p>
            <p className="cev2-live-caption">{captionText || ' '}</p>
            {(stage === 'hashtags' || stage === 'assemble' || stage === 'refine') && (
              <p className="cev2-live-hashtags">{hashtagText || ' '}</p>
            )}
          </div>
        )}

        {showSuccess && (
          <div className="cev2-ready-card">
            <div className="cev2-ready-burst" aria-hidden="true" />
            <p className="cev2-ready-heading">✔ Creative completato</p>
            <ul className="cev2-ready-list">
              {READY_ITEMS.map((item, i) => (
                <li
                  key={item}
                  className="cev2-ready-item"
                  style={{ animationDelay: `${0.08 + i * 0.1}s` }}
                >
                  ✔ {item}
                </li>
              ))}
            </ul>
            {typeof onOpenContent === 'function' && (
              <button
                type="button"
                className="btn btn-ai cev2-open-btn"
                onClick={onOpenContent}
              >
                Apri contenuto
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * Client-side progress + Anteprima Live UX for Creative Engine V2.
 * Does not call APIs or change generation logic.
 */
export default function CreativeEngineV2Progress({
  active,
  succeeded = false,
  onOpenContent,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [displayPercent, setDisplayPercent] = useState(0);
  const startedAt = useRef(Date.now());
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active && !succeeded) {
      setStepIndex(0);
      setStepProgress(0);
      setMessageIndex(0);
      setWaiting(false);
      setShowSuccess(false);
      setDisplayPercent(0);
      return undefined;
    }

    if (succeeded) {
      setShowSuccess(true);
      setWaiting(false);
      setStepIndex(PIPELINE_STEPS.length);
      setStepProgress(1);
      setDisplayPercent(100);
      return undefined;
    }

    startedAt.current = Date.now();
    setStepIndex(0);
    setStepProgress(0);
    setWaiting(false);
    setShowSuccess(false);
    setDisplayPercent(1);

    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      let acc = 0;
      let idx = 0;
      let local = 0;

      for (let i = 0; i < STEP_DURATIONS_MS.length; i += 1) {
        const dur = STEP_DURATIONS_MS[i];
        if (elapsed < acc + dur) {
          idx = i;
          local = (elapsed - acc) / dur;
          break;
        }
        acc += dur;
        idx = i + 1;
        local = 1;
      }

      if (idx >= PIPELINE_STEPS.length) {
        setStepIndex(PIPELINE_STEPS.length);
        setStepProgress(1);
        setWaiting(true);
        const over = elapsed - STEP_DURATIONS_MS.reduce((a, b) => a + b, 0);
        const crawl = 92 + (1 - Math.exp(-over / 18000)) * 5;
        setDisplayPercent(clamp(crawl, 92, 97));
      } else {
        setStepIndex(idx);
        setStepProgress(clamp(local, 0, 1));
        setWaiting(false);
        const completedWeight = idx / PIPELINE_STEPS.length;
        const currentWeight = local / PIPELINE_STEPS.length;
        setDisplayPercent(clamp(Math.round((completedWeight + currentWeight) * 92), 1, 92));
      }

      rafRef.current = window.setTimeout(tick, 50);
    };

    tick();
    return () => {
      window.clearTimeout(rafRef.current);
    };
  }, [active, succeeded]);

  useEffect(() => {
    if (!active || succeeded) return undefined;
    const id = window.setInterval(() => {
      setMessageIndex((i) => i + 1);
    }, 2800);
    return () => window.clearInterval(id);
  }, [active, succeeded]);

  const percent = showSuccess ? 100 : displayPercent;
  const messagePool = waiting ? WAITING_MESSAGES : DYNAMIC_MESSAGES;
  const message = messagePool[messageIndex % messagePool.length];

  const stepsUi = useMemo(() => PIPELINE_STEPS.map((step, i) => {
    let status = 'pending';
    if (showSuccess || i < stepIndex) status = 'done';
    else if (i === stepIndex && !waiting) status = 'active';
    else if (waiting && i === PIPELINE_STEPS.length - 1) status = 'active';
    return { ...step, status };
  }), [stepIndex, waiting, showSuccess]);

  const preview = resolvePreviewStage(stepIndex, stepProgress, waiting, showSuccess);

  if (!active && !showSuccess) return null;

  return (
    <div
      className={`cev2-shell${showSuccess ? ' cev2-shell--success' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={`cev2-progress${showSuccess ? ' cev2-progress--success' : ''}`}>
        {!showSuccess && (
          <>
            <p className="cev2-progress-kicker">Nova Creative Engine V2</p>
            <p key={messageIndex} className="cev2-progress-message">{message}</p>

            <div className="cev2-bar-block">
              <div className="cev2-bar-ascii" aria-hidden="true">
                {formatBar(percent)}
                {' '}
                <strong>{percent}%</strong>
              </div>
              <div
                className={`cev2-bar-track${waiting ? ' cev2-bar-track--waiting' : ''}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                role="progressbar"
              >
                <div className="cev2-bar-fill" style={{ width: `${percent}%` }} />
                {waiting && <div className="cev2-bar-shimmer" aria-hidden="true" />}
              </div>
            </div>

            <ul className="cev2-steps">
              {stepsUi.map((s) => (
                <li key={s.id} className={`cev2-step cev2-step--${s.status}`}>
                  <span className="cev2-step-icon" aria-hidden="true">
                    {s.status === 'done' ? '✔' : s.status === 'active' ? '⏳' : '○'}
                  </span>
                  <span className="cev2-step-label">{s.label}</span>
                  {s.status === 'active' && (
                    <span className="cev2-step-pulse" style={{ width: `${Math.round(stepProgress * 100)}%` }} />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {showSuccess && (
          <div className="cev2-success cev2-success--compact">
            <div className="cev2-success-burst" aria-hidden="true" />
            <p className="cev2-success-title">✔ Creative completato</p>
            <p className="cev2-success-sub">Anteprima live pronta</p>
          </div>
        )}
      </div>

      <LivePreviewPanel
        stage={preview.stage}
        clarity={preview.clarity}
        copyProgress={preview.copyProgress}
        showSuccess={showSuccess}
        onOpenContent={onOpenContent}
      />
    </div>
  );
}
