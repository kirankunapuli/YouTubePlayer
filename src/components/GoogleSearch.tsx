import { useEffect, useRef } from 'react';

const CX = '004488094107826005610:qizef8dq4is';

/** Minimal typing for the Google CSE global. */
interface GoogleCseWindow extends Window {
  google?: {
    search?: {
      cse?: {
        element?: {
          render?: (opts: { div: string; tag: string }) => void;
        };
      };
    };
  };
  __gcse?: { parsetags?: string; callback?: () => void };
}

function GoogleSearch() {
  const rendered = useRef(false);

  useEffect(() => {
    const w = window as GoogleCseWindow;
    const tryRender = () => {
      if (rendered.current) return;
      if (typeof w.google?.search?.cse?.element?.render === 'function') {
        w.google.search.cse.element.render({ div: 'gcse-search', tag: 'search' });
        rendered.current = true;
      }
    };

    w.__gcse = w.__gcse || {};
    w.__gcse.parsetags = 'explicit';
    w.__gcse.callback = tryRender;

    if (!document.getElementById('gcse-script')) {
      const gcse = document.createElement('script');
      gcse.id = 'gcse-script';
      gcse.async = true;
      gcse.src = `https://cse.google.com/cse.js?cx=${CX}`;
      document.head.appendChild(gcse);
    } else {
      tryRender();
    }

    return () => {
      rendered.current = false;
      document.querySelectorAll('.gsc-results-wrapper-overlay, .gsc-modal-background-image')
        .forEach(el => el.remove());
    };
  }, []);

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', padding: '1rem', minHeight: '400px' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>Google Web Search</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
        Find a video, copy its <strong>Video ID</strong> from the URL (<code>watch?v=</code>), then paste it in the search bar above to play.
      </p>
      <div id="gcse-search"></div>
    </div>
  );
}

export default GoogleSearch;
