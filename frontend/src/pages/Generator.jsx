import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContentModal } from '../context/ContentModalContext.jsx';
import { useCreativeStudio } from '../context/CreativeStudioContext.jsx';
import { useBilling } from '../context/BillingContext.jsx';
import { api } from '../api/client.js';
import PremiumLock from '../components/ai/PremiumLock.jsx';
import '../styles/premium.css';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function Generator() {
  const { openModal } = useContentModal();
  const { openCreativeStudio } = useCreativeStudio();
  const { billing } = useBilling();

  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);

  useEffect(() => {
    api.getPosts({ status: 'draft' })
      .then((posts) => setDrafts((posts || []).slice(0, 6)))
      .catch(() => setDrafts([]))
      .finally(() => setDraftsLoading(false));
  }, []);

  const creativeAvailable = billing?.creativeStudioAvailable;

  return (
    <div className="generator-hub">
      <div className="page-header">
        <h2>Generatore</h2>
        <p>Scegli come creare il prossimo contenuto — ogni modalità ha il suo flusso dedicato.</p>
      </div>

      <div className="generator-hub__grid">
        <section className="generator-card">
          <div className="generator-card__icon" aria-hidden>✎</div>
          <h3>Crea post manuale</h3>
          <p>Wizard completo: progetto, piattaforma, tipo, tono e argomento. Template o bozza con media.</p>
          <button type="button" className="btn btn-primary" onClick={() => openModal({ intent: 'manual' })}>
            Nuovo post manuale
          </button>
        </section>

        <section className="generator-card">
          <div className="generator-card__icon" aria-hidden>✦</div>
          <h3>AI Studio testo</h3>
          <p>Genera caption, hashtag e CTA con l&apos;AI testuale (1 credito). Stesso wizard, focus su AI.</p>
          <button
            type="button"
            className="btn btn-ai"
            onClick={() => openModal({ intent: 'ai' })}
            disabled={!billing?.aiAvailable}
            title={billing?.aiLockReason || 'AI Studio'}
          >
            Apri AI Studio testo
          </button>
          {!billing?.aiAvailable && billing && (
            <PremiumLock reason={billing.aiLockReason} code={billing.aiLockCode} compact />
          )}
        </section>

        <section className={`generator-card${!creativeAvailable ? ' generator-card--locked' : ''}`}>
          <div className="generator-card__icon" aria-hidden>◆</div>
          <h3>Creative Studio PRO</h3>
          <p>Pacchetto creativo completo: testo, immagine AI, prompt video e anteprima pronta per pubblicare.</p>
          {creativeAvailable ? (
            <button type="button" className="btn btn-ai" onClick={() => openCreativeStudio()}>
              Apri Creative Studio PRO
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-ai" disabled>
                Apri Creative Studio PRO
              </button>
              {billing && (
                <PremiumLock
                  reason={billing.creativeStudioLockReason || 'Disponibile nel piano Premium'}
                  code={billing.creativeStudioLockCode || 'CREATIVE_STUDIO_PREMIUM_ONLY'}
                  compact
                />
              )}
            </>
          )}
        </section>

        <section className="generator-card generator-card--wide">
          <div className="generator-card__head">
            <div>
              <h3>Bozze recenti</h3>
              <p>Contenuti salvati non ancora pubblicati.</p>
            </div>
            <Link to="/drafts" className="generator-link">Vedi tutte →</Link>
          </div>

          {draftsLoading && <p className="generator-muted">Caricamento…</p>}
          {!draftsLoading && drafts.length === 0 && (
            <p className="generator-muted">Nessuna bozza. Crea un post o usa Creative Studio PRO.</p>
          )}
          {!draftsLoading && drafts.length > 0 && (
            <ul className="generator-recent-list">
              {drafts.map((post) => (
                <li key={post.id}>
                  <button
                    type="button"
                    className="generator-recent-item"
                    onClick={() => openModal({
                      intent: 'manual',
                      project: post.project,
                      platform: post.platform,
                      contentType: post.contentType,
                      topic: post.topic || post.caption?.slice(0, 80) || '',
                    })}
                  >
                    <span className="generator-recent-item__project">{post.project || 'Senza progetto'}</span>
                    <span className="generator-recent-item__caption">
                      {post.caption?.slice(0, 72) || post.topic || 'Bozza senza testo'}
                      {(post.caption?.length || 0) > 72 ? '…' : ''}
                    </span>
                    <span className="generator-recent-item__meta">{formatDate(post.createdAt || post.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
