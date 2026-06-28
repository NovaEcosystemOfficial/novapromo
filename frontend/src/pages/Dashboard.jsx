import { useEffect, useState, useMemo } from 'react';

import { Link } from 'react-router-dom';

import { api } from '../api/client.js';
import { isDemoMode } from '../lib/features.js';
import { getDemoDashboardStats } from '../lib/demo.js';

import StatCard from '../components/dashboard/StatCard.jsx';

import MiniCalendar from '../components/dashboard/MiniCalendar.jsx';

import AccountsWidget from '../components/dashboard/AccountsWidget.jsx';

import RecentPosts from '../components/dashboard/RecentPosts.jsx';

import SuggestionsWidget from '../components/dashboard/SuggestionsWidget.jsx';

import TikTokPausedBadge from '../components/TikTokPausedBadge.jsx';

import { useContentModal } from '../context/ContentModalContext.jsx';

import { useAuth } from '../context/AuthContext.jsx';

import { formatViews } from '../constants/projects.js';

import { formatDateTime, CONTENT_TYPE_LABELS } from '../utils/labels.js';

import '../styles/dashboard.css';



function getGreeting() {

  const h = new Date().getHours();

  if (h < 12) return 'Buongiorno';

  if (h < 18) return 'Buon pomeriggio';

  return 'Buonasera';

}



export default function Dashboard() {

  const { openModal } = useContentModal();

  const { instagram } = useAuth();

  const [stats, setStats] = useState(null);

  const [posts, setPosts] = useState([]);

  const [accounts, setAccounts] = useState([]);

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    Promise.all([api.getDashboard(), api.getPosts(), api.getAccounts()])

      .then(([dash, allPosts, accs]) => {

        setStats(dash);

        setPosts(allPosts);

        setAccounts(accs);

      })

      .catch((err) => {
        if (isDemoMode()) {
          setStats(getDemoDashboardStats());
          setPosts([]);
          setAccounts([]);
        } else {
          setError(err.message);
        }
      })

      .finally(() => setLoading(false));

  }, []);



  const recentPosts = useMemo(

    () =>

      [...posts]

        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))

        .slice(0, 5),

    [posts]

  );



  const calendarPosts = useMemo(

    () => posts.filter((p) => p.scheduledAt || p.publishedAt),

    [posts]

  );



  const igAccount = accounts.find((a) => a.platform === 'instagram');

  const igIntegration = stats?.integrations?.instagram || {};



  if (error) return <div className="alert alert-error">{error}</div>;



  if (loading) {

    return (

      <div className="dashboard">

        <div className="dash-header">

          <div className="dash-greeting">

            <h2>{getGreeting()} 👋</h2>

            <p>Caricamento dashboard...</p>

          </div>

        </div>

        <div className="dash-loading-stats">

          {[1, 2, 3, 4, 5].map((i) => (

            <div key={i} className="dash-skeleton" />

          ))}

        </div>

      </div>

    );

  }



  const metrics = stats.metrics || {};

  const lastPub = metrics.lastPublished;



  return (

    <div className="dashboard">

      <header className="dash-header">

        <div className="dash-greeting">

          <h2>{getGreeting()} 👋</h2>

          <p>

            Pianifica la settimana in 5 minuti —{' '}

            <strong>{stats.posts.scheduled}</strong> contenuti già in calendario.

          </p>

        </div>

        <button type="button" className="dash-cta" onClick={() => openModal()}>

          <span className="dash-cta-icon">+</span>

          Nuovo contenuto

        </button>

      </header>



      <section className="dash-stats dash-stats--5" aria-label="Metriche settimanali">

        <StatCard variant="month" label="Post questo mese" value={metrics.postsThisMonth ?? 0} icon="📅" />

        <StatCard variant="views" label="Visualizzazioni totali" value={formatViews(metrics.totalViews ?? 0)} icon="👁" raw />

        <StatCard variant="today" label="Pubblicati oggi" value={metrics.publishedToday ?? 0} icon="🚀" />

        <StatCard variant="streak" label="Streak pubblicazione" value={`${metrics.streak ?? 0}g`} icon="🔥" raw />

        <StatCard

          variant="last"

          label="Ultimo contenuto"

          value={lastPub?.project || '—'}

          icon="✓"

          subtitle={lastPub ? `${CONTENT_TYPE_LABELS[lastPub.contentType] || ''} · ${formatDateTime(lastPub.publishedAt)}` : 'Nessuna pubblicazione'}

          raw

        />

      </section>



      <div className="dash-grid">

        <div className="dash-stack-gap">

          <div className="dash-panel dash-panel--glass">

            <MiniCalendar posts={calendarPosts} />

          </div>



          <div className="dash-panel dash-panel--glass">

            <div className="dash-panel-header">

              <span className="dash-panel-title">Ultimi contenuti</span>

            </div>

            <RecentPosts posts={recentPosts} />

          </div>

        </div>



        <aside className="dash-sidebar-stack">

          <div className="dash-panel dash-panel--glass">

            <div className="dash-panel-header">

              <span className="dash-panel-title">Instagram</span>

              {igAccount || igIntegration.tokenPresent ? (

                <span className="account-live-badge">Attivo</span>

              ) : (

                <span className="account-mock-badge">Da collegare</span>

              )}

            </div>

            {igAccount ? (

              <div className="account-connected">

                <div className="account-connected-user">@{igAccount.username}</div>

                <div className="account-connected-meta">

                  Account collegato

                </div>

              </div>

            ) : (

              <p className="auth-sub" style={{ margin: 0 }}>

                {igIntegration.nextStep || 'Collega Instagram dalla sezione Account'}

              </p>

            )}

            <Link to="/accounts" className="dash-connect-btn" style={{ marginTop: '0.75rem' }}>

              Gestisci Instagram →

            </Link>

          </div>



          <div className="dash-panel dash-panel--glass">

            <div className="dash-panel-header">

              <span className="dash-panel-title">TikTok</span>

              <TikTokPausedBadge />

            </div>

            <p className="auth-sub" style={{ margin: 0 }}>

              Integrazione temporaneamente in pausa. Il codice resta nel progetto ma non è attivo.

            </p>

          </div>



          <SuggestionsWidget suggestions={stats.suggestions || []} />

          <AccountsWidget accounts={accounts} integrations={stats.integrations} />

        </aside>

      </div>

    </div>

  );

}

