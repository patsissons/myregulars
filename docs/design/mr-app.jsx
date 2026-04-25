// MyRegulars — Main app shell. Wires routing, state, mobile + desktop into a design_canvas.

const { useState: useStateMain, useEffect: useEffectMain, useRef: useRefMain, useMemo: useMemoMain } = React;

const initialVaults = [
  { id: 'v1', name: "Sam's Regulars", uri: 'gist:8a7f3c1d', locations: 4, people: 13, lastOpened: 'today' },
  { id: 'v2', name: 'Travel — Lisbon trip', uri: 'gist:b2e91044', locations: 6, people: 9, lastOpened: '3d ago' },
  { id: 'v3', name: 'Old neighborhood (Brooklyn)', uri: 'gist:cc551a2e', locations: 8, people: 22, lastOpened: '2mo ago' },
];

function useApp(initialRoute) {
  const [route, setRoute] = useStateMain(initialRoute);
  const [vault, setVault] = useStateMain(window.VAULT);
  const [vaults] = useStateMain(initialVaults);
  const [modal, setModal] = useStateMain(null); // 'share' | 'add' | 'edit'
  const [modalCtx, setModalCtx] = useStateMain({});
  const [toast, setToast] = useStateMain('');
  const [readOnly, setReadOnly] = useStateMain(false);

  const nav = (name, params = {}) => setRoute({ name, ...params });
  const openShare = () => setModal('share');
  const openAdd = (locationId) => { setModalCtx({ locationId }); setModal('add'); };
  const openEdit = (personId, locationId) => {
    let person = null;
    const loc = vault.locations.find(l => l.id === locationId);
    for (const g of loc.groups) { const f = g.people.find(p => p.id === personId); if (f) { person = { ...f, groupId: g.id }; break; } }
    setModalCtx({ locationId, person });
    setModal('edit');
  };
  const closeModal = () => setModal(null);

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(''), 2000); };

  const logVisit = (personId, locationId) => {
    setVault(v => ({
      ...v,
      locations: v.locations.map(l => l.id !== locationId ? l : ({
        ...l,
        groups: l.groups.map(g => ({
          ...g,
          people: g.people.map(p => p.id !== personId ? p : ({ ...p, lastSeen: '2026-04-22' })),
        })),
      })),
    }));
    showToast('Visit logged');
  };

  const savePerson = ({ name, groupId, detail }) => {
    const { locationId, person } = modalCtx;
    if (modal === 'edit' && person) {
      setVault(v => ({
        ...v,
        locations: v.locations.map(l => l.id !== locationId ? l : ({
          ...l,
          groups: l.groups.map(g => ({
            ...g,
            people: g.people.map(p => p.id !== person.id ? p : ({ ...p, name, detail, initials: name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase() })),
          })),
        })),
      }));
      showToast('Person updated');
    } else {
      const newId = 'p' + Math.random().toString(36).slice(2, 7);
      const initials = name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
      const np = { id: newId, name, detail, initials, lastSeen: '2026-04-22', role: 'Regular' };
      setVault(v => ({
        ...v,
        locations: v.locations.map(l => l.id !== locationId ? l : ({
          ...l,
          groups: l.groups.map(g => g.id === groupId ? ({ ...g, people: [np, ...g.people] }) : g),
        })),
      }));
      showToast('Person added');
    }
    setModal(null);
  };

  return {
    route, nav, vault, vaults, modal, modalCtx, toast,
    readOnly, setReadOnly,
    openShare, openAdd, openEdit, closeModal,
    logVisit, savePerson, showToast,
  };
}

// ─── Mobile prototype (single device frame, owns its state) ────
function MobileApp({ theme }) {
  const app = useApp({ name: 'vault', locationId: 'bb' });
  const c = MR_PAL[theme];
  const { MobOnboarding, MobConnector, MobVaults, MobVault, MobLocation } = window.MR_MOBILE;
  const { MobPerson, MobPersonSheet, MobShareModal, MobReadOnlyBanner, MobToast } = window.MR_MOBILE_X;

  let screen = null;
  if (app.route.name === 'onboarding') screen = <MobOnboarding theme={theme} nav={app.nav} />;
  else if (app.route.name === 'connector') screen = <MobConnector theme={theme} nav={app.nav} onConnect={() => app.nav('vaults')} />;
  else if (app.route.name === 'vaults') screen = <MobVaults theme={theme} nav={app.nav} vaults={app.vaults} openVault={(id) => app.nav('vault', { locationId: 'bb' })} onCreate={() => app.nav('vault', { locationId: 'bb' })} />;
  else if (app.route.name === 'vault') screen = <MobVault theme={theme} nav={app.nav} vault={app.vault} onShare={app.openShare} onSettings={() => app.nav('vaults')} />;
  else if (app.route.name === 'location') screen = <MobLocation theme={theme} nav={app.nav} vault={app.vault} locationId={app.route.locationId} onAddPerson={app.openAdd} onLogVisit={app.logVisit} />;
  else if (app.route.name === 'person') screen = <MobPerson theme={theme} nav={app.nav} vault={app.vault} locationId={app.route.locationId} personId={app.route.personId} onLogVisit={app.logVisit} onEdit={app.openEdit} />;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: c.bg, borderRadius: 'inherit' }}>
      {app.readOnly && app.route.name !== 'onboarding' && app.route.name !== 'connector' && app.route.name !== 'vaults' && (
        <div style={{ position: 'absolute', top: 44, left: 0, right: 0, zIndex: 10 }}>
          <MobReadOnlyBanner theme={theme} onClone={() => app.setReadOnly(false)} />
        </div>
      )}
      <div key={app.route.name + (app.route.locationId||'') + (app.route.personId||'')} style={{ width: '100%', height: '100%' }}>
        {screen}
      </div>

      {app.modal === 'share' && <MobShareModal theme={theme} vault={{ ...app.vault, uri: 'gist:8a7f3c1d' }} onClose={app.closeModal} />}
      {(app.modal === 'add' || app.modal === 'edit') && (
        <MobPersonSheet
          theme={theme}
          mode={app.modal}
          vault={app.vault}
          locationId={app.modalCtx.locationId}
          person={app.modalCtx.person}
          onClose={app.closeModal}
          onSave={app.savePerson}
        />
      )}
      {app.toast && <MobToast theme={theme} text={app.toast} />}
    </div>
  );
}

// ─── Desktop prototype (full window) ────────────────────────────
function DesktopApp({ theme }) {
  const app = useApp({ name: 'vault', locationId: 'bb' });
  const { DeskApp, DeskVaults, DeskOnboarding, DeskShareModal, DeskPersonModal } = window.MR_DESK;
  const c = MR_PAL[theme];

  let screen = null;
  if (app.route.name === 'onboarding') screen = <DeskOnboarding theme={theme} nav={app.nav} />;
  else if (app.route.name === 'connector') screen = <DeskOnboarding theme={theme} nav={app.nav} />; // collapse to onboarding for desktop
  else if (app.route.name === 'vaults') screen = <DeskVaults theme={theme} vaults={app.vaults} openVault={() => app.nav('vault', { locationId: 'bb' })} onCreate={() => app.nav('vault', { locationId: 'bb' })} />;
  else screen = (
    <DeskApp
      theme={theme}
      vault={app.vault}
      route={app.route}
      nav={app.nav}
      onShare={app.openShare}
      onAddPerson={app.openAdd}
      onEditPerson={app.openEdit}
      onLogVisit={app.logVisit}
      readOnly={app.readOnly}
    />
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: c.bg }}>
      <div key={app.route.name} style={{ width: '100%', height: '100%' }}>{screen}</div>
      {app.modal === 'share' && <DeskShareModal theme={theme} vault={{ ...app.vault, uri: 'gist:8a7f3c1d' }} onClose={app.closeModal} />}
      {(app.modal === 'add' || app.modal === 'edit') && (
        <DeskPersonModal
          theme={theme}
          mode={app.modal}
          vault={app.vault}
          locationId={app.modalCtx.locationId}
          person={app.modalCtx.person}
          onClose={app.closeModal}
          onSave={app.savePerson}
        />
      )}
      {app.toast && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: c.text, color: c.bg, padding: '10px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 12px 28px rgba(0,0,0,0.25)', animation: 'mrSlideUp .25s cubic-bezier(.2,.7,.3,1)',
          fontFamily: MR_FAMILY,
        }}>
          <MRIcon name="check" size={14} color={c.bg} /> {app.toast}
        </div>
      )}
    </div>
  );
}

// iPhone-ish frame for the mobile prototype
function PhoneFrame({ theme, children }) {
  return (
    <div style={{
      width: 412, height: 870, padding: 12, borderRadius: 50,
      background: theme === 'dark' ? '#000' : '#1a1a1a',
      boxShadow: '0 30px 80px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.04)',
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 38, overflow: 'hidden', position: 'relative', background: theme === 'dark' ? '#0e0e0f' : '#fbfbfa' }}>
        {children}
        {/* Notch */}
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 110, height: 30, borderRadius: 999, background: '#000', zIndex: 100 }} />
      </div>
    </div>
  );
}

// macOS-ish window for the desktop prototype
function DesktopFrame({ theme, children }) {
  return (
    <div style={{
      width: 1280, height: 820, borderRadius: 12, overflow: 'hidden',
      background: theme === 'dark' ? '#0e0e0f' : '#fbfbfa',
      boxShadow: '0 30px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)',
    }}>{children}</div>
  );
}

// ─── Top-level app rendered into the canvas ──────────────────
function MyRegulars() {
  const [theme, setTheme] = useStateMain('light');

  return (
    <DesignCanvas
      title="MyRegulars — Modern Minimal"
      headerSubtitle="Connector → vault → place → person · share, add, edit, log visits"
      headerActions={
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="mr-btn" style={{
          background: theme === 'dark' ? '#fff' : '#111', color: theme === 'dark' ? '#111' : '#fff',
          border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 500,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MR_FAMILY,
        }}>
          <MRIcon name={theme === 'dark' ? 'sun' : 'moon'} size={13} />
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      }
    >
      <DCSection id="desktop" title="Desktop">
        <DCArtboard id="desk-main" label="Main vault view" width={1280} height={820}>
          <DesktopFrame theme={theme}><DesktopApp theme={theme} /></DesktopFrame>
        </DCArtboard>
      </DCSection>
      <DCSection id="mobile" title="Mobile">
        <DCArtboard id="mob-vault" label="Mobile prototype" width={412} height={870}>
          <PhoneFrame theme={theme}><MobileAppRoot theme={theme} initialRoute={{ name: 'vault', locationId: 'bb' }} /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="mob-location" label="Location detail" width={412} height={870}>
          <PhoneFrame theme={theme}><MobileAppRoot theme={theme} initialRoute={{ name: 'location', locationId: 'bb' }} /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="mob-person" label="Person detail" width={412} height={870}>
          <PhoneFrame theme={theme}><MobileAppRoot theme={theme} initialRoute={{ name: 'person', locationId: 'bb', personId: 'p4' }} /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="mob-onboarding" label="Onboarding" width={412} height={870}>
          <PhoneFrame theme={theme}><MobileAppRoot theme={theme} initialRoute={{ name: 'onboarding' }} /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="mob-connector" label="Connector" width={412} height={870}>
          <PhoneFrame theme={theme}><MobileAppRoot theme={theme} initialRoute={{ name: 'connector' }} /></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="mob-vaults" label="Vault selector" width={412} height={870}>
          <PhoneFrame theme={theme}><MobileAppRoot theme={theme} initialRoute={{ name: 'vaults' }} /></PhoneFrame>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// Wrapper to pass an initial route into a fresh MobileApp instance.
function MobileAppRoot({ theme, initialRoute }) {
  const [mounted, setMounted] = useStateMain(false);
  useEffectMain(() => { setMounted(true); }, []);
  return <MobileAppI theme={theme} initialRoute={initialRoute} />;
}
function MobileAppI({ theme, initialRoute }) {
  const app = useApp(initialRoute);
  const c = MR_PAL[theme];
  const { MobOnboarding, MobConnector, MobVaults, MobVault, MobLocation } = window.MR_MOBILE;
  const { MobPerson, MobPersonSheet, MobShareModal, MobReadOnlyBanner, MobToast } = window.MR_MOBILE_X;

  let screen = null;
  if (app.route.name === 'onboarding') screen = <MobOnboarding theme={theme} nav={app.nav} />;
  else if (app.route.name === 'connector') screen = <MobConnector theme={theme} nav={app.nav} onConnect={() => app.nav('vaults')} />;
  else if (app.route.name === 'vaults') screen = <MobVaults theme={theme} nav={app.nav} vaults={app.vaults} openVault={() => app.nav('vault', { locationId: 'bb' })} onCreate={() => app.nav('vault', { locationId: 'bb' })} />;
  else if (app.route.name === 'vault') screen = <MobVault theme={theme} nav={app.nav} vault={app.vault} onShare={app.openShare} onSettings={() => app.nav('vaults')} />;
  else if (app.route.name === 'location') screen = <MobLocation theme={theme} nav={app.nav} vault={app.vault} locationId={app.route.locationId} onAddPerson={app.openAdd} onLogVisit={app.logVisit} />;
  else if (app.route.name === 'person') screen = <MobPerson theme={theme} nav={app.nav} vault={app.vault} locationId={app.route.locationId} personId={app.route.personId} onLogVisit={app.logVisit} onEdit={app.openEdit} />;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: c.bg }}>
      <div key={app.route.name + (app.route.locationId||'') + (app.route.personId||'')} style={{ width: '100%', height: '100%' }}>
        {screen}
      </div>
      {app.modal === 'share' && <MobShareModal theme={theme} vault={{ ...app.vault, uri: 'gist:8a7f3c1d' }} onClose={app.closeModal} />}
      {(app.modal === 'add' || app.modal === 'edit') && (
        <MobPersonSheet theme={theme} mode={app.modal} vault={app.vault}
          locationId={app.modalCtx.locationId} person={app.modalCtx.person}
          onClose={app.closeModal} onSave={app.savePerson} />
      )}
      {app.toast && <MobToast theme={theme} text={app.toast} />}
    </div>
  );
}

window.MyRegulars = MyRegulars;
