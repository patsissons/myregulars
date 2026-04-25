// MyRegulars — Modern Minimal palette + shared primitives
// Single source of truth for tokens, type, and small components.

window.MR_PAL = {
  light: {
    bg: '#fbfbfa', panel: '#ffffff', subtle: '#f6f5f3', edge: 'rgba(15,15,15,0.08)', edgeStrong: 'rgba(15,15,15,0.16)',
    text: '#111111', dim: '#6b6b6b', faint: '#9a9a9a',
    accent: '#3b6cdc', accentText: '#ffffff', accentSoft: 'rgba(59,108,220,0.10)', accentSoftBorder: 'rgba(59,108,220,0.22)',
    chip: '#f1f1ef', chipText: '#3a3a3a',
    danger: '#c94a3b',
    overlay: 'rgba(20,20,20,0.42)',
  },
  dark: {
    bg: '#0e0e0f', panel: '#17171a', subtle: '#121214', edge: 'rgba(255,255,255,0.08)', edgeStrong: 'rgba(255,255,255,0.16)',
    text: '#f3f3f2', dim: '#a0a0a0', faint: '#6a6a6a',
    accent: '#7ea2ff', accentText: '#0b0b0c', accentSoft: 'rgba(126,162,255,0.14)', accentSoftBorder: 'rgba(126,162,255,0.30)',
    chip: '#222226', chipText: '#dcdcdc',
    danger: '#f08272',
    overlay: 'rgba(0,0,0,0.55)',
  },
};

window.MR_FAMILY = '"Geist", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
window.MR_FEATURES = '"ss01","cv11","tnum"';

// Inject global stylesheet once (motion, focus, scrollbars).
(function injectStyles(){
  if (document.getElementById('mr-global')) return;
  const s = document.createElement('style');
  s.id = 'mr-global';
  s.textContent = `
    @keyframes mrFadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
    @keyframes mrSlideUp { from { transform: translateY(12px) } to { transform: none } }
    @keyframes mrSlideRight { from { transform: translateX(14px) } to { transform: none } }
    @keyframes mrSlideLeft { from { transform: translateX(-14px) } to { transform: none } }
    @keyframes mrPop { 0% { transform: scale(.92) } 60% { transform: scale(1.02) } 100% { transform: scale(1) } }
    @keyframes mrPulse { 0%, 100% { opacity: 1 } 50% { opacity: .55 } }
    @keyframes mrSpin { to { transform: rotate(360deg) } }
    @keyframes mrSheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
    .mr-list-item { animation: mrSlideUp .32s cubic-bezier(.2,.7,.3,1) both; }
    .mr-fade { animation: mrFadeIn .25s ease-out both; }
    .mr-page { animation: mrSlideRight .26s cubic-bezier(.2,.7,.3,1) both; }
    .mr-page-back { animation: mrSlideLeft .26s cubic-bezier(.2,.7,.3,1) both; }
    .mr-pop { animation: mrPop .32s cubic-bezier(.2,.9,.3,1.1) both; }
    .mr-pulse { animation: mrPulse 1.4s ease-in-out infinite; }
    .mr-spin { animation: mrSpin .8s linear infinite; }
    .mr-sheet { animation: mrSheetIn .28s cubic-bezier(.2,.7,.3,1); }
    .mr-btn { transition: background .15s, color .15s, border-color .15s, transform .12s; }
    .mr-btn:active { transform: scale(.97); }
    .mr-row { transition: background .12s; }
    .mr-row:hover { background: var(--mr-rowhover, rgba(0,0,0,0.025)); }
    .mr-clickable { cursor: pointer; }
    .mr-input { background: transparent; border: none; outline: none; font: inherit; color: inherit; width: 100%; }
    *::selection { background: rgba(59,108,220,.22); }
  `;
  document.head.appendChild(s);
})();

// Small avatar with initials → stable hue
window.MRAvatar = function MRAvatar({ initials, size = 32, theme = 'light', style }) {
  const hue = hueFromString(initials || '');
  const bg = `oklch(${theme === 'dark' ? '0.32' : '0.92'} 0.04 ${hue})`;
  const fg = `oklch(${theme === 'dark' ? '0.86' : '0.30'} 0.07 ${hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: size, background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(10, size * 0.38), fontWeight: 600, letterSpacing: '0.02em', flexShrink: 0,
      ...style,
    }}>{initials}</div>
  );
};

// Reusable button styles
window.mrBtn = {
  primary: (c) => ({
    background: c.text, color: c.bg, border: 'none', borderRadius: 8,
    padding: '9px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: window.MR_FAMILY,
  }),
  primaryAccent: (c) => ({
    background: c.accent, color: c.accentText, border: 'none', borderRadius: 8,
    padding: '9px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: window.MR_FAMILY,
  }),
  ghost: (c) => ({
    background: 'transparent', color: c.text, border: `1px solid ${c.edge}`, borderRadius: 8,
    padding: '8px 13px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: window.MR_FAMILY,
  }),
  subtle: (c) => ({
    background: c.chip, color: c.chipText, border: 'none', borderRadius: 8,
    padding: '8px 13px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: window.MR_FAMILY,
  }),
  icon: (c) => ({
    background: 'transparent', color: c.dim, border: 'none', borderRadius: 6,
    width: 32, height: 32, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 16, padding: 0,
  }),
};

// Section heading (uppercase eyebrow)
window.MRLabel = function MRLabel({ children, c, style }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: c.dim, ...style,
    }}>{children}</div>
  );
};

// Small chip
window.MRChip = function MRChip({ c, children, onClick }) {
  return (
    <span onClick={onClick} className={onClick ? 'mr-clickable mr-btn' : ''} style={{
      fontSize: 12, padding: '4px 10px', borderRadius: 999, background: c.chip, color: c.chipText,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>{children}</span>
  );
};

// Tiny inline icons (stroke). Keep simple.
window.MRIcon = function MRIcon({ name, size = 16, color = 'currentColor' }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'plus': return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'check': return <svg {...props}><path d="M4 12.5l5 5L20 6.5"/></svg>;
    case 'arrow-left': return <svg {...props}><path d="M15 18l-6-6 6-6"/></svg>;
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'share': return <svg {...props}><path d="M12 4v12"/><path d="m7 9 5-5 5 5"/><path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'more': return <svg {...props}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
    case 'github': return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.7-.3 2.5-.3s1.7.1 2.5.3c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5C19.1 20.2 22 16.4 22 12c0-5.5-4.5-10-10-10z"/></svg>;
    case 'qr': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3"/></svg>;
    case 'copy': return <svg {...props}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>;
    case 'eye': return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'paw': return <svg {...props}><circle cx="5" cy="9" r="1.6"/><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="19" cy="9" r="1.6"/><path d="M7 17a5 5 0 0 1 10 0c0 2.5-2.5 3-5 3s-5-.5-5-3z"/></svg>;
    case 'pin': return <svg {...props}><path d="M12 21s-7-6-7-11a7 7 0 1 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>;
    case 'calendar': return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'link': return <svg {...props}><path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/></svg>;
    case 'x': return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'sparkle': return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M18.5 5.5l-2.8 2.8M8.3 15.7l-2.8 2.8"/></svg>;
    case 'sun': return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>;
    case 'moon': return <svg {...props}><path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/></svg>;
    case 'chevron-right': return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case 'pencil': return <svg {...props}><path d="M14 4l6 6L8 22H2v-6z"/><path d="M13 5l6 6"/></svg>;
    default: return null;
  }
};
