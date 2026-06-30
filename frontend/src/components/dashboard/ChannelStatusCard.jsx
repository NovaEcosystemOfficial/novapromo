import { Link } from 'react-router-dom';
import { isInstagramConnected } from '../../lib/instagramStatus.js';

export default function ChannelStatusCard({ accounts = [], integrations = {} }) {
  const igAccount = accounts.find((a) => a.platform === 'instagram');
  const igIntegration = integrations.instagram || {};
  const igConnected = isInstagramConnected(igIntegration) || Boolean(igAccount);
  const tiktok = integrations.tiktok || {};

  return (
    <section className="cc-panel">
      <header className="cc-panel__header">
        <h2 className="cc-panel__title">Stato canali</h2>
      </header>

      <div className="cc-channels">
        <div className={`cc-channel${igConnected ? ' cc-channel--live' : ''}`}>
          <div className="cc-channel__avatar cc-channel__avatar--ig">IG</div>
          <div className="cc-channel__body">
            <div className="cc-channel__row">
              <span className="cc-channel__name">Instagram</span>
              <span className={`cc-channel__pill cc-channel__pill--${igConnected ? 'live' : 'off'}`}>
                {igConnected ? 'Collegato' : 'Non collegato'}
              </span>
            </div>
            <p className="cc-channel__meta">
              {igAccount?.username ? `@${igAccount.username}` : igIntegration.accountUsername ? `@${igIntegration.accountUsername}` : 'Account Business / Creator'}
            </p>
          </div>
          <Link to="/accounts" className="cc-channel__link">
            Gestisci
          </Link>
        </div>

        <div className="cc-channel cc-channel--paused">
          <div className="cc-channel__avatar cc-channel__avatar--tt">TT</div>
          <div className="cc-channel__body">
            <div className="cc-channel__row">
              <span className="cc-channel__name">TikTok</span>
              <span className="cc-channel__pill cc-channel__pill--paused">In pausa</span>
            </div>
            <p className="cc-channel__meta">
              {tiktok.paused
                ? 'Integrazione disattivata — focus su Instagram.'
                : 'Non configurato in questa release.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
