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

export default function AccountProfilePanel() {
  const { billing, refreshBilling } = useBilling();
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (!billing) return null;

  const creditsLabel = billing.creditsUnlimited
    ? '∞'
    : `${billing.aiCreditsRemaining ?? billing.creditsRemaining ?? 0}`;

  const handleRedeem = async (e) => {
    e.preventDefault();
    setCouponMsg('');
    setCouponErr('');
    setLoading(true);
    try {
      const result = await api.redeemCoupon(coupon.trim());
      setCouponMsg(result.type === 'premium_days'
        ? `Premium esteso fino al ${formatDate(result.billing?.premiumUntil)}`
        : `Coupon applicato — crediti aggiornati`);
      setCoupon('');
      await refreshBilling();
    } catch (err) {
      setCouponErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card account-profile" style={{ marginBottom: '1.5rem' }}>
      <div className="account-profile__head">
        <div>
          <h3 style={{ margin: 0 }}>Profilo NovaPromo</h3>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Piano, crediti e accesso alle funzioni AI
          </p>
        </div>
        {billing.isAdmin && (
          <span className="sidebar-premium-badge">Admin</span>
        )}
        {billing.isTrial && !billing.isAdmin && (
          <span className="integration-mode-badge integration-mode-badge--real">Trial attivo</span>
        )}
      </div>

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
          <dt>Piano</dt>
          <dd>{billing.planLabel || billing.plan}</dd>
        </div>
        <div>
          <dt>Crediti disponibili</dt>
          <dd>{creditsLabel}</dd>
        </div>
        {billing.isTrial && billing.trialEndsAt && (
          <div>
            <dt>Trial fino a</dt>
            <dd>{formatDate(billing.trialEndsAt)}</dd>
          </div>
        )}
        {billing.premiumUntil && (
          <div>
            <dt>Premium fino a</dt>
            <dd>{formatDate(billing.premiumUntil)}</dd>
          </div>
        )}
        {billing.creditsResetAt && !billing.creditsUnlimited && (
          <div>
            <dt>Reset crediti</dt>
            <dd>{formatDate(billing.creditsResetAt)}</dd>
          </div>
        )}
      </dl>

      {!billing.isAdmin && !billing.isPremium && (
        <div className="account-profile__upgrade">
          <Link to="/premium" className="btn btn-primary btn-sm">
            Passa a Premium
          </Link>
        </div>
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
