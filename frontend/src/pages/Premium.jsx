import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBilling } from '../context/BillingContext.jsx';
import { PLAN_COMPARISON, PREMIUM_PRICING, PRO_BENEFITS } from '../lib/plans.js';
import { api } from '../api/client.js';
import '../styles/premium.css';

export default function Premium() {
  const { billing, loading, refreshBilling } = useBilling();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');

  if (loading) {
    return (
      <div className="premium-page">
        <div className="ndl-skeleton ndl-skeleton--header" />
      </div>
    );
  }

  const currentPlan = billing?.plan || 'free';
  const isPro = billing?.isPremium && !billing?.isAdmin;
  const isAdmin = billing?.isAdmin;

  const handleActivate = async (interval) => {
    setCheckoutError('');
    setCheckoutLoading(interval);
    try {
      const result = await api.createCheckoutSession(interval);
      if (result.mode === 'stripe' && result.url) {
        window.location.href = result.url;
        return;
      }
      navigate(result.checkoutPath || `/checkout/mock?plan=${interval}`);
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="premium-page premium-page--pro">
      <header className="premium-hero">
        <p className="premium-page__eyebrow">NovaPromo PRO</p>
        <h1>Lavora come un vero reparto marketing.</h1>
        <p className="premium-hero__sub">
          Crea contenuti, immagini AI, campagne e pubblicazioni social da un&apos;unica piattaforma.
        </p>
        {billing?.testMode && (
          <p className="premium-test-banner" role="status">
            Modalità test — i pagamenti reali si attivano con Stripe configurato sul backend
          </p>
        )}
      </header>

      {isAdmin && (
        <section className="premium-admin-banner ndl-panel">
          <span className="premium-badge">Admin</span>
          <p>Accesso PRO illimitato — nessun pagamento richiesto.</p>
        </section>
      )}

      {!isAdmin && billing?.welcomeProCredits > 0 && currentPlan === 'free' && (
        <section className="premium-welcome ndl-panel">
          <h2>Crediti benvenuto PRO</h2>
          <p>
            Ti restano <strong>{billing.welcomeProCredits}</strong> su{' '}
            {billing.welcomeProCreditsTotal || 3} utilizzi completi di Creative Studio PRO.
          </p>
        </section>
      )}

      <section className="premium-pricing">
        <h2 className="premium-section-title">Scegli il piano</h2>
        <div className="premium-pricing__grid">
          {Object.values(PREMIUM_PRICING).map((tier) => (
            <article
              key={tier.id}
              className={[
                'premium-price-card ndl-panel',
                tier.highlighted && 'premium-price-card--highlight',
              ].filter(Boolean).join(' ')}
            >
              <h3>{tier.label}</h3>
              <p className="premium-price-card__price">
                {tier.price}
                <span>{tier.period}</span>
              </p>
              <p className="premium-price-card__note">{tier.note}</p>
              {!isAdmin && !isPro && (
                <button
                  type="button"
                  className="ndl-btn ndl-btn--primary premium-price-card__cta"
                  disabled={checkoutLoading === tier.id}
                  onClick={() => handleActivate(tier.id)}
                >
                  {checkoutLoading === tier.id ? 'Avvio…' : 'Attiva NovaPromo PRO'}
                </button>
              )}
              {isPro && (
                <p className="premium-price-card__active">Piano PRO attivo</p>
              )}
            </article>
          ))}
        </div>
        {checkoutError && <p className="premium-note premium-note--error">{checkoutError}</p>}
      </section>

      <section className="premium-compare">
        <h2 className="premium-section-title">Free vs PRO</h2>
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
              <p className="premium-plan-card__credits">{plan.aiCredits} crediti AI / mese</p>
              <ul className="premium-plan-card__features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-benefits">
        <h2 className="premium-section-title">Tutto incluso in PRO</h2>
        <div className="premium-benefits__grid">
          {PRO_BENEFITS.map((item) => (
            <article key={item.title} className="premium-benefit-card ndl-panel">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-credits-section ndl-panel">
        <h2>300 crediti AI inclusi ogni mese</h2>
        <p>
          Caption, hashtag, CTA, idee Reel, trasformazioni multi-piattaforma e immagini AI —
          tutto conteggiato nel tuo budget mensile PRO.
        </p>
      </section>

      <section className="premium-footer-cta ndl-panel">
        <h2>Pronto per il passo successivo?</h2>
        {!isAdmin && !isPro ? (
          <button
            type="button"
            className="ndl-btn ndl-btn--primary"
            onClick={() => handleActivate('monthly')}
            disabled={Boolean(checkoutLoading)}
          >
            Attiva NovaPromo PRO
          </button>
        ) : (
          <Link to="/generator" className="ndl-btn ndl-btn--primary" onClick={() => refreshBilling()}>
            Apri Creative Studio
          </Link>
        )}
      </section>
    </div>
  );
}
