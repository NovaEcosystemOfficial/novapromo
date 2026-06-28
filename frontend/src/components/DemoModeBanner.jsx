import { isDemoMode } from '../lib/features.js';
import { DEMO_BACKEND_MESSAGE } from '../lib/demo.js';

export default function DemoModeBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      className="alert alert-info"
      style={{
        margin: '0 0 1rem',
        borderRadius: '8px',
        fontSize: '0.9rem',
      }}
      role="status"
    >
      <strong>Modalità demo</strong> — {DEMO_BACKEND_MESSAGE}
    </div>
  );
}
