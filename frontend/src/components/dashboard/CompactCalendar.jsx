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
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, formatDateTime } from '../../utils/labels.js';
import { useContentModal } from '../../context/ContentModalContext.jsx';

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export default function CompactCalendar({ posts = [] }) {
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
    <section className="cc-panel">
      <header className="cc-panel__header">
        <h2 className="cc-panel__title">Calendario</h2>
        <div className="cc-cal__nav">
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} aria-label="Mese precedente">‹</button>
          <span>{format(month, 'MMM yyyy', { locale: it })}</span>
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))} aria-label="Mese successivo">›</button>
        </div>
      </header>

      <div className="cc-cal__weekdays">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="cc-cal__grid">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="cc-cal__cell cc-cal__cell--empty" />
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
                'cc-cal__cell',
                isToday(day) && 'cc-cal__cell--today',
                count > 0 && 'cc-cal__cell--has',
                isSelected && 'cc-cal__cell--selected',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelected(day)}
            >
              <span>{format(day, 'd')}</span>
              {count > 0 && <i className="cc-cal__dot" style={{ background: getProjectColor((eventsByDay.get(key) || [])[0]?.project) }} />}
            </button>
          );
        })}
      </div>

      <div className="cc-cal__day-detail">
        <p className="cc-cal__day-title">{format(selected, "EEEE d MMMM", { locale: it })}</p>
        {selectedPosts.length === 0 ? (
          <div className="cc-empty cc-empty--inline">
            <p className="cc-empty__body">Nessun contenuto in questo giorno.</p>
            <button type="button" className="cc-link-btn" onClick={() => openModal()}>
              Programma il prossimo contenuto
            </button>
          </div>
        ) : (
          <ul className="cc-cal__day-list">
            {selectedPosts.map((p) => (
              <li key={p.id} className="cc-cal__day-item">
                <span className="cc-cal__day-time">{format(new Date(p.scheduledAt || p.publishedAt), 'HH:mm')}</span>
                <span className="cc-cal__day-name" style={{ color: getProjectColor(p.project) }}>{p.project}</span>
                <span className="cc-cal__day-meta">{PLATFORM_LABELS[p.platform]} · {CONTENT_TYPE_LABELS[p.contentType]}</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/calendar" className="cc-panel__link">Calendario completo →</Link>
      </div>
    </section>
  );
}
