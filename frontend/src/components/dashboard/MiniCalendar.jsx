import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  getDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { getProjectColor } from '../../constants/projects.js';
import { PLATFORM_LABELS } from '../../utils/labels.js';

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

const PLATFORM_ICON = { instagram: '📸', facebook: '📘', tiktok: '🎵', both: '◇', multi: '✦' };

export default function MiniCalendar({ posts = [] }) {
  const [month, setMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const startPad = (getDay(startOfMonth(month)) + 6) % 7;

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const post of posts) {
      const dateStr = post.scheduledAt || post.publishedAt;
      if (!dateStr) continue;
      const key = format(new Date(dateStr), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(post);
    }
    return map;
  }, [posts]);

  return (
    <div>
      <div className="dash-panel-header">
        <span className="dash-panel-title">Calendario</span>
        <div className="dash-cal-nav">
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} aria-label="Mese precedente">‹</button>
          <span className="dash-cal-month">{format(month, 'MMMM yyyy', { locale: it })}</span>
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))} aria-label="Mese successivo">›</button>
        </div>
      </div>

      <div className="dash-cal-weekdays">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="dash-cal-weekday">{d}</div>
        ))}
      </div>

      <div className="dash-cal-days dash-cal-days--rich">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="dash-cal-day dash-cal-day--empty" />
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayPosts = eventsByDay.get(key) || [];

          return (
            <div
              key={key}
              className={[
                'dash-cal-day',
                'dash-cal-day--rich',
                isToday(day) && 'dash-cal-day--today',
                dayPosts.length > 0 && 'dash-cal-day--has-event',
              ].filter(Boolean).join(' ')}
            >
              <span className="dash-cal-day-num">{format(day, 'd')}</span>
              <div className="dash-cal-events">
                {dayPosts.slice(0, 2).map((p) => (
                  <div
                    key={p.id}
                    className="dash-cal-event"
                    style={{
                      borderLeftColor: getProjectColor(p.project),
                      background: `linear-gradient(90deg, rgba(${hexToRgb(getProjectColor(p.project))}, 0.18), transparent)`,
                    }}
                    title={`${p.project} — ${PLATFORM_LABELS[p.platform]}`}
                  >
                    <span className="dash-cal-event-name">{p.project}</span>
                    <span className="dash-cal-event-time">
                      {format(new Date(p.scheduledAt || p.publishedAt), 'HH:mm')}
                      {' '}{PLATFORM_ICON[p.platform]}
                    </span>
                  </div>
                ))}
                {dayPosts.length > 2 && (
                  <span className="dash-cal-more">+{dayPosts.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
