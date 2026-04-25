// MyRegulars — Desktop layout (Modern Minimal)
// Single window: left sidebar (locations + recent people), center (location detail),
// right detail rail (person detail when selected). Animated route transitions.

const { useState: useStateD, useMemo: useMemoD } = React;

function DeskApp({ theme, vault, route, nav, onShare, onAddPerson, onEditPerson, onLogVisit, readOnly }) {
  const c = MR_PAL[theme];
  const locationId = route.locationId || vault.locations[0].id;
  const personId = route.personId;
  const loc = vault.locations.find(l => l.id === locationId);

  return (
    <div style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFeatureSettings: MR_FEATURES }}>
      {/* App chrome */}
      <div style={{ height: 46, borderBottom: `1px solid ${c.edge}`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57','#febc2e','#28c840'].map(col => <div key={col} style={{ width: 11, height: 11, borderRadius: 11, background: col }} />)}
        </div>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: c.text, color: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginLeft: 10 }}>R</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{vault.name}</div>
        <span style={{ fontSize: 11, color: c.faint, marginLeft: 6 }}>· synced 2m ago</span>
        <div style={{ flex: 1 }} />
        <button onClick={onShare} className="mr-btn" style={{ ...mrBtn.subtle(c), display: 'flex', alignItems: 'center', gap: 6 }}>
          <MRIcon name="share" size={13} /> Share
        </button>
        <button className="mr-btn" style={mrBtn.icon(c)}><MRIcon name="settings" size={16} /></button>
        <button onClick={() => nav('vaults')} className="mr-btn" style={mrBtn.icon(c)}><MRIcon name="more" size={16} /></button>
      </div>

      {readOnly && <DeskReadOnlyBanner c={c} />}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <DeskSidebar c={c} theme={theme} vault={vault} locationId={locationId} personId={personId} nav={nav} />
        <DeskMain key={locationId} c={c} theme={theme} loc={loc} personId={personId} nav={nav} onAddPerson={onAddPerson} onLogVisit={onLogVisit} readOnly={readOnly} />
        {personId && <DeskPersonRail key={personId} c={c} theme={theme} loc={loc} personId={personId} nav={nav} onEdit={onEditPerson} onLogVisit={onLogVisit} readOnly={readOnly} />}
      </div>
    </div>
  );
}

function DeskSidebar({ c, theme, vault, locationId, personId, nav }) {
  const allRecent = useMemoD(() => {
    const all = [];
    for (const l of vault.locations) for (const g of l.groups) for (const p of g.people) all.push({ ...p, locationId: l.id, locationName: l.name });
    return all.sort((a,b)=>daysAgo(a.lastSeen)-daysAgo(b.lastSeen)).slice(0, 5);
  }, [vault]);

  return (
    <div style={{ width: 268, borderRight: `1px solid ${c.edge}`, padding: '14px 8px', overflow: 'auto', flexShrink: 0 }}>
      <div className="mr-btn" style={{ background: c.subtle, borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 14px' }}>
        <MRIcon name="search" size={13} color={c.faint} />
        <span style={{ fontSize: 12, color: c.faint, flex: 1 }}>Search vault</span>
        <span style={{ fontSize: 10, color: c.faint, padding: '2px 5px', border: `1px solid ${c.edge}`, borderRadius: 4 }}>⌘K</span>
      </div>

      <SidebarHeading c={c}>Places</SidebarHeading>
      {vault.locations.map((l, i) => {
        const active = l.id === locationId;
        const total = l.groups.reduce((n,g)=>n+g.people.length,0);
        return (
          <div key={l.id} className="mr-list-item" style={{ animationDelay: `${i * 0.04}s` }}>
            <button onClick={() => nav('vault', { locationId: l.id })} className="mr-row mr-btn" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', borderRadius: 7, marginBottom: 1,
              background: active ? c.accentSoft : 'transparent',
              color: active ? c.accent : c.text,
              border: 'none', cursor: 'pointer', fontFamily: MR_FAMILY, textAlign: 'left',
            }}>
              <span style={{ fontSize: 13, fontWeight: active ? 500 : 400, letterSpacing: '-0.005em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MRIcon name="pin" size={12} color={active ? c.accent : c.faint} />
                {l.name}
              </span>
              <span style={{ fontSize: 11, color: active ? c.accent : c.faint, fontVariantNumeric: 'tabular-nums' }}>{total}</span>
            </button>
          </div>
        );
      })}
      <button className="mr-btn" style={{
        width: '100%', padding: '6px 10px', marginTop: 4, background: 'transparent',
        border: 'none', color: c.dim, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: MR_FAMILY,
      }}>
        <MRIcon name="plus" size={12} /> New place
      </button>

      <div style={{ height: 18 }} />
      <SidebarHeading c={c}>Recent people</SidebarHeading>
      {allRecent.map((p, i) => {
        const active = p.id === personId;
        return (
          <button key={p.id} onClick={() => nav('vault', { locationId: p.locationId, personId: p.id })} className="mr-row mr-btn" style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 8px', borderRadius: 7, marginBottom: 1,
            background: active ? c.accentSoft : 'transparent',
            color: active ? c.accent : c.text,
            border: 'none', cursor: 'pointer', fontFamily: MR_FAMILY, textAlign: 'left',
          }}>
            <MRAvatar initials={p.initials} size={20} theme={theme} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: active ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            </div>
            <span style={{ fontSize: 10, color: c.faint }}>{lastSeenLabel(p.lastSeen)}</span>
          </button>
        );
      })}
    </div>
  );
}

function SidebarHeading({ c, children }) {
  return (
    <div style={{ padding: '4px 10px 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.dim }}>{children}</div>
  );
}

function DeskMain({ c, theme, loc, personId, nav, onAddPerson, onLogVisit, readOnly }) {
  const [search, setSearch] = useStateD('');
  const [filter, setFilter] = useStateD('all');
  const groups = useMemoD(() => {
    let gs = filter === 'all' ? loc.groups : loc.groups.filter(g => g.id === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      gs = gs.map(g => ({ ...g, people: g.people.filter(p => p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q)) }))
             .filter(g => g.people.length);
    }
    return gs;
  }, [loc, filter, search]);
  const total = loc.groups.reduce((n,g)=>n+g.people.length,0);

  return (
    <div className="mr-page" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ padding: '22px 32px 14px', borderBottom: `1px solid ${c.edge}` }}>
        <MRLabel c={c}>Place</MRLabel>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em' }}>{loc.name}</div>
            <div style={{ fontSize: 13, color: c.dim, marginTop: 2 }}>{loc.description} · {total} people</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: c.subtle, borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, width: 220 }}>
              <MRIcon name="search" size={13} color={c.faint} />
              <input className="mr-input" placeholder="Search this place" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
            </div>
            {!readOnly && (
              <button onClick={() => onAddPerson(loc.id)} className="mr-btn" style={{ ...mrBtn.primary(c), display: 'flex', alignItems: 'center', gap: 6 }}>
                <MRIcon name="plus" size={13} color={c.bg} /> Add person
              </button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
          {[{ id: 'all', name: 'All' }, ...loc.groups].map(g => (
            <button key={g.id} onClick={() => setFilter(g.id)} className="mr-btn" style={{
              padding: '5px 12px', borderRadius: 999, border: `1px solid ${c.edge}`,
              background: filter === g.id ? c.text : 'transparent', color: filter === g.id ? c.bg : c.text,
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: MR_FAMILY,
            }}>{g.name}{filter === g.id && g.id !== 'all' && <span style={{ marginLeft: 6, opacity: 0.7 }}>{g.people.length}</span>}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px 40px' }}>
        {groups.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: c.dim }}>
            <div style={{ fontSize: 14 }}>No matches in {loc.name.split('—')[0].trim()}</div>
            <div style={{ fontSize: 12, color: c.faint, marginTop: 4 }}>Try a different search or filter</div>
          </div>
        ) : groups.map((g, gi) => (
          <div key={g.id} style={{ marginBottom: 28 }} className="mr-list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{g.name}</div>
              <div style={{ fontSize: 11, color: c.faint, fontVariantNumeric: 'tabular-nums' }}>{g.people.length}</div>
              <div style={{ flex: 1, height: 1, background: c.edge }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {g.people.map((p, i) => {
                const active = p.id === personId;
                return (
                  <button key={p.id} onClick={() => nav('vault', { locationId: loc.id, personId: p.id })} className="mr-list-item mr-btn" style={{
                    background: c.panel, border: `1px solid ${active ? c.accent : c.edge}`, borderRadius: 12,
                    padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
                    cursor: 'pointer', fontFamily: MR_FAMILY, textAlign: 'left', color: c.text,
                    boxShadow: active ? `0 0 0 3px ${c.accentSoft}` : 'none',
                    animationDelay: `${i * 0.03}s`, transition: 'border-color .15s, box-shadow .15s',
                  }}>
                    <MRAvatar initials={p.initials} size={36} theme={theme} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: c.faint, fontVariantNumeric: 'tabular-nums' }}>{lastSeenLabel(p.lastSeen)}</div>
                      </div>
                      <div style={{ fontSize: 13, color: c.dim, marginTop: 4, lineHeight: 1.4 }}>{p.detail}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeskPersonRail({ c, theme, loc, personId, nav, onEdit, onLogVisit, readOnly }) {
  let group = null, person = null;
  for (const g of loc.groups) {
    const f = g.people.find(p => p.id === personId);
    if (f) { group = g; person = f; break; }
  }
  if (!person) return null;

  const visits = [
    { date: person.lastSeen, note: 'At the corner table. Asked about the Marin project.' },
    { date: '2026-04-18', note: 'Quick hello. Biscuit got a treat.' },
    { date: '2026-04-15', note: '' },
    { date: '2026-04-08', note: 'First time we actually exchanged names.' },
  ];
  const [justSaw, setJustSaw] = useStateD(false);
  const handleSaw = () => { setJustSaw(true); onLogVisit(person.id, loc.id); setTimeout(() => setJustSaw(false), 1800); };

  return (
    <div className="mr-page" style={{ width: 360, borderLeft: `1px solid ${c.edge}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, background: c.bg }}>
      <div style={{ padding: '14px 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <MRLabel c={c}>Person</MRLabel>
        <div style={{ display: 'flex', gap: 2 }}>
          {!readOnly && <button onClick={() => onEdit(person.id, loc.id)} className="mr-btn" style={{ ...mrBtn.icon(c), width: 'auto', padding: '0 8px', fontSize: 12, color: c.dim }}><MRIcon name="pencil" size={13} /></button>}
          <button onClick={() => nav('vault', { locationId: loc.id })} className="mr-btn" style={mrBtn.icon(c)}><MRIcon name="x" size={14} /></button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="mr-pop"><MRAvatar initials={person.initials} size={56} theme={theme} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{person.name}</div>
            <div style={{ fontSize: 12, color: c.dim, marginTop: 2 }}>{group.name}</div>
            <div style={{ fontSize: 11, color: c.faint, marginTop: 3 }}>Last seen {lastSeenLabel(person.lastSeen)}</div>
          </div>
        </div>

        {!readOnly && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleSaw} className="mr-btn" style={{
              ...mrBtn.primaryAccent(c), flex: 1, padding: '10px',
              background: justSaw ? '#2da57a' : c.accent, transition: 'background .25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {justSaw ? <><MRIcon name="check" size={14} color={c.accentText} /> Logged today</> : 'Saw today'}
            </button>
            <button className="mr-btn" style={{ ...mrBtn.ghost(c), padding: '9px 12px' }}>Log…</button>
          </div>
        )}

        <RailSection c={c} title="Notes">
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>{person.detail} Works in landscape architecture — has been talking about a project in Marin. Drinks a flat white, no sugar.</div>
        </RailSection>
        <RailSection c={c} title="Pets">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <MRChip c={c}><MRIcon name="paw" size={11} /> Biscuit · golden retriever</MRChip>
          </div>
        </RailSection>
        <RailSection c={c} title="Recent visits">
          <div style={{ background: c.panel, border: `1px solid ${c.edge}`, borderRadius: 10, overflow: 'hidden' }}>
            {visits.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderTop: i ? `1px solid ${c.edge}` : 'none' }}>
                <div style={{ fontSize: 11, color: c.dim, width: 56, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 12, color: v.note ? c.text : c.faint, flex: 1, lineHeight: 1.45 }}>{v.note || '—'}</div>
              </div>
            ))}
          </div>
        </RailSection>
        <RailSection c={c} title="Relationships">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <MRChip c={c}>Marcus Doyle · friend of</MRChip>
            <MRChip c={c}>Ines Park · runs with</MRChip>
          </div>
        </RailSection>
      </div>
    </div>
  );
}

function RailSection({ c, title, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <MRLabel c={c} style={{ marginBottom: 8 }}>{title}</MRLabel>
      {children}
    </div>
  );
}

function DeskReadOnlyBanner({ c }) {
  return (
    <div style={{
      background: c.accentSoft, borderBottom: `1px solid ${c.accentSoftBorder}`,
      padding: '8px 22px', display: 'flex', alignItems: 'center', gap: 10,
      animation: 'mrSlideUp .3s cubic-bezier(.2,.7,.3,1)',
    }}>
      <MRIcon name="eye" size={13} color={c.accent} />
      <div style={{ flex: 1, fontSize: 12, color: c.text }}>
        <span style={{ fontWeight: 600 }}>Read-only vault</span> · you don't own this Gist. Clone it to make edits.
      </div>
      <button className="mr-btn" style={{
        background: c.accent, color: c.accentText, border: 'none', borderRadius: 6,
        padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: MR_FAMILY, cursor: 'pointer',
      }}>Clone to your vault</button>
    </div>
  );
}

// ─── Desktop vault selector ──────────────────────────────────
function DeskVaults({ theme, vaults, openVault, onCreate }) {
  const c = MR_PAL[theme];
  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '46px 64px 24px', maxWidth: 880, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: c.text, color: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, marginBottom: 24 }}>R</div>
        <div style={{ fontSize: 13, color: c.faint }}>Signed in · github.com/sam</div>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 6 }}>Your vaults</div>
        <div style={{ fontSize: 14, color: c.dim, marginTop: 4 }}>Pick one to open, or start a new one.</div>
      </div>
      <div style={{ flex: 1, padding: '0 64px 40px', maxWidth: 880, width: '100%', boxSizing: 'border-box', margin: '0 auto', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {vaults.map((v, i) => (
            <button key={v.id} onClick={() => openVault(v.id)} className="mr-list-item mr-btn" style={{
              textAlign: 'left', background: c.panel, border: `1px solid ${c.edge}`, borderRadius: 14,
              padding: 18, cursor: 'pointer', fontFamily: MR_FAMILY, color: c.text, animationDelay: `${i*0.05}s`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{v.name}</div>
                <MRIcon name="chevron-right" size={14} color={c.faint} />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12, color: c.dim }}>
                <span>{v.locations} places</span><span>{v.people} people</span><span>·</span><span>opened {v.lastOpened}</span>
              </div>
              <div style={{ fontSize: 11, color: c.faint, marginTop: 10, fontFamily: '"Geist Mono", monospace' }}>{v.uri}</div>
            </button>
          ))}
          <button onClick={onCreate} className="mr-btn" style={{
            textAlign: 'left', background: 'transparent', border: `1.5px dashed ${c.edge}`, borderRadius: 14,
            padding: 18, cursor: 'pointer', fontFamily: MR_FAMILY, color: c.text,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: c.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MRIcon name="plus" size={16} color={c.dim} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>New vault</div>
              <div style={{ fontSize: 12, color: c.dim, marginTop: 2 }}>A fresh notebook</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop onboarding / connector ──────────────────────────
function DeskOnboarding({ theme, nav }) {
  const c = MR_PAL[theme];
  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 540, width: '100%' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: c.text, color: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, marginBottom: 28 }}>R</div>
        <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Remember the people<br/>at the places you go.
        </div>
        <div style={{ fontSize: 16, color: c.dim, marginTop: 16, lineHeight: 1.55, maxWidth: 440 }}>
          A small, private notebook for the regulars in your life. Your data stays in your own GitHub Gist — yours to keep, share, or take with you.
        </div>
        <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
          <button onClick={() => nav('connector')} className="mr-btn" style={{ ...mrBtn.primary(c), padding: '12px 18px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <MRIcon name="github" size={14} color={c.bg} /> Connect with GitHub
          </button>
          <button className="mr-btn" style={{ ...mrBtn.ghost(c), padding: '11px 16px' }}>Open by link</button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop share modal ─────────────────────────────────────
function DeskShareModal({ theme, vault, onClose }) {
  const c = MR_PAL[theme];
  const [copied, setCopied] = useStateD(false);
  const [tab, setTab] = useStateD('full');
  const url = `https://myregulars.app/?vault=${vault.uri}`;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: c.overlay, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'mrFadeIn .2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} className="mr-pop" style={{
        background: c.bg, color: c.text, borderRadius: 16, width: 460,
        padding: 0, fontFamily: MR_FAMILY, border: `1px solid ${c.edge}`, boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>Share vault</div>
            <div style={{ fontSize: 13, color: c.dim, marginTop: 4 }}>Anyone with the link can view read-only.</div>
          </div>
          <button onClick={onClose} className="mr-btn" style={mrBtn.icon(c)}><MRIcon name="x" size={14} /></button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '14px 22px 0' }}>
          {[['full', 'Full vault'], ['select', 'Selection']].map(([id, name]) => (
            <button key={id} onClick={() => setTab(id)} className="mr-btn" style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', fontFamily: MR_FAMILY,
              background: tab === id ? c.subtle : 'transparent', color: tab === id ? c.text : c.dim,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>{name}</button>
          ))}
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <FakeQR c={c} size={140} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <MRLabel c={c}>Link</MRLabel>
              <div style={{ marginTop: 6, background: c.subtle, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: c.text, wordBreak: 'break-all', lineHeight: 1.45 }}>{url}</div>
              <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mr-btn" style={{
                ...mrBtn.primary(c), marginTop: 10, width: '100%',
                background: copied ? c.accent : c.text, color: copied ? c.accentText : c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .25s',
              }}>
                <MRIcon name={copied ? 'check' : 'copy'} size={13} color={copied ? c.accentText : c.bg} />
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 12px', background: c.subtle, borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <MRIcon name="eye" size={14} color={c.dim} />
            <div style={{ fontSize: 12, color: c.dim, lineHeight: 1.5 }}>
              Recipients see a read-only copy. They can clone it to their own GitHub if they want to make edits.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop add/edit person modal ───────────────────────────
function DeskPersonModal({ theme, mode, vault, locationId, person, onClose, onSave }) {
  const c = MR_PAL[theme];
  const isEdit = mode === 'edit';
  const loc = vault.locations.find(l => l.id === locationId);
  const [name, setName] = useStateD(person?.name || '');
  const [groupId, setGroupId] = useStateD(person?.groupId || loc.groups[0]?.id);
  const [detail, setDetail] = useStateD(person?.detail || '');

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: c.overlay, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'mrFadeIn .2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} className="mr-pop" style={{
        background: c.bg, color: c.text, borderRadius: 16, width: 480, fontFamily: MR_FAMILY,
        border: `1px solid ${c.edge}`, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{isEdit ? 'Edit person' : 'New person'}</div>
            <button onClick={onClose} className="mr-btn" style={mrBtn.icon(c)}><MRIcon name="x" size={14} /></button>
          </div>
          <div style={{ fontSize: 13, color: c.dim, marginTop: 2 }}>at {loc.name}</div>
        </div>
        <div style={{ padding: '18px 24px 8px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <MRAvatar initials={initialsOf(name) || '··'} size={52} theme={theme} />
          <input className="mr-input" autoFocus placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }} />
        </div>
        <div style={{ padding: '4px 24px 20px' }}>
          <FormSection c={c} label="Group">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {loc.groups.map(g => (
                <button key={g.id} onClick={() => setGroupId(g.id)} className="mr-btn" style={{
                  padding: '6px 12px', borderRadius: 999, border: `1px solid ${c.edge}`,
                  background: groupId === g.id ? c.text : 'transparent', color: groupId === g.id ? c.bg : c.text,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: MR_FAMILY,
                }}>{g.name}</button>
              ))}
              <button className="mr-btn" style={{ padding: '6px 12px', borderRadius: 999, border: `1px dashed ${c.edge}`, background: 'transparent', color: c.dim, fontSize: 12, cursor: 'pointer', fontFamily: MR_FAMILY }}>+ New group</button>
            </div>
          </FormSection>
          <FormSection c={c} label="One key detail" subtitle="Something memorable.">
            <textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="e.g. Brings a golden retriever named Biscuit." style={{
              width: '100%', minHeight: 70, resize: 'vertical', padding: 12, borderRadius: 10,
              background: c.subtle, border: 'none', fontSize: 14, fontFamily: MR_FAMILY, color: c.text,
              outline: 'none', boxSizing: 'border-box', lineHeight: 1.4,
            }} />
          </FormSection>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${c.edge}`, display: 'flex', justifyContent: 'flex-end', gap: 8, background: c.subtle }}>
          <button onClick={onClose} className="mr-btn" style={mrBtn.ghost(c)}>Cancel</button>
          <button onClick={() => onSave({ name, groupId, detail })} disabled={!name.trim()} className="mr-btn" style={{
            ...mrBtn.primaryAccent(c), opacity: name.trim() ? 1 : 0.5,
          }}>{isEdit ? 'Save changes' : 'Create person'}</button>
        </div>
      </div>
    </div>
  );
}

window.MR_DESK = { DeskApp, DeskVaults, DeskOnboarding, DeskShareModal, DeskPersonModal };
