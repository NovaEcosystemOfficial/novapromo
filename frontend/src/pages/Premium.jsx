import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBilling } from '../context/BillingContext.jsx';
import { PLAN_COMPARISON } from '../lib/plans.js';
import '../styles/premium.css';

export default function Premium() {
  const { billing, loading } = useBilling();

  if (loading) {
    return (
      <div className="premium-page">
        <div className="ndl-skeleton ndl-skeleton--header" />
      </div>
    );
  }

  const currentPlan = billing?.plan || 'free';

  return (
    <div className="premium-page">
      <header className="premium-page__header">
        <p className="premium-page__eyebrow">NovaPromo Premium</p>
        <h1>Piani e AI Studio</h1>
        <p className="premium-page__sub">
          Struttura pronta per pagamenti — attivazione manuale disponibile per test.
        </p>
      </header>

      <section className="premium-current ndl-panel">
        <div className="premium-current__row">
          <div>
            <p className="premium-current__label">Piano attuale</p>
            <h2 className="premium-current__plan">
              {billing?.planLabel || 'Free'}
              {billing?.isPremium && <span className="premium-badge">Premium</span>}
            </h2>
            <p className="premium-current__desc">{billing?.planDescription}</p>
          </div>
          <div className="premium-credits">
            <p className="premium-credits__label">Crediti AI questo mese</p>
            <p className="premium-credits__value">
              {billing?.aiCreditsUsed ?? 0}
              <span> / {billing?.aiCreditsLimit ?? 3}</span>
            </p>
            <div className="premium-credits__bar">
              <div
                className="premium-credits__fill"
                style={{
                  width: `${Math.min(100, ((billing?.aiCreditsUsed ?? 0) / (billing?.aiCreditsLimit || 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="premium-credits__remaining">
              {billing?.aiCreditsRemaining ?? 0} rimanenti
            </p>
          </div>
        </div>

        <div className="premium-status-row">
          <StatusPill
            label="AI Server"
            ok={billing?.aiConfigured}
            text={billing?.aiConfigured ? 'Configurata' : 'Non configurata'}
          />
          <StatusPill
            label="AI Disponibile"
            ok={billing?.aiAvailable}
            text={billing?.aiAvailable ? 'Attiva' : 'Bloccata'}
          />
          <StatusPill
            label="Pagamenti"
            ok={false}
            text="Stripe in arrivo"
          />
        </div>

        {billing?.aiLockReason && !billing?.aiAvailable && (
          <p className="premium-note">{billing.aiLockReason}</p>
        )}
        {billing?.upgradeNote && (
          <p className="premium-note premium-note--muted">{billing.upgradeNote}</p>
        )}
      </section>

      <section className="premium-compare">
        <h2 className="premium-compare__title">Confronto piani</h2>
        <div className="premium-compare__grid">
          {PLAN_COMPARISON.map((plan) => (
            <article
              key={plan.id}
              className={[
                'premium-plan-card ndl-panel',
                plan.highlighted && 'premium-plan-card--highlight',
                currentPlan === plan.id && 'premium-plan-card--current',
              ].filter(Boolean).join(' ')}
            >
              {currentPlan === plan.id && (
                <span className="premium-plan-card__current">Piano attuale</span>
              )}
              <h3>{plan.label}</h3>
              <p className="premium-plan-card__price">{plan.price}</p>
              <p className="premium-plan-card__credits">{plan.aiCredits} generazioni AI / mese</p>
              <ul className="premium-plan-card__features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {plan.id !== 'free' && (
                <button type="button" className="ndl-btn ndl-btn--ghost premium-plan-card__btn" disabled>
                  Pagamenti in arrivo
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="premium-ai-studio ndl-panel">
        <h2>AI Studio</h2>
        <p className="premium-page__sub">
          Caption, hashtag, CTA, idee Reel/carosello e trasformazioni multi-piattaforma.
        </p>
        <ul className="premium-ai-list">
          <li>Genera caption</li>
          <li>Genera hashtag</li>
          <li>Genera CTA</li>
          <li>Idea Reel e carosello</li>
          <li>Trasforma per Instagram, Facebook, LinkedIn, X</li>
        </ul>
        <Link to="/generator" className="ndl-btn ndl-btn--primary">
          Apri generatore
        </Link>
      </section>
    </div>
  );
}

function StatusPill({ label, ok, text }) {
  return (
    <span className={`premium-pill premium-pill--${ok ? 'ok' : 'off'}`}>
      <span className="premium-pill__dot" />
      {label}: {text}
    </span>
  );
}
