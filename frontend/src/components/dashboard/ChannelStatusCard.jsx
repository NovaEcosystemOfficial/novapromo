import { Link } from 'react-router-dom';
import { isInstagramConnected } from '../../lib/instagramStatus.js';
import { isFacebookConnected, getFacebookConnectionLabel } from '../../lib/facebookStatus.js';

export default function ChannelStatusCard({ accounts = [], integrations = {} }) {
  const igAccount = accounts.find((a) => a.platform === 'instagram');
  const fbAccount = accounts.find((a) => a.platform === 'facebook');
  const igIntegration = integrations.instagram || {};
  const fbIntegration = integrations.facebook || {};
  const igConnected = isInstagramConnected(igIntegration) || Boolean(igAccount);
  const fbConnected = isFacebookConnected(fbIntegration) || Boolean(fbAccount);
  const fbLabel = fbConnected ? 'Attivo' : getFacebookConnectionLabel(fbIntegration);
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
                {fbLabel}
              </span>
            </div>
            <p className="ndl-channel__meta">
              {fbIntegration.pageName || fbAccount?.displayName || 'Pagina Facebook'}
            </p>
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
