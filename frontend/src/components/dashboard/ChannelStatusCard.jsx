import { Link } from 'react-router-dom';
import { isInstagramConnected } from '../../lib/instagramStatus.js';

export default function ChannelStatusCard({ accounts = [], integrations = {} }) {
  const igAccount = accounts.find((a) => a.platform === 'instagram');
  const igIntegration = integrations.instagram || {};
  const igConnected = isInstagramConnected(igIntegration) || Boolean(igAccount);
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
                {igConnected ? 'Collegato' : 'Offline'}
              </span>
            </div>
            <p className="ndl-channel__meta">
              {igAccount?.username ? `@${igAccount.username}` : igIntegration.accountUsername ? `@${igIntegration.accountUsername}` : 'Business / Creator'}
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
                ? 'Integrazione disattivata — focus su Instagram.'
                : 'Non configurato in questa release.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
