import { useEffect } from 'react';
import { useContentModal } from '../context/ContentModalContext.jsx';

export default function Generator() {
  const { openModal } = useContentModal();

  useEffect(() => {
    openModal();
  }, [openModal]);

  return (
    <div className="empty-state">
      <p>Il generatore si apre nella modale.</p>
      <button type="button" className="btn btn-primary" onClick={() => openModal()}>
        + Nuovo contenuto
      </button>
    </div>
  );
}
