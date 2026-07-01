import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  getDay,
  isSameDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { getProjectColor } from '../../constants/projects.js';
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS } from '../../utils/labels.js';
import { useContentModal } from '../../context/ContentModalContext.jsx';
import StatusBadge from '../StatusBadge.jsx';

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export default function PlannerCalendar({ posts = [] }) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(() => new Date());
  const { openModal } = useContentModal();

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

  const selectedKey = format(selected, 'yyyy-MM-dd');
  const selectedPosts = eventsByDay.get(selectedKey) || [];

  return (
    <section className="ndl-panel ndl-planner">
      <header className="ndl-panel__head">
        <div>
          <h2 className="ndl-panel__title">Planner</h2>
          <p className="ndl-panel__sub">Calendario editoriale</p>
        </div>
        <div className="ndl-planner__nav">
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} aria-label="Mese precedente">‹</button>
          <span>{format(month, 'MMMM yyyy', { locale: it })}</span>
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))} aria-label="Mese successivo">›</button>
        </div>
      </header>

      <div className="ndl-planner__body">
        <div className="ndl-planner__grid-wrap">
          <div className="ndl-planner__weekdays">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="ndl-planner__grid">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="ndl-planner__cell ndl-planner__cell--empty" />
            ))}
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const count = (eventsByDay.get(key) || []).length;
              const isSelected = isSameDay(day, selected);

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    'ndl-planner__cell',
                    isToday(day) && 'ndl-planner__cell--today',
                    count > 0 && 'ndl-planner__cell--has',
                    isSelected && 'ndl-planner__cell--selected',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelected(day)}
                >
                  {format(day, 'd')}
                  {count > 0 && <i className="ndl-planner__marker" />}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="ndl-planner__sidebar">
          <p className="ndl-planner__sidebar-title">
            {format(selected, 'EEEE d MMMM', { locale: it })}
          </p>

          {selectedPosts.length === 0 ? (
            <div className="ndl-empty ndl-empty--compact">
              <p>Nessun contenuto in questo giorno.</p>
              <button type="button" className="ndl-link" onClick={() => openModal()}>
                Programma contenuto
              </button>
            </div>
          ) : (
            <ul className="ndl-planner__events">
              {selectedPosts.map((p) => (
                <li key={p.id} className="ndl-planner__event">
                  <span
                    className="ndl-planner__event-accent"
                    style={{ background: getProjectColor(p.project) }}
                  />
                  <div className="ndl-planner__event-body">
                    <span className="ndl-planner__event-time">
                      {format(new Date(p.scheduledAt || p.publishedAt), 'HH:mm')}
                    </span>
                    <span className="ndl-planner__event-name">{p.project}</span>
                    <span className="ndl-planner__event-meta">
                      {PLATFORM_LABELS[p.platform]} · {CONTENT_TYPE_LABELS[p.contentType]}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link to="/calendar" className="ndl-panel__link">Vista calendario completa</Link>
        </aside>
      </div>
    </section>
  );
}
