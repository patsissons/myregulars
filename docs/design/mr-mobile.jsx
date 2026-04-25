// MyRegulars — Mobile screens (Modern Minimal)
// Each screen is a function component receiving { theme, route, nav, vault, ... }.
// Routes: 'onboarding' | 'connector' | 'vaults' | 'createVault' | 'vault' | 'location' | 'person' | 'edit'

const { useState, useEffect, useRef, useMemo } = React;

// ─── Onboarding ──────────────────────────────────────────────
function MobOnboarding({ theme, nav }) {
  const c = MR_PAL[theme];
  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, padding: '70px 28px 36px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ flex: 1 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: c.text, color: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, marginBottom: 30 }}>R</div>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.08 }}>
          Remember the people<br/>at the places you go.
        </div>
        <div style={{ fontSize: 15, color: c.dim, marginTop: 14, lineHeight: 1.5 }}>
          A small, private notebook for the regulars in your life. Your data stays in your own GitHub Gist — yours to keep, share, or take with you.
        </div>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['Organized by place', 'Café, gym, bar — wherever you\'re a regular.'],
            ['Quick before you walk in', 'Glance at faces and details in seconds.'],
            ['Yours to share', 'Give a partner read-only access with one link.'],
          ].map(([t, d], i) => (
            <div key={t} className="mr-list-item" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animationDelay: `${0.1 + i*0.08}s` }}>
              <div style={{ width: 6, height: 6, borderRadius: 6, background: c.accent, marginTop: 8, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div>
                <div style={{ fontSize: 13, color: c.dim, marginTop: 2 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <button className="mr-btn" onClick={() => nav('connector')} style={{ ...mrBtn.primary(c), width: '100%', padding: '14px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          Get started
        </button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: c.faint }}>Have a vault link? Paste it after sign-in.</div>
      </div>
    </div>
  );
}

// ─── Connector ──────────────────────────────────────────────
function MobConnector({ theme, nav, onConnect }) {
  const c = MR_PAL[theme];
  const [loading, setLoading] = useState(false);
  const handle = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onConnect(); }, 1100);
  };
  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, padding: '60px 24px 36px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <button className="mr-btn" onClick={() => nav('onboarding')} style={{ ...mrBtn.icon(c), alignSelf: 'flex-start', marginBottom: 18 }}><MRIcon name="arrow-left" /></button>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em' }}>Connect a datastore</div>
      <div style={{ fontSize: 14, color: c.dim, marginTop: 6, lineHeight: 1.5 }}>
        Your vaults live in your own datastore. Pick a provider — you can always add more later.
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ProviderRow c={c} icon="github" name="GitHub Gists" detail="Recommended · v1 provider" available onClick={handle} loading={loading} />
        <ProviderRow c={c} icon="link" name="Local file" detail="Coming soon" />
        <ProviderRow c={c} icon="link" name="Dropbox" detail="Coming soon" />
        <ProviderRow c={c} icon="link" name="Google Drive" detail="Coming soon" />
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 12, color: c.faint, lineHeight: 1.5 }}>
        We never store your data. You'll be redirected to GitHub to authorize a private Gist.
      </div>
    </div>
  );
}
function ProviderRow({ c, icon, name, detail, available, onClick, loading }) {
  return (
    <button className="mr-btn" disabled={!available} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 14px',
      background: available ? c.panel : 'transparent', border: `1px solid ${available ? c.edge : c.edge}`,
      borderRadius: 12, cursor: available ? 'pointer' : 'default', opacity: available ? 1 : 0.55,
      fontFamily: MR_FAMILY, color: c.text, textAlign: 'left',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: c.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MRIcon name={icon} size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 12, color: c.dim, marginTop: 1 }}>{detail}</div>
      </div>
      {loading ? (
        <div className="mr-spin" style={{ width: 16, height: 16, border: `2px solid ${c.edge}`, borderTopColor: c.accent, borderRadius: 16 }} />
      ) : available ? <MRIcon name="chevron-right" color={c.dim} /> : null}
    </button>
  );
}

// ─── Vault selector ──────────────────────────────────────────
function MobVaults({ theme, nav, vaults, openVault, onCreate }) {
  const c = MR_PAL[theme];
  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, display: 'flex', flexDirection: 'column' }}>
      <MobStatusBar c={c} />
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{ fontSize: 11, color: c.faint, letterSpacing: '0.04em' }}>Signed in · github.com/sam</div>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 8 }}>Your vaults</div>
        <div style={{ fontSize: 13, color: c.dim, marginTop: 2 }}>Pick one to open, or start a new one.</div>
      </div>
      <div style={{ flex: 1, padding: '20px 16px 16px', overflow: 'auto' }}>
        {vaults.map((v, i) => (
          <button key={v.id} className="mr-list-item mr-btn" onClick={() => openVault(v.id)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: c.panel, border: `1px solid ${c.edge}`, borderRadius: 14,
            padding: 14, marginBottom: 10, cursor: 'pointer', fontFamily: MR_FAMILY, color: c.text,
            animationDelay: `${i*0.06}s`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{v.name}</div>
              <MRIcon name="chevron-right" color={c.faint} />
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: c.dim }}>
              <span>{v.locations} places</span>
              <span>{v.people} people</span>
              <span>·</span>
              <span>opened {v.lastOpened}</span>
            </div>
            <div style={{ fontSize: 11, color: c.faint, marginTop: 8, fontFeatureSettings: '"tnum"' }}>{v.uri}</div>
          </button>
        ))}
        <button className="mr-btn" onClick={onCreate} style={{
          width: '100%', textAlign: 'left',
          background: 'transparent', border: `1.5px dashed ${c.edge}`, borderRadius: 14,
          padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
          fontFamily: MR_FAMILY, color: c.text, marginTop: 4,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: c.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MRIcon name="plus" size={18} color={c.dim} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>New vault</div>
            <div style={{ fontSize: 12, color: c.dim, marginTop: 1 }}>A fresh notebook</div>
          </div>
        </button>
        <div style={{ marginTop: 22, padding: '0 4px' }}>
          <MRLabel c={c}>Or open by link</MRLabel>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <input className="mr-input" placeholder="gist:abc123… or paste URL" style={{
              flex: 1, padding: '10px 12px', borderRadius: 8, background: c.subtle, fontSize: 13,
            }} />
            <button className="mr-btn" style={mrBtn.subtle(c)}>Open</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vault overview (location list) ───────────────────────────
function MobVault({ theme, nav, vault, onShare, onSettings }) {
  const c = MR_PAL[theme];
  const total = vault.locations.reduce((n,l)=>n+l.groups.reduce((m,g)=>m+g.people.length,0),0);
  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, display: 'flex', flexDirection: 'column' }}>
      <MobStatusBar c={c} />
      <div style={{ padding: '6px 12px 0', display: 'flex', justifyContent: 'space-between' }}>
        <button className="mr-btn" onClick={() => nav('vaults')} style={mrBtn.icon(c)}><MRIcon name="arrow-left" /></button>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="mr-btn" onClick={onShare} style={mrBtn.icon(c)}><MRIcon name="share" /></button>
          <button className="mr-btn" onClick={onSettings} style={mrBtn.icon(c)}><MRIcon name="settings" /></button>
        </div>
      </div>
      <div style={{ padding: '4px 22px 14px' }}>
        <MRLabel c={c}>Vault</MRLabel>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 4 }}>{vault.name}</div>
        <div style={{ fontSize: 13, color: c.dim, marginTop: 4 }}>{vault.locations.length} places · {total} people</div>
      </div>
      <div style={{ padding: '0 18px 12px' }}>
        <div className="mr-btn" style={{ background: c.subtle, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: c.faint, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <MRIcon name="search" color={c.faint} />
          <span>Search vault</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px 100px' }}>
        <div style={{ padding: '4px 10px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <MRLabel c={c}>Places</MRLabel>
          <span style={{ fontSize: 11, color: c.faint }}>{vault.locations.length}</span>
        </div>
        <div style={{ background: c.panel, border: `1px solid ${c.edge}`, borderRadius: 14, overflow: 'hidden' }}>
          {vault.locations.map((l, i) => {
            const total = l.groups.reduce((n,g)=>n+g.people.length,0);
            const recent = [].concat(...l.groups.map(g=>g.people)).sort((a,b)=>daysAgo(a.lastSeen)-daysAgo(b.lastSeen)).slice(0,3);
            return (
              <button key={l.id} className="mr-row mr-list-item mr-btn" onClick={() => nav('location', { locationId: l.id })}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', padding: '14px 14px',
                  borderTop: i ? `1px solid ${c.edge}` : 'none', cursor: 'pointer',
                  fontFamily: MR_FAMILY, color: c.text, animationDelay: `${i*0.05}s`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: c.dim, marginTop: 2 }}>{l.description} · {total} {total === 1 ? 'person' : 'people'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex' }}>
                      {recent.map((p, j) => (
                        <div key={p.id} style={{ marginLeft: j === 0 ? 0 : -8 }}>
                          <MRAvatar initials={p.initials} size={22} theme={theme} style={{ boxShadow: `0 0 0 2px ${c.panel}` }} />
                        </div>
                      ))}
                    </div>
                    <MRIcon name="chevron-right" color={c.faint} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button className="mr-btn" style={{
          marginTop: 14, width: '100%', padding: '12px', borderRadius: 12,
          background: 'transparent', border: `1.5px dashed ${c.edge}`, color: c.dim,
          fontFamily: MR_FAMILY, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <MRIcon name="plus" size={14} /> Add a place
        </button>
      </div>
    </div>
  );
}

// ─── Location detail ─────────────────────────────────────────
function MobLocation({ theme, nav, vault, locationId, onAddPerson, onLogVisit }) {
  const c = MR_PAL[theme];
  const loc = vault.locations.find(l => l.id === locationId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | groupId
  const filteredGroups = useMemo(() => {
    let groups = filter === 'all' ? loc.groups : loc.groups.filter(g => g.id === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      groups = groups.map(g => ({ ...g, people: g.people.filter(p => p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q)) }))
                     .filter(g => g.people.length);
    }
    return groups;
  }, [loc, filter, search]);

  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <MobStatusBar c={c} />
      <div style={{ padding: '6px 12px 0', display: 'flex', justifyContent: 'space-between' }}>
        <button className="mr-btn" onClick={() => nav('vault')} style={mrBtn.icon(c)}><MRIcon name="arrow-left" /></button>
        <button className="mr-btn" style={mrBtn.icon(c)}><MRIcon name="more" /></button>
      </div>
      <div style={{ padding: '4px 22px 12px' }}>
        <MRLabel c={c}>Place</MRLabel>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{loc.name}</div>
        <div style={{ fontSize: 13, color: c.dim, marginTop: 2 }}>{loc.description} · {loc.groups.reduce((n,g)=>n+g.people.length,0)} people</div>
      </div>

      <div style={{ padding: '0 18px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, background: c.subtle, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MRIcon name="search" size={14} color={c.faint} />
          <input className="mr-input" placeholder="Search this place" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 14 }} />
        </div>
      </div>
      <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, overflow: 'auto' }}>
        {[{ id: 'all', name: 'All' }, ...loc.groups].map(g => (
          <button key={g.id} onClick={() => setFilter(g.id)} className="mr-btn" style={{
            padding: '6px 12px', borderRadius: 999, border: `1px solid ${c.edge}`,
            background: filter === g.id ? c.text : 'transparent', color: filter === g.id ? c.bg : c.text,
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: MR_FAMILY, whiteSpace: 'nowrap',
          }}>{g.name}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 100px' }}>
        {filteredGroups.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: c.dim }}>
            <div style={{ fontSize: 14 }}>No matches</div>
            <div style={{ fontSize: 12, color: c.faint, marginTop: 4 }}>Try a different search</div>
          </div>
        ) : filteredGroups.map(g => (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 8px' }}>
              <MRLabel c={c}>{g.name}</MRLabel>
              <span style={{ fontSize: 11, color: c.faint }}>{g.people.length}</span>
            </div>
            <div style={{ background: c.panel, border: `1px solid ${c.edge}`, borderRadius: 14, overflow: 'hidden' }}>
              {g.people.map((p, i) => (
                <PersonRow key={p.id} c={c} theme={theme} p={p} divider={i > 0}
                  onClick={() => nav('person', { personId: p.id, locationId: loc.id })}
                  onSeen={() => onLogVisit(p.id, loc.id)}
                  delay={i * 0.04}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button className="mr-btn mr-pop" onClick={() => onAddPerson(loc.id)} style={{
        position: 'absolute', right: 22, bottom: 32, height: 54, padding: '0 22px 0 18px',
        borderRadius: 28, background: c.text, color: c.bg, border: 'none',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600,
        boxShadow: '0 14px 30px rgba(0,0,0,0.22)', fontFamily: MR_FAMILY, cursor: 'pointer',
      }}>
        <MRIcon name="plus" size={16} color={c.bg} /> Add person
      </button>
    </div>
  );
}

// Swipeable row — drag right reveals "Saw today"
function PersonRow({ c, theme, p, divider, onClick, onSeen, delay = 0 }) {
  const [dx, setDx] = useState(0);
  const [seen, setSeen] = useState(false);
  const startX = useRef(null);
  const onStart = (e) => { startX.current = e.touches ? e.touches[0].clientX : e.clientX; };
  const onMove = (e) => {
    if (startX.current == null) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setDx(Math.max(0, Math.min(120, x - startX.current)));
  };
  const onEnd = () => {
    if (dx > 70 && !seen) { setSeen(true); onSeen?.(); setTimeout(() => setDx(0), 600); }
    else setDx(0);
    startX.current = null;
  };
  return (
    <div className="mr-list-item" style={{ position: 'relative', borderTop: divider ? `1px solid ${c.edge}` : 'none', overflow: 'hidden', animationDelay: `${delay}s` }}>
      {/* Reveal track */}
      <div style={{
        position: 'absolute', inset: 0, background: c.accentSoft, color: c.accent,
        display: 'flex', alignItems: 'center', paddingLeft: 18, fontSize: 13, fontWeight: 600, gap: 8,
      }}>
        <MRIcon name="check" size={14} color={c.accent} /> {seen ? 'Logged today' : 'Swipe to log a visit'}
      </div>
      <div onClick={onClick}
        onMouseDown={onStart} onMouseMove={dx ? onMove : null} onMouseUp={onEnd} onMouseLeave={dx ? onEnd : null}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        className="mr-row mr-clickable"
        style={{
          position: 'relative', background: c.panel, display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', transform: `translateX(${dx}px)`,
          transition: startX.current == null ? 'transform .25s cubic-bezier(.2,.7,.3,1)' : 'none',
        }}>
        <MRAvatar initials={p.initials} size={36} theme={theme} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>{p.name}</div>
          <div style={{ fontSize: 13, color: c.dim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.detail}</div>
        </div>
        <div style={{ fontSize: 11, color: c.faint, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{lastSeenLabel(p.lastSeen)}</div>
      </div>
    </div>
  );
}

function MobStatusBar({ c }) {
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', fontSize: 14, fontWeight: 600, color: c.text }}>
      <span>9:41</span>
      <span style={{ fontSize: 12 }}>•••• 5G</span>
    </div>
  );
}

window.MR_MOBILE = {
  MobOnboarding, MobConnector, MobVaults, MobVault, MobLocation, MobStatusBar, PersonRow,
};
