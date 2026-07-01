interface Shortcut {
  key: string;
  desc: string;
}

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'T', desc: 'Toggle theater / cinema mode' },
  { key: 'Esc', desc: 'Exit theater mode' },
  { key: 'N', desc: 'Play next video in queue' },
  { key: 'K', desc: 'Toggle proxy / direct mode' },
  { key: '/', desc: 'Focus search input' },
  { key: '?', desc: 'Show this cheat sheet' },
];

function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        role="document"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          maxWidth: '400px',
          width: '90%',
          padding: '2rem',
        }}
      >
        <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>
          ⌨ Keyboard Shortcuts
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <kbd
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: 'var(--accent-color)',
                }}
              >
                {s.key}
              </kbd>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {s.desc}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          autoFocus
          className="btn-primary"
          style={{ marginTop: '1.5rem', width: '100%' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default ShortcutsModal;
