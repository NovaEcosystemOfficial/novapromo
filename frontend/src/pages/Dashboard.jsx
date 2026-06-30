import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { isDemoMode } from '../lib/features.js';
import { getDemoDashboardStats } from '../lib/demo.js';
import { isInstagramConnected } from '../lib/instagramStatus.js';
import { useContentModal } from '../context/ContentModalContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  buildMetricCards,
  buildLast7DaysSeries,
  buildNextActions,
  getGreeting,
  getFirstName,
} from '../utils/dashboardMetrics.js';
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import InsightPanel from '../components/dashboard/InsightPanel.jsx';
import CompactCalendar from '../components/dashboard/CompactCalendar.jsx';
import ActivityFeed from '../components/dashboard/ActivityFeed.jsx';
import ChannelStatusCard from '../components/dashboard/ChannelStatusCard.jsx';
import NextActionsPanel from '../components/dashboard/NextActionsPanel.jsx';
import AiSuggestionsPanel from '../components/dashboard/AiSuggestionsPanel.jsx';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { openModal } = useContentModal();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getPosts(),
      api.getAccounts(),
      api.getFeatures().catch(() => null),
    ])
      .then(([dash, allPosts, accs, features]) => {
        setStats(dash);
        setPosts(allPosts);
        setAccounts(accs);
        setFirebaseStatus(features?.firebase || null);
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

  const calendarPosts = useMemo(
    () => posts.filter((p) => p.scheduledAt || p.publishedAt),
    [posts]
  );

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
    [posts]
  );

  const metricCards = useMemo(
    () => (stats ? buildMetricCards(stats, posts) : []),
    [stats, posts]
  );

  const performanceSeries = useMemo(() => buildLast7DaysSeries(posts), [posts]);

  const nextActions = useMemo(
    () =>
      stats
        ? buildNextActions({
            stats,
            posts,
            integrations: stats.integrations || {},
            openModal,
          })
        : [],
    [stats, posts, openModal]
  );

  const statusBadges = useMemo(() => {
    const ig = stats?.integrations?.instagram;
    const igOk = isInstagramConnected(ig) || accounts.some((a) => a.platform === 'instagram');
    const fbOk =
      firebaseStatus?.dataStore === 'firestore' && firebaseStatus?.storageConfigured;

    return [
      {
        id: 'ig',
        label: igOk ? 'Instagram attivo' : 'Instagram da collegare',
        tone: igOk ? 'success' : 'warn',
        title: igOk ? 'OAuth Instagram operativo' : 'Collega da Account',
      },
      {
        id: 'tt',
        label: 'TikTok in pausa',
        tone: 'muted',
        title: 'Integrazione disattivata',
      },
      {
        id: 'fb',
        label: fbOk ? 'Firebase online' : 'Firebase locale',
        tone: fbOk ? 'success' : 'muted',
        title: fbOk ? 'Firestore + Storage configurati' : 'Verifica env backend',
      },
    ];
  }, [stats, accounts, firebaseStatus]);

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (loading) {
    return (
      <div className="command-center">
        <div className="cc-skeleton cc-skeleton--header" />
        <div className="cc-metrics cc-metrics--loading">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="cc-skeleton cc-skeleton--metric" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="command-center">
      <DashboardHeader
        greeting={getGreeting()}
        firstName={getFirstName(user)}
        onNewContent={() => openModal()}
        statusBadges={statusBadges}
      />

      <section className="cc-metrics" aria-label="Metriche principali">
        {metricCards.map((card, index) => (
          <MetricCard key={card.id} {...card} delay={index * 40} />
        ))}
      </section>

      <InsightPanel series={performanceSeries} />

      <div className="cc-layout">
        <div className="cc-layout__main">
          <CompactCalendar posts={calendarPosts} />
          <ActivityFeed posts={sortedPosts} logs={stats?.recentLogs || []} />
        </div>

        <aside className="cc-layout__aside">
          <ChannelStatusCard accounts={accounts} integrations={stats?.integrations} />
          <NextActionsPanel actions={nextActions} />
          <AiSuggestionsPanel suggestions={stats?.suggestions || []} />
        </aside>
      </div>
    </div>
  );
}
