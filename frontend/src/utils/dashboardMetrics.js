/**
 * Dashboard metrics derived from Firestore posts + backend analytics.
 *
 * Data honesty:
 * - published, scheduled, streak, lastPublished → real (Firestore)
 * - viewCount → internal estimate on publish (NOT Instagram Insights) — see estimateMockViews
 * - engagement / interactions → not available yet
 */

/** @typedef {'real' | 'estimate' | 'pending'} DataQuality */

export const VIEW_COUNT_IS_ESTIMATE = true;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function countPublishedInRange(posts, from, to) {
  return posts.filter((p) => {
    if (p.status !== 'published' || !p.publishedAt) return false;
    const t = new Date(p.publishedAt).getTime();
    return t >= from.getTime() && t < to.getTime();
  }).length;
}

export function computePublicationTrend(posts) {
  const today = startOfDay(new Date());
  const weekStart = new Date(today.getTime() - 6 * 86400000);
  const prevWeekStart = new Date(today.getTime() - 13 * 86400000);
  const prevWeekEnd = new Date(weekStart.getTime());

  const current = countPublishedInRange(posts, weekStart, new Date(today.getTime() + 86400000));
  const previous = countPublishedInRange(posts, prevWeekStart, prevWeekEnd);

  if (current === 0 && previous === 0) return null;
  if (previous === 0) return { label: `${current} questa settimana`, direction: 'up' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { label: 'Stabile vs sett. scorsa', direction: 'flat' };
  return {
    label: `${pct > 0 ? '+' : ''}${pct}% vs sett. scorsa`,
    direction: pct > 0 ? 'up' : 'down',
  };
}

export function buildLast7DaysSeries(posts) {
  const days = [];
  const today = startOfDay(new Date());

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dayPosts = posts.filter((p) => {
      const ts = p.publishedAt || p.scheduledAt;
      return ts && String(ts).slice(0, 10) === key;
    });

    days.push({
      date: key,
      label: d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', ''),
      publications: dayPosts.filter((p) => p.status === 'published').length,
      scheduled: dayPosts.filter((p) => p.status === 'scheduled').length,
      views: dayPosts
        .filter((p) => p.status === 'published')
        .reduce((sum, p) => sum + (p.viewCount || 0), 0),
    });
  }

  return days;
}

export function buildMetricCards(stats, posts) {
  const metrics = stats?.metrics || {};
  const postCounts = stats?.posts || {};
  const publishedTotal = postCounts.published ?? 0;
  const scheduledTotal = postCounts.scheduled ?? 0;
  const totalViews = metrics.totalViews ?? 0;
  const hasPublished = publishedTotal > 0;
  const trend = computePublicationTrend(posts);
  const lastPub = metrics.lastPublished;

  return [
    {
      id: 'published',
      label: 'Post pubblicati',
      value: String(publishedTotal),
      description: 'Totale contenuti live sui canali',
      quality: 'real',
      trend,
      icon: 'publish',
      featured: true,
    },
    {
      id: 'views',
      label: 'Visualizzazioni',
      value: hasPublished && totalViews > 0 ? formatCount(totalViews) : null,
      description: hasPublished
        ? VIEW_COUNT_IS_ESTIMATE
          ? 'Stima interna — non da Instagram Insights'
          : 'Da Instagram Insights'
        : 'Disponibile dopo i primi insight',
      quality: hasPublished && totalViews > 0 ? 'estimate' : 'pending',
      trend: null,
      icon: 'views',
    },
    {
      id: 'engagement',
      label: 'Engagement',
      value: null,
      description: 'In attesa dati — collega Insights Instagram',
      quality: 'pending',
      trend: null,
      icon: 'engagement',
    },
    {
      id: 'scheduled',
      label: 'Programmati',
      value: String(scheduledTotal),
      description: scheduledTotal === 1 ? 'Contenuto in calendario' : 'Contenuti in calendario',
      quality: 'real',
      trend: null,
      icon: 'calendar',
    },
    {
      id: 'streak',
      label: 'Streak pubblicazione',
      value: `${metrics.streak ?? 0}g`,
      description: (metrics.streak ?? 0) > 0 ? 'Giorni consecutivi con publish' : 'Pubblica oggi per iniziare',
      quality: 'real',
      trend: null,
      icon: 'streak',
    },
    {
      id: 'last',
      label: 'Ultimo contenuto',
      value: lastPub?.project || null,
      description: lastPub
        ? `${lastPub.contentType || 'post'} · ${formatShortDate(lastPub.publishedAt)}`
        : 'Nessuna pubblicazione ancora',
      quality: lastPub ? 'real' : 'pending',
      trend: null,
      icon: 'clock',
    },
  ];
}

export function buildNextActions({ stats, posts, integrations, openModal }) {
  const actions = [];
  const scheduled = stats?.posts?.scheduled ?? 0;
  const drafts = stats?.posts?.draft ?? 0;
  const igConnected = integrations?.instagram?.connected === true;

  if (scheduled < 3) {
    actions.push({
      id: 'weekly-content',
      title: 'Crea contenuti per questa settimana',
      body: `Hai ${scheduled} in calendario — punta a 3+ per una presenza costante.`,
      cta: 'Nuovo contenuto',
      onClick: () => openModal(),
      priority: 3 - scheduled,
    });
  }

  if (scheduled === 0) {
    actions.push({
      id: 'schedule-next',
      title: 'Programma il prossimo post',
      body: 'Il calendario è vuoto. Pianifica il primo slot della settimana.',
      cta: 'Apri calendario',
      href: '/calendar',
      priority: 5,
    });
  }

  if (drafts > 0) {
    actions.push({
      id: 'finish-drafts',
      title: `${drafts} bozza${drafts > 1 ? 'e' : ''} da completare`,
      body: 'Rivedi le bozze e programmale o pubblica su Instagram.',
      cta: 'Vedi bozze',
      href: '/drafts',
      priority: drafts,
    });
  }

  if (igConnected && publishedCount(posts) === 0) {
    actions.push({
      id: 'first-publish',
      title: 'Instagram è pronto',
      body: 'Puoi pubblicare il tuo primo contenuto reale.',
      cta: 'Crea contenuto',
      onClick: () => openModal(),
      priority: 4,
    });
  }

  return actions.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 4);
}

function publishedCount(posts) {
  return posts.filter((p) => p.status === 'published').length;
}

function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function enrichSuggestions(suggestions = []) {
  return [...suggestions]
    .map((s) => {
      const days = s.daysSinceLastPost ?? 0;
      const isUrgent = days >= 7 || s.recommendedToday;
      return {
        ...s,
        priority: isUrgent ? 2 : 1,
        reason: isUrgent
          ? days >= 7
            ? `${days} giorni senza pubblicare — priorità alta`
            : 'Slot consigliato per oggi'
          : 'Mantieni il ritmo editoriale costante',
      };
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function getFirstName(user) {
  const raw = user?.displayName || user?.username || 'Fabio';
  return raw.split(/[\s@]/)[0] || 'Fabio';
}
