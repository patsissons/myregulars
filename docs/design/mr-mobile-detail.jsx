// MyRegulars — Mobile detail screens, modals, and add/edit
const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

// ─── Person detail ───────────────────────────────────────────
function MobPerson({ theme, nav, vault, locationId, personId, onLogVisit, onEdit }) {
  const c = MR_PAL[theme];
  const loc = vault.locations.find(l => l.id === locationId);
  let group = null, person = null;
  for (const g of loc.groups) {
    const f = g.people.find(p => p.id === personId);
    if (f) { group = g; person = f; break; }
  }
  const [justSaw, setJustSaw] = useState2(false);

  const visits = (person.visitLog || [
    { date: person.lastSeen, note: 'At the corner table. Asked about the Marin project.' },
    { date: '2026-04-18', note: 'Quick hello. Biscuit got a treat.' },
    { date: '2026-04-15', note: '' },
    { date: '2026-04-08', note: 'First time we actually exchanged names.' },
  ]);

  const handleSaw = () => {
    setJustSaw(true);
    onLogVisit(person.id, loc.id);
    setTimeout(() => setJustSaw(false), 1800);
  };

  return (
    <div className="mr-page" style={{ width: '100%', height: '100%', background: c.bg, color: c.text, fontFamily: MR_FAMILY, display: 'flex', flexDirection: 'column' }}>
      <MobStatusBar c={c} />
      <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between' }}>
        <button className="mr-btn" onClick={() => nav('location', { locationId })} style={mrBtn.icon(c)}><MRIcon name="arrow-left" /></button>
        <button className="mr-btn" onClick={() => onEdit(person.id, loc.id)} style={{ ...mrBtn.icon(c), width: 'auto', padding: '0 10px', fontSize: 13, color: c.text }}>Edit</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 22px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="mr-pop"><MRAvatar initials={person.initials} size={68} theme={theme} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em' }}>{person.name}</div>
            <div style={{ fontSize: 13, color: c.dim, marginTop: 2 }}>{loc.name.split('—')[0].trim()} · {group.name}</div>
            <div style={{ fontSize: 11, color: c.faint, marginTop: 4 }}>Last seen {lastSeenLabel(person.lastSeen)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="mr-btn" onClick={handleSaw} style={{
            ...mrBtn.primaryAccent(c), flex: 1, padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: justSaw ? '#2da57a' : c.accent, transition: 'background .25s',
          }}>
            {justSaw ? <><MRIcon name="check" size={16} color={c.accentText} /> Logged today</> : <>Saw today</>}
          </button>
          <button className="mr-btn" style={{ ...mrBtn.ghost(c), padding: '11px 14px' }}>Log…</button>
        </div>

        <DetailSection c={c} title="Notes" delay={0.05}>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{person.detail} Works in landscape architecture — has been talking about a project in Marin. Drinks a flat white, no sugar.</div>
        </DetailSection>

        <DetailSection c={c} title="Pets" delay={0.1}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <MRChip c={c}><MRIcon name="paw" size={12} /> Biscuit · golden retriever</MRChip>
          </div>
        </DetailSection>

        <DetailSection c={c} title="Recent visits" delay={0.15} action={
          <button className="mr-btn" style={{ ...mrBtn.icon(c), width: 'auto', padding: '0 8px', fontSize: 12, color: c.dim }}>+ Log</button>
        }>
          <div style={{ background: c.panel, border: `1px solid ${c.edge}`, borderRadius: 12, overflow: 'hidden' }}>
            {visits.map((v, i) => (
              <div key={i} className="mr-list-item" style={{
                display: 'flex', gap: 14, padding: '12px 14px',
                borderTop: i ? `1px solid ${c.edge}` : 'none',
                animationDelay: `${0.18 + i*0.04}s`,
              }}>
                <div style={{ fontSize: 11, color: c.dim, width: 60, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 13, color: v.note ? c.text : c.faint, flex: 1, lineHeight: 1.4 }}>{v.note || '—'}</div>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection c={c} title="Relationships" delay={0.22}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <MRChip c={c}>Marcus Doyle · friend of</MRChip>
            <MRChip c={c}>Ines Park · runs with</MRChip>
          </div>
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({ c, title, action, delay, children }) {
  return (
    <div className="mr-list-item" style={{ marginTop: 22, animationDelay: `${delay || 0}s` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <MRLabel c={c}>{title}</MRLabel>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Add/Edit person sheet ───────────────────────────────────
function MobPersonSheet({ theme, mode, locationId, vault, person, onClose, onSave }) {
  const c = MR_PAL[theme];
  const isEdit = mode === 'edit';
  const loc = vault.locations.find(l => l.id === locationId);
  const [name, setName] = useState2(person?.name || '');
  const [groupId, setGroupId] = useState2(person?.groupId || loc.groups[0]?.id);
  const [detail, setDetail] = useState2(person?.detail || '');
  const [photoScheme, setPhotoScheme] = useState2('https');
  const [photoHandle, setPhotoHandle] = useState2('');

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: c.overlay, zIndex: 40, display: 'flex', alignItems: 'flex-end',
      animation: 'mrFadeIn .2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} className="mr-sheet" style={{
        background: c.bg, color: c.text, borderRadius: '20px 20px 0 0', width: '100%',
        maxHeight: '88%', display: 'flex', flexDirection: 'column', fontFamily: MR_FAMILY,
      }}>
        <div style={{ padding: '12px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 38, height: 4, borderRadius: 4, background: c.edgeStrong }} />
        </div>
        <div style={{ padding: '8px 22px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ ...mrBtn.icon(c), width: 'auto', padding: 0, fontSize: 14, color: c.dim }}>Cancel</button>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{isEdit ? 'Edit person' : 'New person'}</div>
          <button onClick={() => onSave({ name, groupId, detail })} disabled={!name.trim()} style={{
            background: 'transparent', border: 'none', color: name.trim() ? c.accent : c.faint, fontSize: 14, fontWeight: 600, fontFamily: MR_FAMILY, cursor: 'pointer',
          }}>Save</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <MRAvatar initials={initialsOf(name) || '··'} size={56} theme={theme} />
            <div style={{ flex: 1 }}>
              <input className="mr-input" placeholder="Name" autoFocus value={name} onChange={e => setName(e.target.value)} style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }} />
              <div style={{ fontSize: 12, color: c.faint, marginTop: 2 }}>at {loc.name.split('—')[0].trim()}</div>
            </div>
          </div>

          <FormSection c={c} label="Group">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {loc.groups.map(g => (
                <button key={g.id} onClick={() => setGroupId(g.id)} className="mr-btn" style={{
                  padding: '7px 12px', borderRadius: 999, border: `1px solid ${c.edge}`,
                  background: groupId === g.id ? c.text : 'transparent', color: groupId === g.id ? c.bg : c.text,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: MR_FAMILY,
                }}>{g.name}</button>
              ))}
              <button className="mr-btn" style={{ padding: '7px 12px', borderRadius: 999, border: `1px dashed ${c.edge}`, background: 'transparent', color: c.dim, fontSize: 12, cursor: 'pointer', fontFamily: MR_FAMILY }}>+ New group</button>
            </div>
          </FormSection>

          <FormSection c={c} label="One key detail" subtitle="Something memorable. The thing you'd whisper before walking in.">
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="e.g. Brings a golden retriever named Biscuit."
              style={{
                width: '100%', minHeight: 70, resize: 'vertical', padding: 12, borderRadius: 10,
                background: c.subtle, border: 'none', fontSize: 14, fontFamily: MR_FAMILY, color: c.text,
                outline: 'none', boxSizing: 'border-box', lineHeight: 1.4,
              }}
            />
          </FormSection>

          <FormSection c={c} label="Photo" subtitle="Optional. Pulls from a public URL.">
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
              <select value={photoScheme} onChange={e => setPhotoScheme(e.target.value)} className="mr-btn" style={{
                background: c.subtle, border: 'none', borderRadius: 10, fontSize: 13, padding: '0 10px', fontFamily: MR_FAMILY, color: c.text, appearance: 'none', cursor: 'pointer',
              }}>
                <option>https</option><option>github</option><option>twitter</option><option>instagram</option>
              </select>
              <div style={{ flex: 1, background: c.subtle, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: c.faint }}>{photoScheme === 'https' ? '://' : '://'}</span>
                <input className="mr-input" placeholder={photoScheme === 'https' ? 'example.com/me.jpg' : 'username'} value={photoHandle} onChange={e => setPhotoHandle(e.target.value)} style={{ fontSize: 13 }} />
              </div>
            </div>
          </FormSection>

          {isEdit && (
            <FormSection c={c} label="Pets">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <MRChip c={c}><MRIcon name="paw" size={12} /> Biscuit · golden retriever <MRIcon name="x" size={11} color={c.faint} /></MRChip>
                <button className="mr-btn" style={{ background: 'transparent', border: `1px dashed ${c.edge}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, color: c.dim, cursor: 'pointer', fontFamily: MR_FAMILY }}>+ Add pet</button>
              </div>
            </FormSection>
          )}
        </div>
      </div>
    </div>
  );
}

function FormSection({ c, label, subtitle, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <MRLabel c={c} style={{ marginBottom: 6 }}>{label}</MRLabel>
      {subtitle && <div style={{ fontSize: 12, color: c.dim, marginTop: -2, marginBottom: 8 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

function initialsOf(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// ─── Share modal ─────────────────────────────────────────────
function MobShareModal({ theme, vault, onClose }) {
  const c = MR_PAL[theme];
  const [copied, setCopied] = useState2(false);
  const url = `https://myregulars.app/?vault=${vault.uri}`;
  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: c.overlay, zIndex: 50, display: 'flex', alignItems: 'flex-end',
      animation: 'mrFadeIn .22s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} className="mr-sheet" style={{
        background: c.bg, color: c.text, borderRadius: '20px 20px 0 0', width: '100%',
        padding: '12px 22px 32px', fontFamily: MR_FAMILY,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 38, height: 4, borderRadius: 4, background: c.edgeStrong }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>Share vault</div>
        <div style={{ fontSize: 13, color: c.dim, marginTop: 4 }}>Anyone with this link can view your vault read-only. They can clone it to their own datastore.</div>

        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
          <FakeQR c={c} />
        </div>

        <div style={{ marginTop: 22, background: c.subtle, borderRadius: 12, padding: '10px 12px 10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
          <button onClick={handleCopy} className="mr-btn" style={{
            ...mrBtn.subtle(c), background: copied ? c.accent : c.panel, color: copied ? c.accentText : c.text,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .25s',
          }}>
            <MRIcon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button className="mr-btn" style={{ ...mrBtn.ghost(c), flex: 1, padding: '12px' }}>Share selection…</button>
          <button className="mr-btn" style={{ ...mrBtn.ghost(c), flex: 1, padding: '12px' }}>Native share</button>
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: c.faint, textAlign: 'center' }}>
          Vault URI: <span style={{ fontFamily: '"Geist Mono", monospace', color: c.dim }}>{vault.uri}</span>
        </div>
      </div>
    </div>
  );
}

// Fake QR pattern (deterministic)
function FakeQR({ c, size = 168 }) {
  const cells = 21;
  const cs = size / cells;
  const pattern = useMemo2(() => {
    const grid = [];
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        // Fixed corner squares
        const finder = (x < 7 && y < 7) || (x > cells - 8 && y < 7) || (x < 7 && y > cells - 8);
        if (finder) {
          const inside = (x === 0 || x === 6 || y === 0 || y === 6) ||
                         ((x >= cells - 7 ? x - (cells - 7) : x) === 0 || (x >= cells - 7 ? x - (cells - 7) : x) === 6) ||
                         ((y >= cells - 7 ? y - (cells - 7) : y) === 0 || (y >= cells - 7 ? y - (cells - 7) : y) === 6) ||
                         (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                         (x >= cells - 5 && x <= cells - 3 && y >= 2 && y <= 4) ||
                         (x >= 2 && x <= 4 && y >= cells - 5 && y <= cells - 3);
          grid.push(inside);
        } else {
          // pseudo-random fill
          const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          grid.push((v - Math.floor(v)) > 0.55);
        }
      }
    }
    return grid;
  }, []);
  return (
    <div style={{ background: '#fff', padding: 12, borderRadius: 14, boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }}>
      <svg width={size} height={size}>
        {pattern.map((on, i) => on && <rect key={i} x={(i % cells) * cs} y={Math.floor(i / cells) * cs} width={cs} height={cs} fill="#0a0a0a" />)}
      </svg>
    </div>
  );
}
const useMemo2 = React.useMemo;

// ─── Read-only banner ───────────────────────────────────────
function MobReadOnlyBanner({ theme, onClone }) {
  const c = MR_PAL[theme];
  return (
    <div style={{
      background: c.accentSoft, borderBottom: `1px solid ${c.accentSoftBorder}`,
      padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
      animation: 'mrSlideUp .3s cubic-bezier(.2,.7,.3,1)',
    }}>
      <MRIcon name="eye" size={14} color={c.accent} />
      <div style={{ flex: 1, fontSize: 12, color: c.text }}>
        <span style={{ fontWeight: 600 }}>Read-only</span> · viewing someone else's vault
      </div>
      <button onClick={onClone} className="mr-btn" style={{
        background: c.accent, color: c.accentText, border: 'none', borderRadius: 6,
        padding: '5px 10px', fontSize: 12, fontWeight: 600, fontFamily: MR_FAMILY, cursor: 'pointer',
      }}>Clone</button>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────
function MobToast({ theme, text }) {
  const c = MR_PAL[theme];
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 100, transform: 'translateX(-50%)',
      background: c.text, color: c.bg, padding: '10px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
      zIndex: 30, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: 8,
      animation: 'mrSlideUp .25s cubic-bezier(.2,.7,.3,1)', whiteSpace: 'nowrap',
    }}>
      <MRIcon name="check" size={14} color={c.bg} /> {text}
    </div>
  );
}

window.MR_MOBILE_X = { MobPerson, MobPersonSheet, MobShareModal, MobReadOnlyBanner, MobToast, FakeQR };
