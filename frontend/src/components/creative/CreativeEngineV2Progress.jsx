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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatBar(percent) {
  const filled = Math.round((percent / 100) * 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
}

/**
 * Client-side progress UX for Creative Engine V2.
 * Does not call APIs or change generation logic.
 */
export default function CreativeEngineV2Progress({ active, succeeded = false }) {
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
        // Soft crawl 92% → 97% while backend still working
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

      rafRef.current = window.setTimeout(tick, 80);
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

  if (!active && !showSuccess) return null;

  return (
    <div className={`cev2-progress${showSuccess ? ' cev2-progress--success' : ''}`} role="status" aria-live="polite">
      {showSuccess ? (
        <div className="cev2-success">
          <div className="cev2-success-burst" aria-hidden="true" />
          <p className="cev2-success-title">✔ Creative completato</p>
          <p className="cev2-success-sub">Pacchetto pronto</p>
        </div>
      ) : (
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
              <div
                className="cev2-bar-fill"
                style={{ width: `${percent}%` }}
              />
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
    </div>
  );
}
