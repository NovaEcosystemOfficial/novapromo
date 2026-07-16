import { Link } from 'react-router-dom';
import { useBilling } from '../../context/BillingContext.jsx';
import { useState } from 'react';
import { api } from '../../api/client.js';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function subscriptionStatusLabel(status, billingStatus) {
  if (billingStatus === 'past_due' || status === 'past_due') return 'Pagamento in ritardo';
  if (status === 'active') return 'Attivo';
  if (status === 'trialing') return 'In prova';
  if (status === 'canceled') return 'Annullato';
  if (billingStatus === 'active_mock') return 'Attivo (mock)';
  if (billingStatus === 'active') return 'Attivo';
  return status || billingStatus || '—';
}

export default function AccountProfilePanel() {
  const { billing, refreshBilling } = useBilling();
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalErr, setPortalErr] = useState('');

  if (!billing) return null;

  const creditsLabel = billing.creditsUnlimited
    ? '∞'
    : `${billing.aiCreditsRemaining ?? billing.creditsRemaining ?? 0}`;

  const isPastDue = billing.billingStatus === 'past_due'
    || billing.stripeSubscriptionStatus === 'past_due';

  const handleRedeem = async (e) => {
    e.preventDefault();
    setCouponMsg('');
    setCouponErr('');
    setLoading(true);
    try {
      const result = await api.redeemCoupon(coupon.trim());
      setCouponMsg(result.type === 'premium_days'
        ? `Premium esteso fino al ${formatDate(result.billing?.premiumUntil)}`
        : 'Coupon applicato — crediti aggiornati');
      setCoupon('');
      await refreshBilling();
    } catch (err) {
      setCouponErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalErr('');
    setPortalLoading(true);
    try {
      const result = await api.createPortalSession();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setPortalErr('Portale non disponibile');
    } catch (err) {
      setPortalErr(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <section className="card account-profile" style={{ marginBottom: '1.5rem' }}>
      <div className="account-profile__head">
        <div>
          <h3 style={{ margin: 0 }}>Profilo NovaPromo</h3>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Piano, crediti e abbonamento
          </p>
        </div>
        <div className="account-profile__badges">
          {billing.isAdmin && (
            <span className="sidebar-premium-badge">Admin</span>
          )}
          {billing.isPremium && !billing.isAdmin && (
            <span className="integration-mode-badge integration-mode-badge--real">PRO attivo</span>
          )}
          {(billing.stripeTestMode || (billing.testMode && billing.stripeConfigured)) && (
            <span className="account-test-badge">Stripe TEST</span>
          )}
          {billing.testMode && !billing.stripeConfigured && (
            <span className="account-test-badge">Mock TEST</span>
          )}
        </div>
      </div>

      {isPastDue && !billing.isAdmin && (
        <div className="account-billing-alert" role="alert">
          <strong>Pagamento non riuscito.</strong>
          {' '}
          Aggiorna il metodo di pagamento per evitare la sospensione di NovaPromo PRO.
          {billing.canManageSubscription && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ marginLeft: '0.75rem' }}
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? 'Apertura…' : 'Aggiorna metodo di pagamento'}
            </button>
          )}
        </div>
      )}

      <dl className="account-profile__grid">
        <div>
          <dt>Email</dt>
          <dd>{billing.email || '—'}</dd>
        </div>
        <div>
          <dt>Ruolo</dt>
          <dd>{billing.role === 'admin' ? 'Admin' : 'Utente'}</dd>
        </div>
        <div>
          <dt>Piano attuale</dt>
          <dd>{billing.planLabel || billing.plan}</dd>
        </div>
        <div>
          <dt>Stato abbonamento</dt>
          <dd>
            {billing.isAdmin
              ? 'Admin (nessun abbonamento)'
              : subscriptionStatusLabel(billing.stripeSubscriptionStatus, billing.billingStatus)}
          </dd>
        </div>
        <div>
          <dt>Crediti AI disponibili</dt>
          <dd>{creditsLabel}</dd>
        </div>
        {billing.plan === 'free' && billing.welcomeProCreditsTotal > 0 && (
          <div>
            <dt>Crediti benvenuto PRO</dt>
            <dd>
              {billing.welcomeProCredits ?? 0} rimanenti su {billing.welcomeProCreditsTotal}
            </dd>
          </div>
        )}
        {(billing.stripeCurrentPeriodEnd || billing.premiumUntil) && billing.isPremium && !billing.isAdmin && (
          <div>
            <dt>{billing.cancelAtPeriodEnd ? 'PRO fino a' : 'Prossimo rinnovo'}</dt>
            <dd>{formatDateShort(billing.stripeCurrentPeriodEnd || billing.premiumUntil)}</dd>
          </div>
        )}
        {billing.cancelAtPeriodEnd && billing.isPremium && (
          <div>
            <dt>Cancellazione</dt>
            <dd>
              Si annullerà il {formatDateShort(billing.stripeCurrentPeriodEnd || billing.premiumUntil)}
            </dd>
          </div>
        )}
        {billing.isTrial && billing.trialEndsAt && (
          <div>
            <dt>Trial legacy fino a</dt>
            <dd>{formatDate(billing.trialEndsAt)}</dd>
          </div>
        )}
        {billing.creditsResetAt && !billing.creditsUnlimited && (
          <div>
            <dt>Reset crediti</dt>
            <dd>{formatDate(billing.creditsResetAt)}</dd>
          </div>
        )}
      </dl>

      {!billing.isAdmin && (
        <div className="account-profile__upgrade account-profile__actions">
          {billing.canManageSubscription ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? 'Apertura…' : 'Gestisci abbonamento'}
            </button>
          ) : null}
          <Link to="/premium" className="btn btn-secondary btn-sm">
            {billing.isPremium ? 'Vedi piani' : 'Gestisci piano'}
          </Link>
          {portalErr && <p className="account-coupon__err">{portalErr}</p>}
          {billing.testMode && (
            <p className="account-profile__test-note">
              {billing.stripeConfigured
                ? 'Stripe Test Mode — nessun addebito reale con chiavi sandbox.'
                : 'Pagamenti in modalità mock — nessun addebito reale finché Stripe non è configurato.'}
            </p>
          )}
        </div>
      )}

      {billing.isAdmin && (
        <p className="account-profile__test-note">
          Account Admin — accesso PRO illimitato, nessun pagamento richiesto.
        </p>
      )}

      <form className="account-coupon" onSubmit={handleRedeem}>
        <label htmlFor="coupon-code">Codice promo</label>
        <div className="account-coupon__row">
          <input
            id="coupon-code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Es. WELCOME30"
            disabled={loading}
          />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={loading || !coupon.trim()}>
            Riscatta
          </button>
        </div>
        {couponMsg && <p className="account-coupon__ok">{couponMsg}</p>}
        {couponErr && <p className="account-coupon__err">{couponErr}</p>}
      </form>
    </section>
  );
}
