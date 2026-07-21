/**
 * Dashboard Analytics V2 — derived from existing APIs only.
 *
 * Honesty map:
 * - REAL: published/scheduled counts, streak, next publish, credits, brand %,
 *         publication cadence insights (day/hour/format/platform from posts)
 * - PENDING (Meta Insights API not wired): views, reach, engagement rate,
 *         likes/comments/shares/saves, engagement-based AI tips
 * - NEVER shown as fact: estimateMockViews / viewCount totals
 */

import { VIEW_COUNT_IS_ESTIMATE, computePublicationTrend } from './dashboardMetrics.js';

const DAY_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatCount(n) {
  if (n == null || Number.isNaN(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function publishedPosts(posts = []) {
  return posts.filter((p) => p.status === 'published' && p.publishedAt);
}

function scheduledPosts(posts = []) {
  return posts
    .filter((p) => p.status === 'scheduled' && p.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

function modeKey(map) {
  let best = null;
  let bestN = 0;
  for (const [k, n] of Object.entries(map)) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return bestN > 0 ? { key: best, count: bestN } : null;
}

function igConnected(integrations = {}, accounts = []) {
  return integrations?.instagram?.connected === true
    || accounts.some((a) => a.platform === 'instagram');
}

/**
 * Six professional metric cards for Analytics V2.
 */
export function buildAnalyticsV2Cards({ stats, posts, integrations, accounts }) {
  const metrics = stats?.metrics || {};
  const postCounts = stats?.posts || {};
  const scheduledTotal = postCounts.scheduled ?? scheduledPosts(posts).length;
  const nextScheduled = scheduledPosts(posts)[0] || null;
  const streak = metrics.streak ?? 0;
  const hasIg = igConnected(integrations, accounts);
  const published = publishedPosts(posts);
  const topPost = pickTopPostOperational(published);
  const pubTrend = computePublicationTrend(posts);

  return [
    {
      id: 'views',
      label: 'Visualizzazioni',
      value: null,
      description: hasIg
        ? 'In attesa dati — Instagram Insights non collegato'
        : 'Collega Instagram Insights',
      quality: 'pending',
      trend: null,
      icon: 'views',
      featured: true,
      availability: 'pending_meta_insights',
    },
    {
      id: 'reach',
      label: 'Reach',
      value: null,
      description: hasIg
        ? 'Persone raggiunte — In attesa dati Insights'
        : 'Collega Instagram per la reach',
      quality: 'pending',
      trend: null,
      icon: 'views',
      availability: 'pending_meta_insights',
    },
    {
      id: 'engagement',
      label: 'Engagement',
      value: null,
      description: 'Like, commenti, condivisioni, salvataggi — Non disponibile',
      quality: 'pending',
      trend: null,
      icon: 'engagement',
      secondary: 'In attesa Insights',
      availability: 'pending_meta_insights',
    },
    {
      id: 'scheduled',
      label: 'Post programmati',
      value: String(scheduledTotal),
      description: nextScheduled
        ? `Prossima: ${formatDateTime(nextScheduled.scheduledAt)}`
        : 'Nessuna pubblicazione in coda',
      quality: 'real',
      trend: null,
      icon: 'calendar',
      availability: 'real',
    },
    {
      id: 'streak',
      label: 'Streak',
      value: `${streak}`,
      description: streak > 0
        ? 'Giorni consecutivi di pubblicazione'
        : 'Pubblica oggi per iniziare lo streak',
      quality: 'real',
      trend: pubTrend,
      icon: 'streak',
      availability: 'real',
    },
    {
      id: 'top-post',
      label: 'Top Post',
      value: topPost ? truncate(topPost.project || topPost.topic || 'Post', 28) : null,
      description: topPost
        ? `${topPost.platform || 'social'} · ${formatShortDate(topPost.publishedAt)} · Engagement: In attesa dati`
        : 'Nessun post pubblicato ancora',
      quality: topPost ? 'real' : 'pending',
      trend: null,
      icon: 'publish',
      actionLabel: topPost ? 'Analizza' : null,
      actionHref: topPost ? `/history` : null,
      availability: topPost ? 'real_ops_pending_engagement' : 'pending',
    },
  ];
}

/**
 * Operational "top" post — most recent published (no fake engagement ranking).
 */
function pickTopPostOperational(published) {
  if (!published.length) return null;
  return [...published].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  )[0];
}

function truncate(s, n) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/**
 * Performance IA tips — only from collected publication data (no invented %).
 */
export function buildPerformanceAiTips({ posts, stats }) {
  const published = publishedPosts(posts);
  const tips = [];

  if (published.length < 3) {
    tips.push({
      id: 'need-data',
      text: 'Servono almeno 3 pubblicazioni per suggerimenti automatici basati sui tuoi dati.',
      source: 'real',
      quality: 'pending',
    });
    return tips;
  }

  const byDay = {};
  const byType = {};
  const byPlatform = {};
  const withCta = published.filter((p) => p.cta && String(p.cta).trim()).length;
  const shortCta = published.filter((p) => p.cta && String(p.cta).trim().split(/\s+/).length <= 4).length;

  for (const p of published) {
    const d = new Date(p.publishedAt);
    const day = DAY_NAMES[d.getDay()];
    byDay[day] = (byDay[day] || 0) + 1;
    const type = p.contentType || 'post';
    byType[type] = (byType[type] || 0) + 1;
    const plat = p.platform || 'multi';
    byPlatform[plat] = (byPlatform[plat] || 0) + 1;
  }

  const topDay = modeKey(byDay);
  const topType = modeKey(byType);
  const topPlatform = modeKey(byPlatform);

  if (topDay) {
    tips.push({
      id: 'cadence-day',
      text: `Pubblichi più spesso di ${topDay} (${topDay.count} post). Mantieni questo ritmo se funziona per il brand.`,
      source: 'real_cadence',
      quality: 'real',
    });
  }

  if (topType) {
    const label = formatContentType(topType.key);
    tips.push({
      id: 'format-use',
      text: `Il formato più usato è ${label} (${topType.count}). I confronti engagement arriveranno con Instagram Insights.`,
      source: 'real_format',
      quality: 'real',
    });
  }

  if (topPlatform) {
    tips.push({
      id: 'platform-use',
      text: `Canale più attivo: ${topPlatform.key} (${topPlatform.count} pubblicazioni).`,
      source: 'real_platform',
      quality: 'real',
    });
  }

  if (withCta > 0) {
    tips.push({
      id: 'cta-presence',
      text: shortCta >= Math.ceil(withCta / 2)
        ? 'Le CTA brevi sono già prevalenti nei tuoi post — buon segnale di chiarezza.'
        : 'Molti post hanno CTA lunghe: prova CTA più corte nelle prossime pubblicazioni.',
      source: 'real_cta',
      quality: 'real',
    });
  }

  tips.push({
    id: 'engagement-pending',
    text: 'Suggerimenti tipo “+18% engagement” saranno disponibili quando Meta Insights sarà collegato.',
    source: 'pending_meta',
    quality: 'pending',
  });

  const streak = stats?.metrics?.streak ?? 0;
  if (streak >= 3) {
    tips.push({
      id: 'streak-tip',
      text: `Streak attiva di ${streak} giorni: la costanza rafforza la presenza del brand.`,
      source: 'real_streak',
      quality: 'real',
    });
  }

  return tips.slice(0, 5);
}

/**
 * Insights from real publication patterns (not Meta engagement).
 */
export function buildAnalyticsInsights({ posts }) {
  const published = publishedPosts(posts);
  const empty = {
    bestHour: pendingInsight('orario migliore'),
    bestDay: pendingInsight('giorno migliore'),
    bestFormat: pendingInsight('formato migliore'),
    bestStyle: pendingInsight('stile migliore'),
    bestPlatform: pendingInsight('piattaforma migliore'),
    note: 'Basati sulla frequenza di pubblicazione. Engagement Insights in arrivo.',
  };

  if (published.length < 2) {
    return {
      ...empty,
      note: 'In attesa dati — pubblica almeno 2 contenuti per gli insights operativi.',
    };
  }

  const byHour = {};
  const byDay = {};
  const byType = {};
  const byTone = {};
  const byPlatform = {};

  for (const p of published) {
    const d = new Date(p.publishedAt);
    const hour = `${String(d.getHours()).padStart(2, '0')}:00`;
    byHour[hour] = (byHour[hour] || 0) + 1;
    byDay[DAY_NAMES[d.getDay()]] = (byDay[DAY_NAMES[d.getDay()]] || 0) + 1;
    byType[p.contentType || 'post'] = (byType[p.contentType || 'post'] || 0) + 1;
    if (p.tone) byTone[p.tone] = (byTone[p.tone] || 0) + 1;
    byPlatform[p.platform || 'multi'] = (byPlatform[p.platform || 'multi'] || 0) + 1;
  }

  const hour = modeKey(byHour);
  const day = modeKey(byDay);
  const format = modeKey(byType);
  const tone = modeKey(byTone);
  const platform = modeKey(byPlatform);

  return {
    bestHour: hour
      ? realInsight(hour.key, `${hour.count} pubblicazioni in questa fascia`)
      : pendingInsight('orario migliore'),
    bestDay: day
      ? realInsight(capitalize(day.key), `${day.count} pubblicazioni`)
      : pendingInsight('giorno migliore'),
    bestFormat: format
      ? realInsight(formatContentType(format.key), `${format.count} contenuti`)
      : pendingInsight('formato migliore'),
    bestStyle: tone
      ? realInsight(tone.key, `${tone.count} contenuti con questo tono`)
      : {
        value: 'Non disponibile',
        detail: 'Nessuno stile/tono registrato sui post',
        quality: 'pending',
      },
    bestPlatform: platform
      ? realInsight(platform.key, `${platform.count} pubblicazioni`)
      : pendingInsight('piattaforma migliore'),
    note: 'Insights operativi da calendario pubblicazioni (non da Meta Insights).',
  };
}

function pendingInsight(label) {
  return {
    value: 'In attesa dati',
    detail: label,
    quality: 'pending',
  };
}

function realInsight(value, detail) {
  return { value, detail, quality: 'real' };
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatContentType(type) {
  const map = {
    post: 'Feed post',
    story: 'Story',
    reel: 'Reel',
    carousel: 'Carousel',
  };
  return map[type] || type;
}

/**
 * Monthly goals / KPIs — mix of real + pending.
 */
export function buildAnalyticsGoals({ stats, posts, billing }) {
  const published = publishedPosts(posts);
  const monthStart = startOfMonth();
  const postsThisMonth = published.filter(
    (p) => new Date(p.publishedAt) >= monthStart,
  ).length;
  const backendMonth = stats?.metrics?.postsThisMonth;
  const monthCount = typeof backendMonth === 'number' ? backendMonth : postsThisMonth;
  const streak = stats?.metrics?.streak ?? 0;
  const creditsUsed = billing?.aiCreditsUsed;
  const creditsLimit = billing?.aiCreditsLimit;
  const creditsRemaining = (creditsLimit != null && creditsUsed != null)
    ? Math.max(0, creditsLimit - creditsUsed)
    : null;

  return [
    {
      id: 'month-posts',
      label: 'Pubblicazioni questo mese',
      value: String(monthCount),
      quality: 'real',
    },
    {
      id: 'reach-goal',
      label: 'Reach',
      value: 'In attesa dati',
      quality: 'pending',
    },
    {
      id: 'engagement-goal',
      label: 'Engagement',
      value: 'Non disponibile',
      quality: 'pending',
    },
    {
      id: 'streak-goal',
      label: 'Streak',
      value: `${streak} giorni`,
      quality: 'real',
    },
    {
      id: 'credits-used',
      label: 'Crediti consumati',
      value: creditsUsed != null ? String(creditsUsed) : 'Non disponibile',
      quality: creditsUsed != null ? 'real' : 'pending',
    },
    {
      id: 'credits-available',
      label: 'Crediti disponibili',
      value: creditsRemaining != null ? String(creditsRemaining) : 'Non disponibile',
      quality: creditsRemaining != null ? 'real' : 'pending',
    },
  ];
}

/**
 * Metadata report for developers / UI footer.
 */
export function getAnalyticsDataReport() {
  return {
    real: [
      'Post programmati + prossima pubblicazione',
      'Streak giorni consecutivi',
      'Top Post (metadati operativi: progetto/data/piattaforma)',
      'Pubblicazioni questo mese',
      'Crediti AI consumati / disponibili',
      'Insights operativi: giorno/ora/formato/piattaforma più usati',
      'Performance IA basata su frequenza e CTA (senza % inventate)',
    ],
    apiDependent: [
      'Visualizzazioni (richiede Instagram/Facebook Insights API)',
      'Reach (Insights API)',
      'Engagement rate + interazioni (likes, commenti, share, save)',
      'Trend % engagement / views su 7 giorni da Meta',
      'Suggerimenti “+X% engagement” data-driven da Insights',
    ],
    temporarilyUnavailable: [
      'Visualizzazioni totali (viewCount attuale è stima interna — nascosta)',
      'Reach',
      'Engagement % e conteggio interazioni',
      VIEW_COUNT_IS_ESTIMATE ? 'Qualsiasi totale views da estimateMockViews' : null,
    ].filter(Boolean),
    future: [
      'Instagram Graph Insights sync',
      'Facebook Page Insights sync',
      'Ranking Top Post per engagement reale',
      'Heatmap orari con performance Insights',
      'Obiettivi reach/engagement con target brand',
    ],
  };
}

export { formatCount, formatShortDate, formatDateTime };
