import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { isDemoMode } from '../lib/features.js';
import { getDemoDashboardStats } from '../lib/demo.js';
import { isInstagramConnected } from '../lib/instagramStatus.js';
import { isFacebookConnected } from '../lib/facebookStatus.js';
import { useContentModal } from '../context/ContentModalContext.jsx';
import { useCreativeStudio } from '../context/CreativeStudioContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useBilling } from '../context/BillingContext.jsx';
import { useViewport } from '../hooks/useViewport.js';
import {
  buildLast7DaysSeries,
  buildNextActions,
  enrichSuggestions,
  getGreeting,
  getFirstName,
} from '../utils/dashboardMetrics.js';
import {
  buildAnalyticsV2Cards,
  buildPerformanceAiTips,
  buildAnalyticsInsights,
  buildAnalyticsGoals,
} from '../utils/dashboardAnalyticsV2.js';
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import InsightPanel from '../components/dashboard/InsightPanel.jsx';
import PlannerCalendar from '../components/dashboard/PlannerCalendar.jsx';
import ActivityTimeline from '../components/dashboard/ActivityTimeline.jsx';
import ChannelStatusCard from '../components/dashboard/ChannelStatusCard.jsx';
import NextActionsPanel from '../components/dashboard/NextActionsPanel.jsx';
import AiSuggestionsPanel from '../components/dashboard/AiSuggestionsPanel.jsx';
import MobileDashboard from '../components/dashboard/MobileDashboard.jsx';
import PerformanceAiPanel, {
  AnalyticsInsightsPanel,
  AnalyticsGoalsPanel,
} from '../components/dashboard/AnalyticsV2Panels.jsx';
import { IconCalendar, IconDrafts } from '../components/icons/DashboardIcons.jsx';
import '../styles/dashboard.css';

const REFRESH_MS = 60_000;

function formatLastUpdated(date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { openModal } = useContentModal();
  const { openCreativeStudio } = useCreativeStudio();
  const { user } = useAuth();
  const { billing } = useBilling();
  const { isMobile } = useViewport();
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [brandContext, setBrandContext] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [dash, allPosts, accs, features, brand] = await Promise.all([
        api.getDashboard(),
        api.getPosts(),
        api.getAccounts(),
        api.getFeatures().catch(() => null),
        api.getBrandAiContext().catch(() => null),
      ]);
      setStats(dash);
      setPosts(allPosts);
      setAccounts(accs);
      setFirebaseStatus(features?.firebase || null);
      setBrandContext(brand);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      if (isDemoMode()) {
        setStats(getDemoDashboardStats());
        setPosts([]);
        setAccounts([]);
        setLastUpdated(new Date());
        setError('');
      } else if (!silent) {
        setError(err.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const id = window.setInterval(() => {
      loadDashboard({ silent: true });
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadDashboard]);

  const calendarPosts = useMemo(
    () => posts.filter((p) => p.scheduledAt || p.publishedAt),
    [posts]
  );

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
    [posts]
  );

  const metricCards = useMemo(
    () => (stats
      ? buildAnalyticsV2Cards({
        stats,
        posts,
        integrations: stats.integrations || {},
        accounts,
      })
      : []),
    [stats, posts, accounts]
  );

  const performanceSeries = useMemo(() => buildLast7DaysSeries(posts), [posts]);

  const performanceTips = useMemo(
    () => buildPerformanceAiTips({ posts, stats }),
    [posts, stats]
  );

  const analyticsInsights = useMemo(
    () => buildAnalyticsInsights({ posts }),
    [posts]
  );

  const analyticsGoals = useMemo(
    () => buildAnalyticsGoals({ stats, posts, billing }),
    [stats, posts, billing]
  );

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
    const fb = stats?.integrations?.facebook;
    const igOk = isInstagramConnected(ig) || accounts.some((a) => a.platform === 'instagram');
    const fbOk = isFacebookConnected(fb) || accounts.some((a) => a.platform === 'facebook');
    const apiOk = firebaseStatus?.dataStore === 'firestore' && firebaseStatus?.adminConfigured;

    return [
      {
        id: 'ig',
        label: igOk ? 'Instagram' : 'IG offline',
        tone: igOk ? 'success' : 'warn',
        title: igOk ? 'OAuth Instagram operativo' : 'Collega da Account',
      },
      {
        id: 'fb',
        label: fbOk ? 'Facebook' : 'FB offline',
        tone: fbOk ? 'success' : 'warn',
        title: fbOk ? 'Facebook Page collegata' : 'Collega da Account',
      },
      {
        id: 'api',
        label: apiOk ? 'API' : 'API locale',
        tone: apiOk ? 'success' : 'muted',
        title: apiOk ? 'Backend Firebase operativo' : 'Backend operativo',
      },
      {
        id: 'firebase',
        label: firebaseStatus?.dataStore === 'firestore' ? 'Firebase' : 'Locale',
        tone: firebaseStatus?.dataStore === 'firestore' ? 'success' : 'muted',
        title: firebaseStatus?.dataStore === 'firestore' ? 'Firestore + Storage' : 'Verifica env backend',
      },
    ];
  }, [stats, accounts, firebaseStatus]);

  const mobileExtraCards = useMemo(() => {
    const cards = [];
    if (billing) {
      cards.push({
        id: 'ai-credits',
        label: 'Crediti AI',
        value: `${billing.aiCreditsUsed ?? 0}/${billing.aiCreditsLimit ?? 3}`,
        description: billing.isPremium ? 'Piano Premium attivo' : 'Crediti mensili disponibili',
        quality: 'real',
        trend: null,
        icon: 'engagement',
      });
    }
    if (brandContext) {
      cards.push({
        id: 'brand-intel',
        label: 'Brand Intelligence',
        value: `${brandContext.completionPercent ?? 0}%`,
        description: brandContext.hasProfile ? 'Profilo brand configurato' : 'Completa il profilo brand',
        quality: brandContext.hasProfile ? 'real' : 'pending',
        trend: null,
        icon: 'streak',
      });
    }
    return cards;
  }, [billing, brandContext]);

  const mobileQuickActions = useMemo(
    () => [
      { id: 'new', label: 'Nuovo contenuto', icon: '✦', onClick: () => openModal() },
      {
        id: 'creative',
        label: 'Creative Studio PRO',
        icon: '◆',
        onClick: () => openCreativeStudio(),
      },
      { id: 'calendar', label: 'Calendario', href: '/calendar', icon: <IconCalendar /> },
      { id: 'drafts', label: 'Bozze', href: '/drafts', icon: <IconDrafts /> },
    ],
    [openModal, openCreativeStudio]
  );

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (loading) {
    return (
      <div className={isMobile ? 'mobile-dashboard mobile-dashboard--loading' : 'command-center'}>
        <div className="ndl-skeleton ndl-skeleton--header" />
        <div className="ndl-metrics ndl-metrics--loading">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="ndl-skeleton ndl-skeleton--metric" />
          ))}
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileDashboard
        greeting={getGreeting()}
        firstName={getFirstName(user)}
        services={services}
        metricCards={metricCards}
        extraCards={mobileExtraCards}
        quickActions={mobileQuickActions}
        onNewContent={() => openModal()}
        performanceTips={performanceTips}
        analyticsInsights={analyticsInsights}
        analyticsGoals={analyticsGoals}
      />
    );
  }

  const quickActions = [
    { id: 'calendar', label: 'Calendario', href: '/calendar', icon: <IconCalendar /> },
    { id: 'drafts', label: 'Bozze', href: '/drafts', icon: <IconDrafts /> },
  ];

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

      <section className="ndl-metrics ndl-metrics--v2" aria-label="Dashboard Analytics V2">
        {metricCards.map((card, index) => (
          <MetricCard key={card.id} {...card} delay={index * 35} />
        ))}
      </section>

      <div className="nda-analytics-row">
        <PerformanceAiPanel tips={performanceTips} />
        <AnalyticsInsightsPanel insights={analyticsInsights} />
      </div>

      <AnalyticsGoalsPanel goals={analyticsGoals} />

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
