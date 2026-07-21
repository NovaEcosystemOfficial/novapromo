import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  getDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { api } from '../api/client.js';
import { getProjectColor } from '../constants/projects.js';
import { PLATFORM_LABELS } from '../utils/labels.js';
import { useContentModal } from '../context/ContentModalContext.jsx';
import '../styles/calendar.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const PLATFORM_ICON = { instagram: '📸', facebook: '📘', tiktok: '🎵', both: '◇', multi: '✦' };

export default function Calendar() {
  const { openModal } = useContentModal();
  const [posts, setPosts] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPosts()
      .then((all) => setPosts(all.filter((p) => p.scheduledAt || p.publishedAt)))
      .catch((err) => setError(err.message));
  }, []);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startPad = (getDay(startOfMonth(currentMonth)) + 6) % 7;

  const postsForDay = (day) =>
    posts.filter((p) => {
      const d = p.scheduledAt || p.publishedAt;
      return d && isSameDay(new Date(d), day);
    });

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <>
      <div className="page-header cal-page-header">
        <div>
          <h2>Calendario pubblicazioni</h2>
          <p>Programma la settimana — ogni progetto ha il suo colore</p>
        </div>
        <div className="cal-header-actions">
          <button type="button" className="btn btn-primary" onClick={() => openModal()}>
            + Nuovo contenuto
          </button>
          <div className="cal-nav">
            <button type="button" className="btn btn-secondary btn-sm" aria-label="Mese precedente" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}>←</button>
            <span className="cal-month-label">{format(currentMonth, 'MMMM yyyy', { locale: it })}</span>
            <button type="button" className="btn btn-secondary btn-sm" aria-label="Mese successivo" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}>→</button>
          </div>
        </div>
      </div>

      <div className="cal-legend">
        {['NovaDocs', 'NovaMobile', 'NovaWeb', 'Beauty Souls', 'NovaTK', 'Ryuk', 'ECHO-0'].map((name) => (
          <span key={name} className="cal-legend-item" style={{ '--leg-color': getProjectColor(name) }}>
            <span className="cal-legend-dot" />
            {name}
          </span>
        ))}
      </div>

      <div className="cal-board">
        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>

        <div className="cal-days">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="cal-day cal-day--empty" />
          ))}
          {days.map((day) => {
            const dayPosts = postsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`cal-day${isToday(day) ? ' cal-day--today' : ''}${dayPosts.length ? ' cal-day--active' : ''}`}
              >
                <div className="cal-day-num">{format(day, 'd')}</div>
                <div className="cal-day-events">
                  {dayPosts.map((p) => (
                    <div
                      key={p.id}
                      className="cal-event"
                      style={{
                        borderLeftColor: getProjectColor(p.project),
                        background: `linear-gradient(90deg, rgba(${hexToRgb(getProjectColor(p.project))}, 0.2), rgba(${hexToRgb(getProjectColor(p.project))}, 0.05))`,
                      }}
                    >
                      <div className="cal-event-name">{p.project}</div>
                      <div className="cal-event-meta">
                        {format(new Date(p.scheduledAt || p.publishedAt), 'HH:mm')}
                        <span>·</span>
                        {PLATFORM_ICON[p.platform]} {PLATFORM_LABELS[p.platform]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}
