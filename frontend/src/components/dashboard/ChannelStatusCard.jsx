import { Link } from 'react-router-dom';
import { isInstagramConnected } from '../../lib/instagramStatus.js';
import {
  isFacebookConnected,
  getFacebookConnectionLabel,
  getFacebookPublishingLabel,
  isFacebookPublishPending,
} from '../../lib/facebookStatus.js';

export default function ChannelStatusCard({ accounts = [], integrations = {} }) {
  const igAccount = accounts.find((a) => a.platform === 'instagram');
  const fbAccount = accounts.find((a) => a.platform === 'facebook');
  const igIntegration = integrations.instagram || {};
  const fbIntegration = integrations.facebook || {};
  const igConnected = isInstagramConnected(igIntegration) || Boolean(igAccount);
  const fbConnected = isFacebookConnected(fbIntegration) || Boolean(fbAccount);
  const fbPublishPending = isFacebookPublishPending(fbIntegration);
  const fbConnectionLabel = fbConnected ? 'Collegato' : getFacebookConnectionLabel(fbIntegration);
  const fbPublishLabel = getFacebookPublishingLabel(fbIntegration);
  const tiktok = integrations.tiktok || {};

  return (
    <section className="ndl-panel">
      <header className="ndl-panel__head">
        <div>
          <h2 className="ndl-panel__title">Canali</h2>
          <p className="ndl-panel__sub">Stato integrazioni</p>
        </div>
      </header>

      <div className="ndl-channels">
        <div className={`ndl-channel${igConnected ? ' ndl-channel--live' : ''}`}>
          <div className="ndl-channel__avatar">IG</div>
          <div className="ndl-channel__body">
            <div className="ndl-channel__row">
              <span className="ndl-channel__name">Instagram</span>
              <span className={`ndl-channel__pill ndl-channel__pill--${igConnected ? 'live' : 'off'}`}>
                {igConnected ? 'Attivo' : 'Offline'}
              </span>
            </div>
            <p className="ndl-channel__meta">
              {igAccount?.username ? `@${igAccount.username}` : igIntegration.accountUsername ? `@${igIntegration.accountUsername}` : 'Business / Creator'}
            </p>
          </div>
          <Link to="/accounts" className="ndl-channel__link">Gestisci</Link>
        </div>

        <div className={`ndl-channel${fbConnected ? ' ndl-channel--live' : ''}`}>
          <div className="ndl-channel__avatar">FB</div>
          <div className="ndl-channel__body">
            <div className="ndl-channel__row">
              <span className="ndl-channel__name">Facebook</span>
              <span className={`ndl-channel__pill ndl-channel__pill--${fbConnected ? 'live' : 'off'}`}>
                {fbConnectionLabel}
              </span>
            </div>
            <p className="ndl-channel__meta">
              {fbIntegration.pageName || fbAccount?.displayName || 'Pagina Facebook'}
            </p>
            {fbConnected && fbPublishLabel && (
              <p className="ndl-channel__meta">
                <span className={`ndl-channel__pill ndl-channel__pill--${fbPublishPending ? 'paused' : 'live'}`} style={{ display: 'inline-block', marginTop: '0.35rem' }}>
                  {fbPublishLabel}
                </span>
              </p>
            )}
          </div>
          <Link to="/accounts" className="ndl-channel__link">Gestisci</Link>
        </div>

        <div className="ndl-channel">
          <div className="ndl-channel__avatar">TT</div>
          <div className="ndl-channel__body">
            <div className="ndl-channel__row">
              <span className="ndl-channel__name">TikTok</span>
              <span className="ndl-channel__pill ndl-channel__pill--paused">In pausa</span>
            </div>
            <p className="ndl-channel__meta">
              {tiktok.paused
                ? 'Integrazione disattivata — focus su Instagram e Facebook.'
                : 'Non configurato in questa release.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
