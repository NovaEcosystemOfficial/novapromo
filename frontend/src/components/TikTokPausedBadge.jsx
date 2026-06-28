import { isTikTokEnabled } from '../lib/features.js';
import '../styles/auth.css';

export default function TikTokPausedBadge({ className = '' }) {
  if (isTikTokEnabled()) return null;

  return (
    <span className={`tiktok-paused-badge ${className}`.trim()} title="Integrazione TikTok temporaneamente disattivata">
      TikTok paused
    </span>
  );
}
