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
  enrichSuggestions,
  getGreeting,
  getFirstName,
} from '../utils/dashboardMetrics.js';
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import InsightPanel from '../components/dashboard/InsightPanel.jsx';
import PlannerCalendar from '../components/dashboard/PlannerCalendar.jsx';
import ActivityTimeline from '../components/dashboard/ActivityTimeline.jsx';
import ChannelStatusCard from '../components/dashboard/ChannelStatusCard.jsx';
import NextActionsPanel from '../components/dashboard/NextActionsPanel.jsx';
import AiSuggestionsPanel from '../components/dashboard/AiSuggestionsPanel.jsx';
import { IconCalendar, IconDrafts } from '../components/icons/DashboardIcons.jsx';
import '../styles/dashboard.css';

function formatLastUpdated(date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { openModal } = useContentModal();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
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
        setLastUpdated(new Date());
      })
      .catch((err) => {
        if (isDemoMode()) {
          setStats(getDemoDashboardStats());
          setPosts([]);
          setAccounts([]);
          setLastUpdated(new Date());
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

  const smartSuggestions = useMemo(
    () => enrichSuggestions(stats?.suggestions || []),
    [stats]
  );

  const services = useMemo(() => {
    const ig = stats?.integrations?.instagram;
    const igOk = isInstagramConnected(ig) || accounts.some((a) => a.platform === 'instagram');
    const fbOk =
      firebaseStatus?.dataStore === 'firestore' && firebaseStatus?.storageConfigured;

    return [
      {
        id: 'ig',
        label: igOk ? 'Instagram' : 'IG offline',
        tone: igOk ? 'success' : 'warn',
        title: igOk ? 'OAuth Instagram operativo' : 'Collega da Account',
      },
      {
        id: 'fb',
        label: fbOk ? 'Firebase' : 'Locale',
        tone: fbOk ? 'success' : 'muted',
        title: fbOk ? 'Firestore + Storage' : 'Verifica env backend',
      },
      {
        id: 'api',
        label: 'API',
        tone: 'success',
        title: 'Backend operativo',
      },
    ];
  }, [stats, accounts, firebaseStatus]);

  const quickActions = useMemo(
    () => [
      { id: 'calendar', label: 'Calendario', href: '/calendar', icon: <IconCalendar /> },
      { id: 'drafts', label: 'Bozze', href: '/drafts', icon: <IconDrafts /> },
    ],
    []
  );

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (loading) {
    return (
      <div className="command-center">
        <div className="ndl-skeleton ndl-skeleton--header" />
        <div className="ndl-metrics ndl-metrics--loading">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="ndl-skeleton ndl-skeleton--metric" />
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
        lastUpdated={lastUpdated ? formatLastUpdated(lastUpdated) : null}
        onNewContent={() => openModal()}
        services={services}
        quickActions={quickActions}
      />

      <section className="ndl-metrics" aria-label="Metriche principali">
        {metricCards.map((card, index) => (
          <MetricCard key={card.id} {...card} delay={index * 35} />
        ))}
      </section>

      <InsightPanel series={performanceSeries} />

      <div className="ndl-layout">
        <div className="ndl-layout__main">
          <PlannerCalendar posts={calendarPosts} />
          <ActivityTimeline posts={sortedPosts} logs={stats?.recentLogs || []} />
        </div>

        <aside className="ndl-layout__aside">
          <ChannelStatusCard accounts={accounts} integrations={stats?.integrations} />
          <NextActionsPanel actions={nextActions} />
          <AiSuggestionsPanel suggestions={smartSuggestions} />
        </aside>
      </div>
    </div>
  );
}
