(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.__agCsUiMain = factory;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (initialConfig) {
  const sidecarCore = globalThis.__agCsSidecarCore;
  if (sidecarCore && typeof location !== 'undefined' && sidecarCore.isSidecarLocation(location)) {
    return sidecarCore.mountSidecar(initialConfig);
  }

  const VERSION = 2;
  const CODE_HASH = initialConfig?.codeHash || '';
  if (window.__agTokenHud) {
    try {
      window.__agTokenHud.destroy();
    } catch {}
    delete window.__agTokenHud;
  }
  document
    .querySelectorAll(
      '#ag-token-hud-style, .ag-th-top-bar, .ag-th-bottom-bar, .ag-th-rim-progress, .ag-th-footer-chip, .ag-th-popover, .ag-th-turn-bar, .ag-th-reopen-pill'
    )
    .forEach((n) => n.remove());

  if (
    window.__agClaudeStyle &&
    window.__agClaudeStyle.version === VERSION &&
    (!CODE_HASH || window.__agClaudeStyle.codeHash === CODE_HASH)
  ) {
    window.__agClaudeStyle.refreshConfig(initialConfig);
    return;
  }
  if (Array.isArray(globalThis.__agCsCleanups)) {
    while (globalThis.__agCsCleanups.length) {
      const fn = globalThis.__agCsCleanups.pop();
      try {
        if (typeof fn === 'function') fn();
      } catch {}
    }
  }
  if (window.__agClaudeStyle) {
    try {
      window.__agClaudeStyle.destroy();
    } catch {}
    delete window.__agClaudeStyle;
  }

  if (window.__agCsI18n && typeof window.__agCsI18n.destroy === 'function') {
    try {
      window.__agCsI18n.destroy();
    } catch {}
    delete window.__agCsI18n;
  }

  const usageCore = globalThis.__agCsUsageCore;
  const rippleCore = globalThis.__agCsRippleCore;
  const mascotCore = globalThis.__agCsMascotCore;
  const crabAssets = globalThis.__agCsCrabAssets;
  const effortCore = globalThis.__agCsEffortCore;
  const perfAssets = globalThis.__agCsPerfAssets;
  const i18nCore = globalThis.__agCsI18nCore;
  const i18nLocales = globalThis.__agCsLocales;
  const domTranslator =
    i18nCore && i18nLocales && typeof i18nCore.createDomTranslator === 'function'
      ? i18nCore.createDomTranslator(i18nLocales.resolveLocaleBundle)
      : null;
  if (domTranslator && typeof window !== 'undefined') {
    window.__agCsI18n = domTranslator;
  }

  const STORAGE_SETTINGS_KEY = 'agClaudeStyle.settings.v1';
  const STORAGE_FILE_CFG_KEY = 'agClaudeStyle.lastFileConfig.v1';
  const STORAGE_USAGE_CACHE_KEY = 'agClaudeStyle.trajRollup.v1';

  function loadSettings(base) {
    try {
      const cleanBase = { ...base };
      delete cleanBase.binding;
      delete cleanBase.pollIntervalMs;
      delete cleanBase.codeHash;
      delete cleanBase.i18nExtra;
      const baseJson = JSON.stringify(cleanBase);
      const prevBaseJson = localStorage.getItem(STORAGE_FILE_CFG_KEY);
      let saved = {};
      try {
        const rawSaved = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
        if (rawSaved && typeof rawSaved === 'object') saved = rawSaved;
      } catch {}
      if (prevBaseJson && prevBaseJson !== baseJson) {
        // 3-way diff merge: only keys modified externally in config.json override saved UI state.
        let prevBase = {};
        try {
          prevBase = JSON.parse(prevBaseJson) || {};
        } catch {}
        const merged = { ...saved };
        for (const key of Object.keys(cleanBase)) {
          if (prevBase[key] !== cleanBase[key]) {
            merged[key] = cleanBase[key];
          }
        }
        localStorage.setItem(STORAGE_FILE_CFG_KEY, baseJson);
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
        return { ...base, ...merged };
      }
      if (!prevBaseJson) localStorage.setItem(STORAGE_FILE_CFG_KEY, baseJson);
      return { ...base, ...saved };
    } catch {
      return { ...base };
    }
  }

  let runtimeInitConfig = { ...initialConfig };
  let cfg = loadSettings(runtimeInitConfig);
  let destroyed = false;

  function saveSetting(key, value) {
    cfg[key] = value;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
      saved[key] = value;
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(saved));
    } catch {}
    try {
      const send = window[cfg.binding];
      if (typeof send === 'function') send(JSON.stringify({ key, value }));
    } catch {}
    applyRootAttrs();
    scheduleSync();
  }

  function getLang() {
    const raw = cfg.language || initialConfig?.language || 'zh-CN';
    if (i18nCore && typeof i18nCore.normalizeLanguage === 'function') {
      return i18nCore.normalizeLanguage(raw);
    }
    return raw === 'zh-TW' || raw === 'yue' || raw === 'en' || raw === 'ja' ? raw : 'zh-CN';
  }

  function uiText(lang = getLang()) {
    if (i18nLocales && typeof i18nLocales.getUiStrings === 'function') {
      return i18nLocales.getUiStrings(lang);
    }
    return {};
  }

  function isZh() {
    const lang = getLang();
    return lang === 'zh-CN' || lang === 'zh-TW' || lang === 'yue';
  }

  function fmtBucketReset(bucket, lang = getLang()) {
    if (!bucket) return '';
    if (bucket.resetSeconds > 0 && typeof usageCore?.fmtResetTime === 'function') {
      return usageCore.fmtResetTime(bucket.resetSeconds, lang) || bucket.resetIn || '';
    }
    return bucket.resetIn || '';
  }

  function isDarkTheme() {
    const b = document.body?.classList;
    const h = document.documentElement?.classList;
    if (b?.contains('theme-light') || b?.contains('light-theme') || b?.contains('light')) return false;
    if (b?.contains('theme-dark') || b?.contains('dark') || b?.contains('dark-theme')) return true;
    if (h?.contains('theme-light') || h?.contains('light-theme') || h?.contains('light')) return false;
    if (h?.contains('theme-dark') || h?.contains('dark') || h?.contains('dark-theme')) return true;
    return true;
  }

  let lastThemeKey = '';
  let lastAppliedLang = '';

  function refreshOpenContextPopover() {
    if (!openPopover || !openPopover.isConnected) return;
    const latest = activeTrajCache.get(openPopoverCascadeId)?.data || null;
    renderContextPopoverContent(openPopover, latest, openPopoverCascadeId);
    if (openPopoverAnchor && openPopoverAnchor.isConnected) {
      positionPopoverAboveAnchor(openPopover, openPopoverAnchor);
    }
  }

  function refreshOpenUiForLanguage() {
    const inHero = Boolean(document.querySelector('.agy-home [data-testid="home-greeting"]'));
    syncGreeting(inHero);
    if (inHero && cfg.homeLayout === 'studio') renderHomePanel(true);
    refreshOpenEffortPopover();
    refreshOpenContextPopover();
    syncComposers();
    ensureSettingsSection();
  }

  function applyRootAttrs() {
    const html = document.documentElement;
    if (!html) return;
    const palette = cfg.palette === 'claude' ? 'claude' : cfg.palette === 'host' ? 'host' : 'obsidian';
    const lang = getLang();
    html.setAttribute('data-ag-cs-style', '1');
    html.setAttribute('data-ag-cs-palette', palette);
    html.setAttribute('data-ag-cs-home', cfg.homeLayout === 'classic' ? 'classic' : cfg.homeLayout === 'off' ? 'off' : 'studio');
    html.setAttribute('data-ag-cs-composer', cfg.composerRestyle === false ? 'off' : 'on');
    html.setAttribute('data-ag-cs-logo-ink', cfg.logoInk === 'foreground' ? 'foreground' : 'accent');
    html.setAttribute('data-ag-cs-sidebar', cfg.sidebarRestyle === false ? 'off' : 'on');
    html.setAttribute('data-ag-cs-sidebar-compact', cfg.sidebarCompact === true ? 'on' : 'off');
    html.setAttribute('data-ag-cs-hud-compact', cfg.hudCompact === true ? 'on' : 'off');
    html.setAttribute('data-ag-cs-effort-accent', cfg.effortAccent === false ? 'off' : 'on');
    html.setAttribute('data-ag-cs-lang', lang);
    const isCjk = i18nCore && typeof i18nCore.isCjkLanguage === 'function' ? i18nCore.isCjkLanguage(lang) : isZh();
    if (isCjk) html.setAttribute('data-ag-cs-cjk', '1');
    else html.removeAttribute('data-ag-cs-cjk');

    const prevLang = lastAppliedLang;
    if (domTranslator && typeof domTranslator.setExtraLocales === 'function') {
      domTranslator.setExtraLocales(runtimeInitConfig?.i18nExtra || null, document);
    }
    if (lang !== prevLang) {
      lastAppliedLang = lang;
      if (typeof window !== 'undefined' && window.__agI18n && typeof window.__agI18n.revert === 'function') {
        try {
          window.__agI18n.revert();
        } catch {}
      }
      if (domTranslator && typeof domTranslator.setLanguage === 'function') {
        domTranslator.setLanguage(lang, document);
      }
      if (prevLang !== '') {
        refreshOpenUiForLanguage();
      }
    }

    const perfBd = cfg.performanceBackdrop === 'page' || cfg.performanceBackdrop === 'off' ? cfg.performanceBackdrop : 'card';
    html.setAttribute('data-ag-cs-perf-backdrop', perfBd);
    if (perfBd !== 'page' || effortCore.normalizeEffortStyle(cfg.effortSliderStyle) !== 'liangwufeng') {
      unmountPerfBackdrop();
    }
    const dark = isDarkTheme();
    const themeKey = `${palette}|${dark ? 'd' : 'l'}`;
    if (themeKey !== lastThemeKey) {
      lastThemeKey = themeKey;
      if (rippleMount && typeof rippleMount.refreshTheme === 'function') {
        rippleMount.refreshTheme();
      }
      refreshOpenEffortPopover();
    }
  }

  // ── Antigravity React Fiber & Store Bridge ─────────────────────────────
  let cachedSvc = null;
  let cachedStore = null;
  let cachedTrajCtx = null;
  let trajCtxScannedAnchorCount = -1;
  let lastTrajAnchorEl = null;
  let storeUnsub = null;
  let storeDebounce = null;
  const cloudOnlyCascadeIds = new Set();
  const watchedAgentProviders = new Map(); // cascadeId -> { provider, disposable, timer }

  function sameCascadeId(a, b) {
    const sa = String(a || '').trim();
    const sb = String(b || '').trim();
    if (!sa || !sb) return false;
    if (sa === sb) return true;
    const tailA = sa.includes('/') ? sa.split('/').pop() : sa;
    const tailB = sb.includes('/') ? sb.split('/').pop() : sb;
    return Boolean(tailA && tailA === tailB);
  }

  function isTrajectoriesContext(v) {
    if (!v || typeof v !== 'object') return false;
    return (
      typeof v.getAgentStates === 'function' ||
      (typeof v.peek === 'function' && typeof v.subscribe === 'function')
    );
  }

  function isAppRootStore(s) {
    if (!s || typeof s.getState !== 'function') return false;
    try {
      const st = s.getState();
      return Boolean(
        st &&
          typeof st === 'object' &&
          ('trajectorySummaries' in st ||
            'cascadeTrajectorySummaries' in st ||
            'userStatus' in st ||
            'conversation' in st)
      );
    } catch {
      return false;
    }
  }

  function ensureHooks(allowPartial = false) {
    const anchors = document.querySelectorAll(
      '[data-testid="conversation-view"], [data-testid="agent-input-box"], [data-testid="agent-response"], [data-testid="conversation-row-sidebar"], [data-testid="new-conversation-button"], [data-testid="home-greeting"]'
    );
    const primaryAnchor = anchors[0] || null;
    if (
      cachedSvc &&
      cachedStore &&
      isAppRootStore(cachedStore) &&
      (cachedTrajCtx || (trajCtxScannedAnchorCount === anchors.length && lastTrajAnchorEl === primaryAnchor))
    ) {
      return { svc: cachedSvc, store: cachedStore, trajCtx: cachedTrajCtx };
    }
    let bestRootStore = isAppRootStore(cachedStore) ? cachedStore : null;
    let fallbackStore = cachedStore || null;
    for (const el of anchors) {
      const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      for (let f = key && el[key]; f && !(cachedSvc && bestRootStore && cachedTrajCtx); f = f.return) {
        const p = f.memoizedProps;
        if (p && p.store && typeof p.store.getState === 'function') {
          if (isAppRootStore(p.store)) bestRootStore = bestRootStore || p.store;
          else if (!fallbackStore) fallbackStore = p.store;
        }
        for (let d = f.dependencies && f.dependencies.firstContext; d; d = d.next) {
          const v = d.memoizedValue;
          if (!v || typeof v !== 'object') continue;
          if (!cachedSvc && typeof v.getCascadeTrajectory === 'function') cachedSvc = v;
          if (!cachedTrajCtx && isTrajectoriesContext(v)) cachedTrajCtx = v;
          if (v.store && typeof v.store.getState === 'function') {
            if (isAppRootStore(v.store)) bestRootStore = bestRootStore || v.store;
            else if (!fallbackStore) fallbackStore = v.store;
          }
        }
      }
      if (cachedSvc && bestRootStore && cachedTrajCtx) break;
    }
    trajCtxScannedAnchorCount = anchors.length;
    lastTrajAnchorEl = primaryAnchor;
    const chosenStore = bestRootStore || fallbackStore;
    if (chosenStore && chosenStore !== cachedStore) {
      if (storeUnsub) {
        try {
          storeUnsub();
        } catch {}
        storeUnsub = null;
      }
      cachedStore = chosenStore;
    }
    if (cachedStore && !storeUnsub && typeof cachedStore.subscribe === 'function') {
      storeUnsub = cachedStore.subscribe(() => {
        if (destroyed || storeDebounce) return;
        storeDebounce = setTimeout(() => {
          storeDebounce = null;
          if (!destroyed) onStoreChanged();
        }, 150);
      });
    }
    if (cachedSvc && cachedStore) return { svc: cachedSvc, store: cachedStore, trajCtx: cachedTrajCtx };
    if (allowPartial && (cachedSvc || cachedStore || cachedTrajCtx)) {
      return { svc: cachedSvc, store: cachedStore, trajCtx: cachedTrajCtx };
    }
    return null;
  }

  function findCascadeAgentStateProvider(cascadeId, scopeEl) {
    const id = String(cascadeId || '').trim();
    const peekFromTrajCtx = (ctx) => {
      if (!ctx || !id) return null;
      try {
        if (typeof ctx.peek === 'function') {
          const p = ctx.peek(id);
          if (p && typeof p.getState === 'function') return p;
        }
        if (typeof ctx.getAgentStates === 'function') {
          const states = ctx.getAgentStates();
          if (states instanceof Map) {
            const direct = states.get(id);
            if (direct?.provider && typeof direct.provider.getState === 'function') return direct.provider;
            for (const [k, entry] of states.entries()) {
              if (sameCascadeId(k, id) && entry?.provider && typeof entry.provider.getState === 'function') {
                return entry.provider;
              }
            }
          } else if (states && typeof states === 'object') {
            const direct = states[id];
            if (direct?.provider && typeof direct.provider.getState === 'function') return direct.provider;
          }
        }
      } catch {}
      return null;
    };

    const fromCached = peekFromTrajCtx(cachedTrajCtx);
    if (fromCached) return fromCached;

    const probes = [];
    if (scopeEl) probes.push(scopeEl);
    const cv = document.querySelector('[data-testid="conversation-view"]');
    if (cv && !probes.includes(cv)) probes.push(cv);
    const ib = document.querySelector('[data-testid="agent-input-box"]');
    if (ib && !probes.includes(ib)) probes.push(ib);

    for (const el of probes) {
      const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      for (let f = key && el[key], depth = 0; f && depth < 80; f = f.return, depth++) {
        for (let d = f.dependencies && f.dependencies.firstContext; d; d = d.next) {
          const v = d.memoizedValue;
          if (!v || typeof v !== 'object') continue;
          if (!cachedTrajCtx && isTrajectoriesContext(v)) {
            cachedTrajCtx = v;
            const hit = peekFromTrajCtx(v);
            if (hit) return hit;
          }
          const prov = v.cascadeContext?.state?.agentStateProvider || v.agentStateProvider;
          if (prov && typeof prov.getState === 'function') {
            try {
              const pCid = prov.getState()?.conversationId || '';
              if (!id || !pCid || sameCascadeId(pCid, id)) return prov;
            } catch {}
          }
        }
      }
    }
    return null;
  }

  function unwatchAgentStateProvider(cascadeId) {
    const rec = watchedAgentProviders.get(cascadeId);
    if (!rec) return;
    watchedAgentProviders.delete(cascadeId);
    if (rec.timer) {
      clearTimeout(rec.timer);
      rec.timer = null;
    }
    try {
      if (typeof rec.disposable === 'function') rec.disposable();
      else if (rec.disposable && typeof rec.disposable.dispose === 'function') rec.disposable.dispose();
    } catch {}
  }

  function unwatchAllAgentStateProviders() {
    for (const id of Array.from(watchedAgentProviders.keys())) {
      unwatchAgentStateProvider(id);
    }
  }

  function watchAgentStateProvider(cascadeId, provider) {
    if (destroyed || !cascadeId || !provider || typeof provider.onDidChange !== 'function') return;
    const existing = watchedAgentProviders.get(cascadeId);
    if (existing && existing.provider === provider) return;
    if (existing) unwatchAgentStateProvider(cascadeId);
    if (watchedAgentProviders.size >= 4) {
      for (const oldId of watchedAgentProviders.keys()) {
        if (oldId !== cascadeId) {
          unwatchAgentStateProvider(oldId);
          break;
        }
      }
    }
    const rec = { provider, disposable: null, timer: null };
    try {
      rec.disposable = provider.onDidChange(() => {
        if (destroyed || rec.timer) return;
        rec.timer = setTimeout(() => {
          rec.timer = null;
          if (destroyed) return;
          const cacheEntry = activeTrajCache.get(cascadeId);
          if (cacheEntry) cacheEntry.lastAt = 0;
          scheduleSync();
        }, 150);
      });
      watchedAgentProviders.set(cascadeId, rec);
    } catch {}
  }

  function hasUsableAgentState(state) {
    if (!state || typeof state !== 'object') return false;
    const slice = state.trajectorySlice;
    if (Array.isArray(slice?.stepsInSlice) && slice.stepsInSlice.length > 0) return true;
    if (Array.isArray(state.steps) && state.steps.length > 0) return true;
    if (state.contextWindowUsage && Number(state.contextWindowUsage.estimatedTokensUsed || 0) > 0) return true;
    return false;
  }

  function isCloudOnlyTrajectoryError(err) {
    const msg = String(err?.message || err || '');
    return /unimplemented|cloudproxy|GetConversation/i.test(msg);
  }

  async function fetchAgentStateSnapshot(cascadeId, h, timeoutMs = 3500) {
    if (!cascadeId || destroyed) return null;
    let prov = null;
    let cleanup = null;
    try {
      if (typeof h?.trajCtx?.subscribe === 'function') {
        const sub = h.trajCtx.subscribe(cascadeId);
        if (sub?.agentStateProvider && typeof sub.agentStateProvider.getState === 'function') {
          prov = sub.agentStateProvider;
          cleanup = () => {
            try {
              if (typeof sub.unsubscribe === 'function') sub.unsubscribe();
            } catch {}
          };
        }
      }
      if (!prov && typeof h?.svc?.createAgentStateProviderForConvo === 'function') {
        const created = h.svc.createAgentStateProviderForConvo(cascadeId);
        if (created && typeof created.getState === 'function') {
          prov = created;
          cleanup = () => {
            try {
              if (typeof created.dispose === 'function') created.dispose();
            } catch {}
          };
        }
      }
      if (!prov) return null;
      const initial = prov.getState();
      if (hasUsableAgentState(initial)) return initial;
      if (typeof prov.onDidChange === 'function' && timeoutMs > 0) {
        await new Promise((resolve) => {
          let settled = false;
          let disp = null;
          const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
              if (typeof disp === 'function') disp();
              else if (disp && typeof disp.dispose === 'function') disp.dispose();
            } catch {}
            resolve();
          };
          const timer = setTimeout(finish, timeoutMs);
          try {
            disp = prov.onDidChange(() => {
              try {
                if (hasUsableAgentState(prov.getState())) finish();
              } catch {}
            });
          } catch {
            finish();
          }
          try {
            if (hasUsableAgentState(prov.getState())) finish();
          } catch {}
        });
      }
      return prov.getState();
    } catch {
      return null;
    } finally {
      if (cleanup) cleanup();
    }
  }

  function normalizeAgentStatePayload(state, cascadeId) {
    if (!state || typeof state !== 'object') return null;
    if (typeof usageCore?.normalizeAgentStateToTrajectory === 'function') {
      return usageCore.normalizeAgentStateToTrajectory(state, cascadeId);
    }
    const slice = state.trajectorySlice || {};
    return {
      trajectory: {
        cascadeId: String(cascadeId || state.conversationId || slice.conversationId || ''),
        steps: Array.isArray(slice.stepsInSlice) ? slice.stepsInSlice : Array.isArray(state.steps) ? state.steps : [],
        generatorMetadata: Array.isArray(slice.generatorMetadatasInSlice) ? slice.generatorMetadatasInSlice : [],
        executorMetadatas: Array.isArray(slice.executorMetadatasInSlice)
          ? slice.executorMetadatasInSlice
          : state.executorMetadata
          ? [state.executorMetadata]
          : [],
        contextWindowUsage: state.contextWindowUsage || null,
        agentStatus: Number(state.status || 0),
        fullyIdle: typeof state.fullyIdle === 'boolean' ? state.fullyIdle : undefined,
      },
    };
  }

  async function resolveTrajectoryPayload(cascadeId, sum, h, opts = {}) {
    if (!cascadeId) return null;
    const isCloud = Boolean(sum?.cloud === true || cloudOnlyCascadeIds.has(cascadeId));
    const liveProv = findCascadeAgentStateProvider(cascadeId, opts.scopeEl);
    const liveState = liveProv ? liveProv.getState?.() || null : null;
    if (liveProv && (isCloud || opts.watchLive)) {
      watchAgentStateProvider(cascadeId, liveProv);
    }

    if (isCloud) {
      if (hasUsableAgentState(liveState)) {
        return normalizeAgentStatePayload(liveState, cascadeId);
      }
      if (!liveProv || opts.allowTempStream) {
        const snap = await fetchAgentStateSnapshot(cascadeId, h, opts.timeoutMs || 3500);
        if (hasUsableAgentState(snap)) return normalizeAgentStatePayload(snap, cascadeId);
        if (snap) return normalizeAgentStatePayload(snap, cascadeId);
      }
      return liveState ? normalizeAgentStatePayload(liveState, cascadeId) : null;
    }

    if (typeof h?.svc?.getCascadeTrajectory === 'function') {
      try {
        const res = await h.svc.getCascadeTrajectory({ cascadeId });
        const traj = res?.response?.trajectory || res?.trajectory || res;
        if (
          res &&
          ((Array.isArray(traj?.steps) && traj.steps.length > 0) ||
            (Array.isArray(traj?.generatorMetadata) && traj.generatorMetadata.length > 0) ||
            !hasUsableAgentState(liveState))
        ) {
          return res;
        }
      } catch (err) {
        if (isCloudOnlyTrajectoryError(err)) {
          cloudOnlyCascadeIds.add(cascadeId);
          if (liveProv) watchAgentStateProvider(cascadeId, liveProv);
        }
      }
    }

    if (hasUsableAgentState(liveState)) {
      if (liveProv) watchAgentStateProvider(cascadeId, liveProv);
      return normalizeAgentStatePayload(liveState, cascadeId);
    }
    if (opts.allowTempStream !== false) {
      const snap = await fetchAgentStateSnapshot(cascadeId, h, opts.timeoutMs || 3500);
      if (snap) return normalizeAgentStatePayload(snap, cascadeId);
    }
    return liveState ? normalizeAgentStatePayload(liveState, cascadeId) : null;
  }

  function getDisplayName() {
    const h = ensureHooks(true);
    const raw = String(h?.store?.getState()?.userStatus?.name || '').trim();
    if (!raw) return '';
    return raw.split(/\s+/)[0] || raw;
  }

  function normalizeCascadeId(raw) {
    const s = String(raw || '').trim();
    if (!s || s === 'conversation') return '';
    const m = s.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    return m ? m[1] : s;
  }

  function resolveCascadeId(inputBox) {
    const cv = inputBox ? inputBox.closest('[data-testid="conversation-view"]') : document.querySelector('[data-testid="conversation-view"]');
    if (inputBox && !cv && inputBox.closest('.agy-home')) {
      return '';
    }
    if (cv) {
      const attrId = normalizeCascadeId(cv.getAttribute('data-cascade-id'));
      if (attrId) return attrId;
    }
    const readIdFromObj = (obj) => {
      if (!obj || typeof obj !== 'object') return '';
      if (typeof obj.cascadeId === 'string') {
        const id = normalizeCascadeId(obj.cascadeId);
        if (id) return id;
      }
      if (typeof obj.conversationId === 'string') {
        const id = normalizeCascadeId(obj.conversationId);
        if (id) return id;
      }
      if (typeof obj.trajectory?.cascadeId === 'string') {
        const id = normalizeCascadeId(obj.trajectory.cascadeId);
        if (id) return id;
      }
      const provCid =
        obj.cascadeContext?.state?.agentStateProvider?.getState?.()?.conversationId ||
        obj.agentStateProvider?.getState?.()?.conversationId ||
        '';
      if (typeof provCid === 'string') {
        const id = normalizeCascadeId(provCid);
        if (id) return id;
      }
      return '';
    };
    const readCascadeFromFiber = (el, maxDepth) => {
      if (!el) return '';
      const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      for (let f = key && el[key], d = 0; f && d < maxDepth; f = f.return, d++) {
        const fromProps = readIdFromObj(f.memoizedProps) || readIdFromObj(f.pendingProps);
        if (fromProps) return fromProps;
        for (let ctx = f.dependencies && f.dependencies.firstContext; ctx; ctx = ctx.next) {
          const fromCtx = readIdFromObj(ctx.memoizedValue);
          if (fromCtx) return fromCtx;
        }
      }
      return '';
    };
    const fromInputFiber = readCascadeFromFiber(inputBox, 60);
    if (fromInputFiber) return fromInputFiber;
    const fromCvFiber = readCascadeFromFiber(cv, 40);
    if (fromCvFiber) return fromCvFiber;
    if (cv) {
      const resp = cv.querySelector('[data-testid="agent-response"]');
      const tf = resp && extractFiberTurnContainer(resp);
      const tfId = normalizeCascadeId(tf?.cascadeId);
      if (tfId) return tfId;
    }
    if (!inputBox?.closest?.('[data-testid="subagent-tab-conversation"]')) {
      const h = ensureHooks(true);
      const convoState = h?.store?.getState?.()?.conversation?.convoState;
      if (convoState?.type === 'active' && typeof convoState.cascadeId === 'string') {
        const id = normalizeCascadeId(convoState.cascadeId);
        if (id) return id;
      }
      if (convoState?.type === 'subagent' && typeof convoState.childConversationId === 'string') {
        const id = normalizeCascadeId(convoState.childConversationId);
        if (id) return id;
      }
    }
    const m = location.pathname.match(/\/c\/([0-9a-f-]{36})/i);
    if (m) return m[1];
    return '';
  }

  // ── Usage Rollup Store (Incremental localStorage cache + live refresh) ──
  const usageRecords = new Map(); // cascadeId -> record
  let usageLoading = false;
  let usageHasData = false;
  let lastUsageFetchAt = 0;
  let bookPick = 0.07; // picks Alice / classic benchmark stably per home mount, refreshed on return
  let activeTab = 'overview';
  let activeRange = 'all';
  let modelsExpanded = false;
  let lastPanelRenderKey = '';

  function loadUsageCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_USAGE_CACHE_KEY) || '{}');
      if (raw && typeof raw === 'object') {
        for (const [id, rec] of Object.entries(raw)) {
          if (rec && rec.days) usageRecords.set(id, rec);
        }
        if (usageRecords.size > 0) usageHasData = true;
      }
    } catch {}
  }

  function saveUsageCache() {
    try {
      const obj = {};
      for (const [id, rec] of usageRecords.entries()) obj[id] = rec;
      localStorage.setItem(STORAGE_USAGE_CACHE_KEY, JSON.stringify(obj));
    } catch {}
  }

  loadUsageCache();

  async function refreshUsageRollup(force = false) {
    if (destroyed || usageLoading) return;
    const h = ensureHooks();
    if (!h) return;
    const now = Date.now();
    if (!force && usageHasData && now - lastUsageFetchAt < 15000) return;
    const stRollup = h.store.getState();
    const sums = { ...(stRollup.cascadeTrajectorySummaries || {}), ...(stRollup.trajectorySummaries?.summaries || {}) };
    const entries = Object.entries(sums).filter(([, s]) => !!s);
    if (entries.length === 0) {
      usageHasData = true;
      renderHomePanel();
      return;
    }

    const staleIds = [];
    const presentIds = new Set();
    for (const [id, sum] of entries) {
      presentIds.add(id);
      const stepCount = Number(sum.stepCount || 0);
      const lastModSec = Math.floor(
        typeof usageCore?.tsSec === 'function' ? usageCore.tsSec(sum.lastModifiedTime) : Number(sum.lastModifiedTime?.seconds || 0)
      );
      const cached = usageRecords.get(id);
      const cachedSumSteps = cached && cached.summaryStepCount !== undefined ? cached.summaryStepCount : cached?.stepCount;
      const isCloudSum = Boolean(sum.cloud === true || cloudOnlyCascadeIds.has(id));
      const sameVersion =
        cached &&
        cached.lastModifiedSec === lastModSec &&
        (isCloudSum ? true : cachedSumSteps === stepCount);
      if (!sameVersion) {
        staleIds.push([id, sum, stepCount, lastModSec]);
      }
    }
    for (const oldId of Array.from(usageRecords.keys())) {
      if (!presentIds.has(oldId)) usageRecords.delete(oldId);
    }

    if (staleIds.length === 0) {
      usageHasData = true;
      lastUsageFetchAt = now;
      renderHomePanel();
      return;
    }

    usageLoading = true;
    renderHomePanel();
    try {
      const CONCURRENCY = 6;
      for (let i = 0; i < staleIds.length && !destroyed; i += CONCURRENCY) {
        const batch = staleIds.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map(async ([id, sum, stepCount, lastModSec]) => {
            try {
              const isCloudSum = Boolean(sum.cloud === true || cloudOnlyCascadeIds.has(id));
              const res = await resolveTrajectoryPayload(id, sum, h, {
                allowTempStream: isCloudSum ? !sum?.annotations?.archived : false,
                timeoutMs: 2500,
              });
              if (res) {
                const rec = usageCore.analyzeTrajectoryForUsage(res, sum, id);
                usageRecords.set(id, rec);
              } else if (isCloudSum) {
                usageRecords.set(id, {
                  cascadeId: String(id),
                  stepCount: 0,
                  summaryStepCount: stepCount,
                  lastModifiedSec: lastModSec,
                  subagent: typeof usageCore?.isSubagentSummary === 'function' ? usageCore.isSubagentSummary(sum) : false,
                  calls: 0,
                  days: {},
                });
              }
            } catch {}
          })
        );
      }
      if (!destroyed) {
        usageHasData = true;
        lastUsageFetchAt = Date.now();
        saveUsageCache();
      }
    } finally {
      usageLoading = false;
      if (!destroyed) renderHomePanel();
    }
  }

  // ── Home Greeting Copy Manager (reversible) ────────────────────────────
  const replacedGreetings = new Map();
  let wasHero = false;

  function syncGreeting(inHero) {
    if (inHero && !wasHero) {
      bookPick = Math.random();
      if (cfg.homeLayout === 'studio') refreshUsageRollup(false);
    }
    wasHero = inHero;

    const h1 = document.querySelector('[data-testid="home-greeting"] h1');
    if (!h1) return;

    if (cfg.homeLayout !== 'studio') {
      h1.removeAttribute('data-ag-no-i18n');
      const orig = replacedGreetings.get(h1);
      if (orig !== undefined) {
        if (h1.textContent !== orig.host) {
          h1.textContent = orig.host;
        }
        replacedGreetings.delete(h1);
      }
      if (domTranslator && typeof domTranslator.translateNode === 'function') {
        domTranslator.translateNode(h1);
      }
      return;
    }

    const name = getDisplayName();
    const target = name ? `What's up next, ${name}?` : "What's up next?";
    h1.setAttribute('data-ag-no-i18n', '');
    if (h1.textContent !== target) {
      if (domTranslator && typeof domTranslator.revertNode === 'function') {
        domTranslator.revertNode(h1);
      }
      const prev = replacedGreetings.get(h1);
      const hostText = prev && h1.textContent === prev.written ? prev.host : h1.textContent || '';
      h1.textContent = target;
      replacedGreetings.set(h1, { host: hostText, written: target });
    }
  }

  function restoreGreetings() {
    for (const [el, rec] of replacedGreetings.entries()) {
      el.removeAttribute('data-ag-no-i18n');
      if (el.isConnected && el.textContent === rec.written) {
        el.textContent = rec.host;
      }
    }
    replacedGreetings.clear();
  }

  // ── Home Dashboard Card Renderer ───────────────────────────────────────
  let panelSeat = null;
  let panelEl = null;
  let heatTipEl = null;
  let modelColours = usageCore.createHomeModelColours();

  function ensurePanelSeat() {
    const home = document.querySelector('.agy-home');
    if (!home || cfg.homeLayout !== 'studio') {
      unmountPanelSeat();
      return null;
    }
    const greeting = home.querySelector('[data-testid="home-greeting"]');
    if (!greeting || !greeting.parentElement) return null;

    if (!panelSeat || !panelSeat.isConnected || panelSeat.parentElement !== greeting.parentElement) {
      unmountPanelSeat();
      panelSeat = document.createElement('div');
      panelSeat.className = 'ag-cs-home-panel-seat';
      panelSeat.setAttribute('data-ag-no-i18n', '');
      panelEl = document.createElement('section');
      panelEl.className = 'ag-cs-home-panel';
      panelSeat.appendChild(panelEl);
      greeting.parentElement.insertBefore(panelSeat, greeting.nextSibling);
    }
    return panelEl;
  }

  function unmountPanelSeat() {
    if (panelSeat && panelSeat.parentElement) panelSeat.parentElement.removeChild(panelSeat);
    panelSeat = null;
    panelEl = null;
    heatTipEl = null;
    lastPanelRenderKey = '';
  }

  function showHeatTip(cell, grid) {
    const tipText = cell.getAttribute('data-tip');
    if (!tipText || !heatTipEl) return;
    heatTipEl.textContent = tipText;
    heatTipEl.setAttribute('data-shown', 'true');
    const gBox = grid.getBoundingClientRect();
    const cBox = cell.getBoundingClientRect();
    const tBox = heatTipEl.getBoundingClientRect();
    const centred = cBox.left + cBox.width / 2 - tBox.width / 2;
    const left = Math.min(Math.max(centred, gBox.left), gBox.right - tBox.width) - gBox.left;
    const above = cBox.top - gBox.top;
    const below = gBox.bottom - cBox.bottom;
    const sideBelow = below > above && below >= tBox.height + 6;
    const top = (sideBelow ? cBox.bottom + 6 : cBox.top - 6 - tBox.height) - gBox.top;
    heatTipEl.style.left = Math.round(left) + 'px';
    heatTipEl.style.top = Math.round(top) + 'px';
  }

  function hideHeatTip() {
    if (heatTipEl) heatTipEl.removeAttribute('data-shown');
  }

  function renderHomePanel(force = false) {
    const panel = ensurePanelSeat();
    if (!panel) return;
    const lang = getLang();
    const ui = uiText(lang);
    const skeleton = !usageHasData && usageLoading;
    const data = usageCore.aggregateUsageRollup(Array.from(usageRecords.values()), activeRange, bookPick, lang);
    const renderKey = [
      lang,
      activeTab,
      activeRange,
      modelsExpanded ? '1' : '0',
      skeleton ? 'skel' : 'ready',
      usageRecords.size,
      data.sessions,
      data.calls,
      data.tokens,
      data.activeDays,
      data.peakHour || '',
      data.model || '',
    ].join('|');
    if (!force && renderKey === lastPanelRenderKey && panel.childElementCount > 0) return;
    lastPanelRenderKey = renderKey;

    panel.innerHTML = '';

    // Header: Tabs + Range Pills
    const head = document.createElement('div');
    head.className = 'ag-cs-home-panel-head';

    const tabs = document.createElement('div');
    tabs.className = 'ag-cs-home-tabs';
    for (const [id, label] of [
      ['overview', ui.tabOverview || 'Overview'],
      ['models', ui.tabModels || 'Models'],
    ]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-cs-home-tab';
      btn.setAttribute('data-tab', id);
      btn.textContent = label;
      if (activeTab === id) btn.setAttribute('data-active', '');
      btn.addEventListener('click', () => {
        activeTab = id;
        renderHomePanel();
      });
      tabs.appendChild(btn);
    }

    const ranges = document.createElement('div');
    ranges.className = 'ag-cs-home-ranges';
    for (const r of usageCore.HOME_RANGES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-cs-home-range';
      btn.setAttribute('data-range', r.id);
      btn.textContent = typeof usageCore.homeRangeLabel === 'function' ? usageCore.homeRangeLabel(r, lang) : r.labelEn;
      if (activeRange === r.id) btn.setAttribute('data-active', '');
      btn.addEventListener('click', () => {
        activeRange = r.id;
        renderHomePanel();
      });
      ranges.appendChild(btn);
    }

    head.appendChild(tabs);
    head.appendChild(ranges);
    panel.appendChild(head);

    if (activeTab === 'overview') {
      // 3x2 KPI grid
      const stats = document.createElement('div');
      stats.className = 'ag-cs-home-stats';
      const items = [
        ['sessions', ui.kpiSessions || 'Sessions', usageCore.formatHomeCount(data.sessions), String(data.sessions)],
        ['calls', ui.kpiCalls || 'Messages', usageCore.formatHomeCount(data.calls), String(data.calls)],
        ['tokens', ui.kpiTokens || 'Total tokens', usageCore.formatCompactTokens(data.tokens), usageCore.formatHomeCount(data.tokens) + ' tokens'],
        ['days', ui.kpiDays || 'Active days', usageCore.formatHomeCount(data.activeDays), String(data.activeDays)],
        ['peak', ui.kpiPeak || 'Peak hour', data.peakHour || '—', data.peakHour || '—'],
        ['model', ui.kpiFavModel || 'Favorite model', data.model || '—', data.model || '—'],
      ];
      for (const [k, label, valText, titleText] of items) {
        const cell = document.createElement('div');
        cell.className = 'ag-cs-home-stat';
        cell.setAttribute('data-stat', k);
        if (skeleton) cell.setAttribute('data-skeleton', '');
        const lbl = document.createElement('span');
        lbl.className = 'ag-cs-home-stat-label';
        lbl.textContent = label;
        const val = document.createElement('span');
        val.className = 'ag-cs-home-stat-value';
        val.textContent = skeleton ? '' : valText;
        if (!skeleton) val.title = titleText;
        cell.appendChild(lbl);
        cell.appendChild(val);
        stats.appendChild(cell);
      }
      panel.appendChild(stats);

      // 26x7 Heatmap grid
      const heat = document.createElement('div');
      heat.className = 'ag-cs-home-heat';
      if (skeleton) heat.setAttribute('data-skeleton', '');
      const fmt = usageCore.homeShortDateFormat(lang);
      for (const c of data.grid.cells) {
        const sq = document.createElement('span');
        sq.className = 'ag-cs-home-heat-cell';
        sq.setAttribute('data-level', String(c.level));
        if (!skeleton) {
          const tip = `${usageCore.homeShortDate(fmt, c.date)} — ${usageCore.formatCompactTokens(c.tokens)} ${ui.tokenUnit || 'tokens'}`;
          sq.setAttribute('data-tip', tip);
          sq.setAttribute('aria-label', tip);
        }
        heat.appendChild(sq);
      }
      heatTipEl = document.createElement('span');
      heatTipEl.className = 'ag-cs-home-heat-hint';
      heatTipEl.setAttribute('aria-hidden', 'true');
      heat.appendChild(heatTipEl);

      heat.addEventListener('mouseover', (ev) => {
        const target = ev.target && ev.target.closest ? ev.target.closest('.ag-cs-home-heat-cell') : null;
        if (target) showHeatTip(target, heat);
      });
      heat.addEventListener('mouseleave', hideHeatTip);
      panel.appendChild(heat);

      if (data.funBook) {
        const fun = document.createElement('span');
        fun.className = 'ag-cs-home-fun';
        fun.textContent = data.funBook;
        panel.appendChild(fun);
      }
    } else {
      // Models Tab: 30d/7d stacked bar chart + ranked list
      const models = data.models || [];
      if (models.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ag-cs-home-models-empty';
        empty.textContent = ui.noModelUsage || 'No model usage data yet';
        panel.appendChild(empty);
        return;
      }

      const ids = models.map((m) => m.id);
      for (const col of data.modelDays || []) {
        for (const id of Object.keys(col.models || {})) ids.push(id);
      }
      const colours = modelColours(ids);
      const columns = data.modelDays || [];
      const fmt = usageCore.homeShortDateFormat(lang);

      if (columns.length > 0) {
        let peak = 0;
        for (const col of columns) {
          let sum = 0;
          for (const t of Object.values(col.models)) sum += t;
          if (sum > peak) peak = sum;
        }
        const top = usageCore.axisMax(peak);
        const chart = document.createElement('div');
        chart.className = 'ag-cs-home-chart';

        const plot = document.createElement('div');
        plot.className = 'ag-cs-home-chart-plot';
        for (const at of [1, 0.75, 0.5, 0.25, 0]) {
          const tick = document.createElement('span');
          tick.className = 'ag-cs-home-chart-tick';
          tick.style.bottom = `${at * 100}%`;
          tick.textContent = top > 0 ? usageCore.formatCompactTokens(top * at) : '';
          plot.appendChild(tick);
        }

        const bars = document.createElement('div');
        bars.className = 'ag-cs-home-chart-bars';
        for (const col of columns) {
          let dayTotal = 0;
          const stack = [];
          for (const [mId, tok] of Object.entries(col.models)) {
            dayTotal += tok;
            stack.push({ id: mId, tokens: tok });
          }
          stack.sort((a, b) => b.tokens - a.tokens || a.id.localeCompare(b.id));
          const colEl = document.createElement('span');
          colEl.className = 'ag-cs-home-chart-col';
          colEl.title = `${usageCore.homeShortDate(fmt, col.date)} · ${usageCore.formatCompactTokens(dayTotal)}`;
          colEl.style.height = `${top > 0 ? (dayTotal / top) * 100 : 0}%`;
          for (const slice of stack) {
            const seg = document.createElement('span');
            seg.className = 'ag-cs-home-chart-seg';
            seg.setAttribute('data-color', String(colours[slice.id] ?? 0));
            seg.style.height = `${dayTotal > 0 ? (slice.tokens / dayTotal) * 100 : 0}%`;
            colEl.appendChild(seg);
          }
          bars.appendChild(colEl);
        }
        plot.appendChild(bars);
        chart.appendChild(plot);

        const axis = document.createElement('div');
        axis.className = 'ag-cs-home-chart-axis';
        chart.appendChild(axis);
        panel.appendChild(chart);

        // Compute non-overlapping X ticks after layout
        requestAnimationFrame(() => {
          if (!axis.isConnected) return;
          const labels = columns.map((c) => usageCore.homeShortDate(fmt, c.date));
          const widths = labels.map((l) => Math.max(32, l.length * 6.5));
          const ticks = usageCore.homeChartTicks(widths, plot.clientWidth || 420);
          axis.innerHTML = '';
          for (const tk of ticks) {
            const sp = document.createElement('span');
            sp.className = 'ag-cs-home-chart-label';
            sp.style.left = `${tk.left}px`;
            sp.textContent = labels[tk.index];
            axis.appendChild(sp);
          }
        });
      }

      // Ranked model rows
      let totalAll = 0;
      for (const m of models) totalAll += m.tokens;
      const shown = modelsExpanded ? models : models.slice(0, usageCore.HOME_MODEL_ROWS);
      const listEl = document.createElement('div');
      listEl.className = 'ag-cs-home-models';
      for (const m of shown) {
        const row = document.createElement('div');
        row.className = 'ag-cs-home-model';
        row.title = `${m.id} · ${m.sessions} ${ui.sessionsUnit || 'sessions'}`;
        const sw = document.createElement('span');
        sw.className = 'ag-cs-home-model-swatch';
        sw.setAttribute('data-color', String(colours[m.id] ?? 0));
        const nm = document.createElement('span');
        nm.className = 'ag-cs-home-model-name';
        nm.textContent = m.id;
        const inp = (m.input || 0) + (m.cacheRead || 0) + (m.cacheWrite || 0);
        const outTok = m.output || 0;
        const sp = document.createElement('span');
        sp.className = 'ag-cs-home-model-split';
        sp.textContent = `${usageCore.formatCompactTokens(inp)} in · ${usageCore.formatCompactTokens(outTok)} out`;
        const sh = document.createElement('span');
        sh.className = 'ag-cs-home-model-share';
        sh.textContent = totalAll > 0 ? ((Math.round((m.tokens / totalAll) * 1000) / 10).toFixed(1) + '%') : '—';
        row.appendChild(sw);
        row.appendChild(nm);
        row.appendChild(sp);
        row.appendChild(sh);
        listEl.appendChild(row);
      }
      if (models.length > usageCore.HOME_MODEL_ROWS) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'ag-cs-home-models-more';
        const hiddenCount = models.length - shown.length;
        more.textContent = modelsExpanded
          ? ui.showLess || 'Show less'
          : typeof ui.showMoreN === 'function'
          ? ui.showMoreN(hiddenCount)
          : `Show ${hiddenCount} more`;
        more.addEventListener('click', () => {
          modelsExpanded = !modelsExpanded;
          renderHomePanel();
        });
        listEl.appendChild(more);
      }
      panel.appendChild(listEl);
    }
  }

  // ── Home Interactive ASCII Matrix & Ripple Field ───────────────────────
  let rippleMount = null;

  function motionReduced() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function readRipplePalette(canvas) {
    const cs = getComputedStyle(canvas);
    const ink = rippleCore.parseCssColorToRgb(cs.getPropertyValue('--ag-cs-ripple-ink')) || [136, 146, 159];
    const wave = rippleCore.parseCssColorToRgb(cs.getPropertyValue('--ag-cs-ripple-wave')) || [127, 166, 255];
    const dark = isDarkTheme();
    const fontFamily = cs.getPropertyValue('--font-mono').trim() || 'ui-monospace, Consolas, monospace';
    return { ink, wave, dark, fontFamily };
  }

  function unmountRipple() {
    if (!rippleMount) return;
    clearTimeout(rippleMount.timer);
    if (rippleMount.rafId) cancelAnimationFrame(rippleMount.rafId);
    if (rippleMount.ro && typeof rippleMount.ro.disconnect === 'function') rippleMount.ro.disconnect();
    if (rippleMount.root && typeof rippleMount.root.removeEventListener === 'function') {
      rippleMount.root.removeEventListener('pointerdown', rippleMount.onPress);
    }
    document.removeEventListener('visibilitychange', rippleMount.onVis);
    if (rippleMount.field && typeof rippleMount.field.dispose === 'function') {
      rippleMount.field.dispose();
    }
    if (rippleMount.host && typeof rippleMount.host.remove === 'function') {
      rippleMount.host.remove();
    }
    rippleMount = null;
  }

  function syncRipple() {
    const home = cfg.homeRipple !== false && cfg.homeLayout !== 'off' ? document.querySelector('.agy-home') : null;
    if (rippleMount && (rippleMount.root !== home || !rippleMount.canvas.isConnected)) {
      unmountRipple();
    }
    if (!home || rippleMount) return;

    const host = document.createElement('div');
    host.className = 'ag-cs-ripple-host';
    host.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    canvas.className = 'ag-cs-ripple-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    home.insertBefore(host, home.firstChild);

    const state = {
      root: home,
      host,
      canvas,
      width: -1,
      height: -1,
      dpr: 0,
      waves: null,
      field: null,
      timer: 0,
      rafId: 0,
      ro: null,
      onPress: null,
      onVis: null,
    };
    let previous = performance.now();
    let frameWanted = false;
    let drawnOnce = false;

    function layout() {
      const w = home.clientWidth;
      const h = home.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w === state.width && h === state.height && dpr === state.dpr) return;
      state.width = w;
      state.height = h;
      state.dpr = dpr;
      if (w <= 0 || h <= 0) {
        if (state.field) {
          state.field.dispose();
          state.field = null;
        }
        state.waves = null;
        canvas.width = 0;
        canvas.height = 0;
        drawnOnce = false;
        return;
      }
      const cols = Math.ceil(w / rippleCore.RIPPLE.cellWidth);
      const rows = Math.ceil(h / rippleCore.RIPPLE.cellHeight);
      canvas.width = Math.round(cols * rippleCore.RIPPLE.cellWidth * dpr);
      canvas.height = Math.round(rows * rippleCore.RIPPLE.cellHeight * dpr);
      canvas.style.width = `${cols * rippleCore.RIPPLE.cellWidth}px`;
      canvas.style.height = `${rows * rippleCore.RIPPLE.cellHeight}px`;
      if (state.field) state.field.dispose();
      state.waves = rippleCore.createWaveField(cols, rows);
      state.field = rippleCore.createGlyphField(canvas, cols, rows, state.waves);
      drawnOnce = false;
    }

    function wake() {
      clearTimeout(state.timer);
      state.timer = 0;
      if (destroyed || frameWanted) return;
      if (document.hidden) {
        if (!drawnOnce && canvas.width > 0) drawFrame(performance.now());
        return;
      }
      frameWanted = true;
      state.rafId = requestAnimationFrame(drawFrame);
    }

    function sleep(now) {
      if (destroyed || document.hidden) return;
      const period = 1000 / rippleCore.RIPPLE.changeRate;
      state.timer = setTimeout(wake, period - (now % period) + 1);
    }

    function drawFrame(now) {
      state.rafId = 0;
      frameWanted = false;
      if (destroyed) return;
      const still = motionReduced();
      if (state.waves) state.waves.advance(still ? 0 : (now - previous) / 1000);
      previous = now;
      if (canvas.width > 0 && state.field && state.field.needsDraw(now, still)) {
        const pal = readRipplePalette(canvas);
        state.field.draw(now, pal, still);
        drawnOnce = true;
      }
      if (state.field && state.field.busy() && !still) wake();
      else sleep(now);
    }

    state.onPress = (ev) => {
      if (ev.button !== 0 || motionReduced() || !state.waves) return;
      const rect = canvas.getBoundingClientRect();
      const col = Math.floor((ev.clientX - rect.left) / rippleCore.RIPPLE.cellWidth);
      const row = Math.floor((ev.clientY - rect.top) / rippleCore.RIPPLE.cellHeight);
      previous = performance.now();
      state.waves.disturb(col, row);
      wake();
    };
    home.addEventListener('pointerdown', state.onPress, { passive: true });

    state.onVis = () => {
      if (!document.hidden) {
        previous = performance.now();
        wake();
      } else {
        clearTimeout(state.timer);
        state.timer = 0;
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = 0;
        frameWanted = false;
      }
    };
    document.addEventListener('visibilitychange', state.onVis);

    if (typeof ResizeObserver === 'function') {
      state.ro = new ResizeObserver(() => {
        layout();
        wake();
      });
      state.ro.observe(home);
    }
    layout();
    state.refreshTheme = () => {
      if (state.field) state.field.invalidate();
      if (document.hidden && canvas.width > 0) drawFrame(performance.now());
      else wake();
    };
    wake();
    rippleMount = state;
  }

  // ── Composer Decorations, Token HUD Inspector, Effort Slider & Smooth Caret ─
  const MAX_ACTIVE_TRAJ_CACHE = 40;
  const MAX_SUBAGENT_TRAJ_CACHE = 80;
  const activeTrajCache = new Map(); // cascadeId -> { fetching, lastMod, lastStep, data }
  const subagentTrajCache = new Map(); // subId -> { stepCount, status, analysis }
  function pruneMapCache(map, maxEntries, protectedKeys) {
    if (!map || map.size <= maxEntries) return;
    for (const k of map.keys()) {
      if (map.size <= maxEntries) break;
      if (protectedKeys && protectedKeys.has(k)) continue;
      const val = map.get(k);
      if (val && (val.fetching || val.promise)) continue;
      map.delete(k);
    }
  }
  const knownModelMaxCtx = new Map(); // normalized model base -> maxContextTokens
  const expandedHudGroups = new Set();
  let cachedQuotaData = null;
  let quotaFetchPromise = null;
  let lastQuotaFetchAt = 0;
  let openPopover = null;
  let openPopoverAnchor = null;
  let openPopoverCascadeId = '';
  let activeHudTab = 'breakdown';

  function normalizeModelCtxKey(label) {
    return String(label || '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\b(?:low|medium|med|high|xhigh|extra|max|minimal|light|none|off|ultra)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function getKnownMaxContextForCard(card, data) {
    const key = normalizeModelCtxKey(getCurrentModelLabel(card) || data?.lastModel || '');
    return (key && knownModelMaxCtx.get(key)) || 0;
  }

  function createEmptyConvoData(cascadeId = '', maxContextTokens = 0) {
    const known = maxContextTokens > 0 ? { maxContextTokens } : undefined;
    if (usageCore && typeof usageCore.analyzeActiveConversation === 'function') {
      return usageCore.analyzeActiveConversation(null, { cascadeId, knownLimits: known });
    }
    const maxCtx = maxContextTokens > 0 ? maxContextTokens : 256000;
    return {
      cascadeId: String(cascadeId || ''),
      turns: 0,
      turnDetails: [],
      toolBreakdown: [],
      chatMsgTokens: 0,
      toolResultsTokens: 0,
      overheadTokens: 0,
      lastModel: '',
      lastFreshInput: 0,
      lastCacheRead: 0,
      lastOutput: 0,
      lastThinking: 0,
      totalOutput: 0,
      subagents: [],
      subagentCount: 0,
      subagentCalls: 0,
      subagentTokens: 0,
      calls: 0,
      totalCalls: 0,
      callList: [],
      lastCall: null,
      hasCalls: false,
      steps: 0,
      totalSteps: 0,
      contextUsed: 0,
      contextRemaining: maxCtx,
      maxContextTokens: maxCtx,
      contextPct: 0,
      contextRemainingPct: 100,
      sysTokens: 0,
      toolsTokens: 0,
      msgTokens: 0,
      sysChildren: [],
      toolsChildren: [],
      msgChildren: [],
      topSteps: [],
      userMsgTokens: 0,
      botMsgTokens: 0,
      toolIoTokens: 0,
      sumInput: 0,
      sumCacheRead: 0,
      sumCacheWrite: 0,
      sumOutput: 0,
      sumThinking: 0,
      sumResponse: 0,
      totalTokens: 0,
      sumAllTokens: 0,
      cacheHitPct: 0,
      overallCacheHitPct: 0,
      overallThinkPct: 0,
      lastSpeed: 0,
      lastTtft: 0,
      avgTtft: 0,
      avgSpeed: 0,
      latestValidSpeed: 0,
      liveSpeed: 0,
      liveTokens: 0,
      displaySpeed: 0,
      isLiveSpeed: false,
      peakSpeed: 0,
      sustainedPeakSpeed: 0,
      checkpointIdx: -1,
      compactedSteps: 0,
      compactedAtTail: false,
      checkpoints: [],
      truncationReason: 0,
      budgets: { customizationTokenBudget: 20000, rulesTokenBudget: 20000 },
      hasActiveLimits: false,
      isRunning: false,
      isThinking: false,
      hasError: false,
    };
  }

  function resolveCardConvoData(card, fallbackData) {
    const ib = card?.closest?.('[data-testid="agent-input-box"]');
    const cid = resolveCascadeId(ib);
    if (cid) {
      const hit = activeTrajCache.get(cid)?.data;
      if (hit) return hit;
    }
    return card?._agCsLastData || fallbackData || createEmptyConvoData(cid, getKnownMaxContextForCard(card, fallbackData));
  }

  function closeContextPopover() {
    if (openPopover && openPopover.parentElement) openPopover.parentElement.removeChild(openPopover);
    openPopover = null;
    openPopoverAnchor = null;
    openPopoverCascadeId = '';
  }

  function formatCompactK(n) {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(2) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return String(Math.round(v));
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getCurrentModelLabel(card) {
    const scope = card || document;
    const btn = scope.querySelector('[data-testid="model-selector-trigger"]');
    if (btn) {
      const aria = btn.getAttribute('aria-label') || '';
      const jaMatch = aria.match(/（現在[：:]\s*(.+)）$/);
      if (jaMatch && jaMatch[1]) return jaMatch[1].trim();
      const m = aria.match(/(?:当前|目前|而家|现在|現在|Current)[：:]\s*(.+)$/i);
      if (m && m[1]) return m[1].trim();
      const txt = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt) return txt;
    }
    return '';
  }

  function getDraftInfo(card) {
    const scope = card || document.querySelector('[data-testid="agent-input-box"]') || document;
    const ed = scope.querySelector ? scope.querySelector('[contenteditable="true"]') : null;
    const raw = ed ? String(ed.innerText ?? ed.textContent ?? '').trim() : '';
    if (!raw || typeof usageCore.estimateTextTokens !== 'function') {
      return { tokens: 0, chars: 0, cjk: 0, words: 0, codeSymbols: 0 };
    }
    return usageCore.estimateTextTokens(raw);
  }

  async function fetchQuotaData(force = false) {
    const h = ensureHooks(true);
    if (!h) return cachedQuotaData;
    const now = Date.now();
    if (!force && cachedQuotaData && now - lastQuotaFetchAt < 25000) return cachedQuotaData;
    if (quotaFetchPromise) return quotaFetchPromise;
    quotaFetchPromise = (async () => {
      try {
        let raw = null;
        if (typeof h.svc?.retrieveUserQuotaSummary === 'function') {
          raw = await h.svc.retrieveUserQuotaSummary({});
        }
        if (typeof usageCore.normalizeQuotaData === 'function') {
          const st = h.store?.getState?.() || null;
          cachedQuotaData = usageCore.normalizeQuotaData(raw, st, st?.credits || null, getLang());
        }
        lastQuotaFetchAt = Date.now();
      } catch {} finally {
        quotaFetchPromise = null;
      }
      return cachedQuotaData;
    })();
    return quotaFetchPromise;
  }

  function getActiveQuotaForInfo(data, card) {
    if (typeof usageCore.getActiveQuotaInfo !== 'function') return null;
    const modelLabel = getCurrentModelLabel(card) || data?.lastModel || '';
    return usageCore.getActiveQuotaInfo(cachedQuotaData, modelLabel);
  }

  function getRingTelemetryForCard(card, data) {
    const draftEst = getDraftInfo(card);
    const activeQuota = getActiveQuotaForInfo(data, card);
    const knownMax = getKnownMaxContextForCard(card, data);
    const effectiveInfo =
      data && (data.hasActiveLimits || !knownMax)
        ? data
        : { ...(data || {}), maxContextTokens: knownMax || Number(data?.maxContextTokens || 256000) };
    if (typeof usageCore.computeRingTelemetry === 'function') {
      return {
        ring: usageCore.computeRingTelemetry({
          activeInfo: effectiveInfo,
          quotaInfo: activeQuota,
          draftTokens: draftEst.tokens,
          ringMode: cfg.ringMode || 'context',
          knownLimits: knownMax > 0 ? { maxContextTokens: knownMax } : null,
        }),
        draftEst,
        activeQuota,
      };
    }
    const maxTokens = Number(effectiveInfo?.maxContextTokens || 256000);
    const usedTokens = Number(data?.contextUsed || 0) + draftEst.tokens;
    const remainingTokens = Math.max(0, maxTokens - usedTokens);
    const pct = maxTokens > 0 ? Math.max(0, Math.min(100, (remainingTokens / maxTokens) * 100)) : 100;
    const pctRound = Math.round(pct);
    const color = pct <= 10 ? '#dc3c3d' : pct <= 30 ? '#fbb315' : '#257de0';
    return {
      ring: {
        mode: 'context',
        pct,
        remainingPct: pct,
        pctRound,
        level: pct <= 10 ? 'danger' : pct <= 30 ? 'warn' : 'ok',
        color,
        usedTokens,
        remainingTokens,
        maxTokens,
        draftTokens: draftEst.tokens,
        contextUsedPct: 100 - pct,
        contextRemainingPct: pct,
        quotaRemainingPct: null,
      },
      draftEst,
      activeQuota,
    };
  }

  function fillCompactCommand(scopeEl) {
    const scopedBox = scopeEl?.closest?.('[data-testid="agent-input-box"]') || scopeEl;
    const ed =
      scopedBox?.querySelector?.('[contenteditable="true"]') ||
      document.querySelector('[data-testid="agent-input-box"] [contenteditable="true"]');
    if (!ed) return false;
    try {
      ed.focus();
      if (typeof document.execCommand === 'function') {
        document.execCommand('selectAll', false, null);
        const ok = document.execCommand('insertText', false, '/compact');
        if (ok) return true;
      }
      ed.textContent = '/compact';
      if (typeof InputEvent === 'function') {
        ed.dispatchEvent(new InputEvent('input', { bubbles: true, data: '/compact', inputType: 'insertText' }));
      }
      return true;
    } catch {
      return false;
    }
  }

  function findAgentInputBoxSubmitProps(scopeEl) {
    const scopedBox =
      scopeEl?.closest?.('[data-testid="agent-input-box"]') ||
      document.querySelector('[data-testid="agent-input-box"]');
    const ed = scopedBox?.querySelector?.('[contenteditable="true"]') || scopedBox;
    if (!ed) return null;
    try {
      const fk = Object.keys(ed).find((k) => k.startsWith('__reactFiber$'));
      let handleSubmit = null;
      let slashCommandItems = null;
      for (let f = fk && ed[fk], d = 0; f && d < 40; f = f.return, d++) {
        const p = f.memoizedProps || f.pendingProps;
        if (p && typeof p === 'object') {
          if (!handleSubmit && typeof p.handleSubmit === 'function') {
            handleSubmit = p.handleSubmit;
          }
          if (!slashCommandItems && Array.isArray(p.slashCommandItems)) {
            slashCommandItems = p.slashCommandItems;
          }
          if (handleSubmit && slashCommandItems) break;
        }
      }
      if (handleSubmit) return { handleSubmit, slashCommandItems, box: scopedBox, ed };
    } catch {}
    return null;
  }

  function triggerAutoCompact(scopeEl) {
    // 1. Preferred path: invoke native AgentInputBox handleSubmit with exact /compact SlashCommandScopeItem
    //    so it compacts immediately without clobbering any unsent user draft text in the editor.
    const found = findAgentInputBoxSubmitProps(scopeEl);
    if (found && typeof found.handleSubmit === 'function') {
      try {
        const matched = Array.isArray(found.slashCommandItems)
          ? found.slashCommandItems.find(
              (x) => String(x?.title || x?.name || x?.info?.name || '').toLowerCase() === 'compact'
            )
          : null;
        const compactInfo = matched?.info || {
          $typeName: 'exa.codeium_common_pb.SlashCommandInfo',
          name: 'compact',
          modelFacingText: '',
          type: 1,
          icon: 'collapse_all',
          displayName: '',
          logo: '',
        };
        const items = [
          {
            $typeName: 'exa.codeium_common_pb.TextOrScopeItem',
            chunk: {
              case: 'item',
              value: {
                $typeName: 'exa.codeium_common_pb.ContextScopeItem',
                scopeItem: {
                  case: 'slashCommand',
                  value: {
                    $typeName: 'exa.codeium_common_pb.SlashCommandScopeItem',
                    argumentValues: {},
                    info: compactInfo,
                  },
                },
              },
            },
          },
          {
            $typeName: 'exa.codeium_common_pb.TextOrScopeItem',
            chunk: { case: 'text', value: ' ' },
          },
        ];
        const res = found.handleSubmit(items, [], () => {}, null);
        if (res && typeof res.catch === 'function') res.catch(() => {});
        markUserSubmitted();
        return true;
      } catch {}
    }

    // 2. Fallback path: fill /compact into composer, select slash option if shown, and submit via button/Enter
    const filled = fillCompactCommand(scopeEl);
    if (!filled) return false;
    const scopedBox =
      scopeEl?.closest?.('[data-testid="agent-input-box"]') ||
      document.querySelector('[data-testid="agent-input-box"]');
    const ed = scopedBox?.querySelector?.('[contenteditable="true"]');
    const trySubmitDom = () => {
      if (destroyed) return;
      const box =
        scopeEl?.closest?.('[data-testid="agent-input-box"]') ||
        document.querySelector('[data-testid="agent-input-box"]');
      const btns = box ? Array.from(box.querySelectorAll('button')) : [];
      const sendBtn = btns.find((b) => {
        if (b.disabled) return false;
        const tid = String(b.getAttribute('data-testid') || '');
        const bType = String(b.getAttribute('type') || '');
        const aria = String(b.getAttribute('aria-label') || '');
        return bType === 'submit' || /send|submit/i.test(tid) || /send|submit|发送|傳送|送信/i.test(aria);
      });
      if (sendBtn) {
        sendBtn.click();
        markUserSubmitted();
        return;
      }
      if (ed && ed.isConnected) {
        ed.focus();
        ed.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })
        );
        markUserSubmitted();
      }
    };
    setTimeout(() => {
      if (destroyed) return;
      const opt = Array.from(document.querySelectorAll('[role="option"], [data-testid="slash-command-menu"] button')).find(
        (el) => /\/?compact\b/i.test(String(el.textContent || ''))
      );
      if (opt && typeof opt.click === 'function') {
        opt.click();
        setTimeout(trySubmitDom, 120);
      } else {
        trySubmitDom();
      }
    }, 100);
    return true;
  }

  function buildQuotaDisplayInfo(info, card) {
    const zh = isZh();
    const lang = getLang();
    const tierTextsZh = [
      '钱袋满溢！额度超级充裕，放心冲鸭✦',
      '金袋叮当响~ 额度很健康，稳稳干活♪',
      '钱袋如常，额度用到一半啦，节奏刚刚好~',
      '数金皱眉… 额度有点紧了，省着点用喵！',
      '袋空如洗！！额度告急，快要见底啦！',
      '分文不剩了喵… 额度已被彻底用光(x_x)',
    ];
    const tierTextsEn = [
      'Quota overflowing! Plenty left, full speed ahead ✦',
      'Quota looks healthy~ steady coding ♪',
      'Halfway through quota, nice steady pace~',
      'Quota getting tight… spend wisely!',
      'Quota running very low!! Almost empty!',
      'Quota completely depleted (x_x)',
    ];
    const pickTier = (usedPct) => {
      const p = Number.isFinite(usedPct) && usedPct >= 0 ? Math.max(0, Math.min(100, Math.round(usedPct))) : 25;
      const idx = p >= 100 ? 5 : Math.floor(p / 20);
      return {
        tierIdx: idx,
        tierText: (zh ? tierTextsZh : tierTextsEn)[idx] || (zh ? tierTextsZh[0] : tierTextsEn[0]),
      };
    };

    const activeQuota =
      getActiveQuotaForInfo(info, card) ||
      (Array.isArray(cachedQuotaData?.groups) && cachedQuotaData.groups.length > 0 ? cachedQuotaData.groups[0] : null);
    const fmtNum = (n) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

    if (activeQuota && typeof activeQuota.effectiveRemainingPct === 'number') {
      const remPct = Math.max(0, Math.min(100, Number(activeQuota.effectiveRemainingPct)));
      const usedPct = Math.max(0, Math.min(100, 100 - remPct));
      const r5h = fmtBucketReset(activeQuota.b5h, lang);
      const rWeek = fmtBucketReset(activeQuota.bWeek, lang);
      const gName = activeQuota.groupName ? activeQuota.groupName.trim() : '';
      const lines = [];
      if (gName) lines.push(`【${gName}】`);
      const b5h = activeQuota.b5h;
      const bWeek = activeQuota.bWeek && activeQuota.bWeek !== b5h ? activeQuota.bWeek : null;
      if (b5h && !b5h.disabled && typeof b5h.remainingPct === 'number') {
        const rem5 = Math.max(0, Math.min(100, Number(b5h.remainingPct)));
        const used5 = Math.max(0, Math.min(100, 100 - rem5));
        lines.push(
          zh
            ? `5h额度：已用 ${fmtNum(used5)}% · 剩余 ${fmtNum(rem5)}%${r5h ? ` (${r5h})` : ''}`
            : `5h Quota: Used ${fmtNum(used5)}% · Rem ${fmtNum(rem5)}%${r5h ? ` (${r5h})` : ''}`
        );
      }
      if (bWeek && !bWeek.disabled && typeof bWeek.remainingPct === 'number') {
        const remW = Math.max(0, Math.min(100, Number(bWeek.remainingPct)));
        const usedW = Math.max(0, Math.min(100, 100 - remW));
        lines.push(
          zh
            ? `周额度：已用 ${fmtNum(usedW)}% · 剩余 ${fmtNum(remW)}%${rWeek ? ` (${rWeek})` : ''}`
            : `Weekly: Used ${fmtNum(usedW)}% · Rem ${fmtNum(remW)}%${rWeek ? ` (${rWeek})` : ''}`
        );
      }
      if (lines.length <= (gName ? 1 : 0)) {
        const rTxt = r5h || rWeek || '';
        lines.push(
          zh
            ? `额度：已用 ${fmtNum(usedPct)}% · 剩余 ${fmtNum(remPct)}%${rTxt ? ` (${rTxt})` : ''}`
            : `Quota: Used ${fmtNum(usedPct)}% · Rem ${fmtNum(remPct)}%${rTxt ? ` (${rTxt})` : ''}`
        );
      }
      const { tierIdx, tierText } = pickTier(usedPct);
      return {
        hasQuota: true,
        usedPct: Math.round(usedPct),
        remPct: Math.round(remPct),
        summary: lines.join('\n'),
        tierIdx,
        tierText,
      };
    }

    const ctxMax = Number(info?.maxContextTokens || info?.contextMax || 0);
    const ctxUsed = Number(info?.contextUsed || 0);
    if (ctxMax > 0 && ctxUsed >= 0) {
      const usedPct = Math.max(0, Math.min(100, (ctxUsed / ctxMax) * 100));
      const remPct = Math.max(0, 100 - usedPct);
      const { tierIdx, tierText } = pickTier(usedPct);
      return {
        hasQuota: false,
        usedPct: Math.round(usedPct),
        remPct: Math.round(remPct),
        summary: zh
          ? `【当前额度加载中】\n上下文：已用 ${Math.round(usedPct)}% · 剩余 ${Math.round(remPct)}%`
          : `[Loading Quota]\nContext: Used ${Math.round(usedPct)}% · Rem ${Math.round(remPct)}%`,
        tierIdx,
        tierText,
      };
    }

    const { tierIdx, tierText } = pickTier(0);
    return {
      hasQuota: false,
      usedPct: -1,
      remPct: 100,
      summary: zh ? '【当前额度】\n正在获取最新额度用量…' : '[Quota]\nFetching latest quota usage…',
      tierIdx,
      tierText,
    };
  }

  function renderContextPopoverContent(pop, data, cascadeId) {
    const lang = getLang();
    const ui = uiText(lang);
    const card = openPopoverAnchor?.closest?.('.surface-composer-card') || document.querySelector('[data-testid="agent-input-box"] .surface-composer-card');
    const { ring, draftEst, activeQuota } = getRingTelemetryForCard(card, data);
    const totalW = ring.maxTokens || 256000;
    const sys = Number(data?.sysTokens || 0);
    const tools = Number(data?.toolsTokens || 0);
    const toolRes = Number(data?.toolResultsTokens || 0);
    const msgs = Number(
      data?.chatMsgTokens != null ? data.chatMsgTokens : Math.max(0, Number(data?.msgTokens || 0) - toolRes)
    );
    const overhead = Number(data?.overheadTokens || 0);
    const draft = Number(draftEst.tokens || 0);
    const modelName = data?.lastModel || getCurrentModelLabel(card) || ui.activeModelFallback || 'Active Model';
    const remStr = `${formatCompactK(ring.remainingTokens)} / ${formatCompactK(totalW)} (${ring.contextRemainingPct.toFixed(1)}%)`;
    const usedStr = `${formatCompactK(ring.usedTokens)} (${ring.contextUsedPct.toFixed(1)}%)`;
    const isLowCtx = Boolean((data?.calls > 0 || ring.usedTokens > 0) && ring.contextRemainingPct <= 20);
    const lowCtxLevel = ring.contextRemainingPct <= 10 ? 'danger' : 'warn';
    const lowCtxBannerHtml = isLowCtx
      ? `<button type="button" class="ag-cs-ctx-warn-banner" data-ctx-act="compact" data-ctx-low="${lowCtxLevel}">${escapeHtml(
          typeof ui.lowCtxBanner === 'function'
            ? ui.lowCtxBanner(Math.round(ring.contextRemainingPct))
            : `Low context (${Math.round(ring.contextRemainingPct)}% free) — click to fill /compact`
        )}</button>`
      : '';
    const activeReset5h = fmtBucketReset(activeQuota?.b5h, lang);
    const activeResetWeek = fmtBucketReset(activeQuota?.bWeek, lang);
    const has5hHero = Boolean(activeQuota?.b5h && !activeQuota.b5h.disabled && typeof activeQuota.b5h.remainingPct === 'number');
    const hasWeekHero = Boolean(
      activeQuota?.bWeek &&
        activeQuota.bWeek !== activeQuota.b5h &&
        !activeQuota.bWeek.disabled &&
        typeof activeQuota.bWeek.remainingPct === 'number'
    );
    const quotaBadgeHtml =
      activeQuota && typeof activeQuota.effectiveRemainingPct === 'number'
        ? `<span class="ag-cs-ctx-quota-pill" style="color:${activeQuota.effectiveRemainingPct <= 10 ? '#dc3c3d' : activeQuota.effectiveRemainingPct <= 30 ? '#fbb315' : '#38bdf8'}">${
            has5hHero && hasWeekHero
              ? `5h ${escapeHtml(ui.remShort || 'Rem')} ${activeQuota.b5h.remainingPct.toFixed(1)}%${activeReset5h ? ' (' + escapeHtml(activeReset5h) + ')' : ''} · ${escapeHtml(ui.weeklyLabel || 'Weekly')} ${activeQuota.bWeek.remainingPct.toFixed(1)}%${activeResetWeek ? ' (' + escapeHtml(activeResetWeek) + ')' : ''}`
              : `${escapeHtml(ui.quotaRemShort || 'Quota Rem')} ${activeQuota.effectiveRemainingPct.toFixed(1)}%${activeReset5h ? ' · ' + escapeHtml(activeReset5h) : activeResetWeek ? ' · ' + escapeHtml(activeResetWeek) : ''}`
          }</span>`
        : '';
    const statusBadgeHtml = data?.isRunning
      ? `<span class="ag-cs-ctx-live-pill">${escapeHtml(data.isThinking ? ui.thinkingEllipsis || 'Thinking…' : ui.streamingEllipsis || 'Streaming…')}</span>`
      : '';

    const pctOf = (v) => Math.max(0, Math.min(100, (v / totalW) * 100)).toFixed(2);
    const turnCount = Array.isArray(data?.turnDetails) ? data.turnDetails.length : data?.turns || 0;
    const toolCount = (Array.isArray(data?.toolBreakdown) ? data.toolBreakdown.length : 0) + Number(data?.subagentCount || 0);

    let tabBodyHtml = '';
    if (activeHudTab === 'breakdown') {
      const sysChildren = Array.isArray(data?.sysChildren) ? data.sysChildren : [];
      const toolsChildren = Array.isArray(data?.toolsChildren) ? data.toolsChildren : [];
      const topSteps = Array.isArray(data?.topSteps) ? data.topSteps : [];
      const segRows = [
        {
          id: 'sys',
          color: '#3b82f6',
          label: ui.segSystemRules || 'System & Rules',
          val: sys,
          children: sysChildren,
        },
        {
          id: 'tools',
          color: '#a855f7',
          label: typeof ui.toolDeclarationsN === 'function' ? ui.toolDeclarationsN(toolsChildren.length) : `Tool Declarations (${toolsChildren.length})`,
          val: tools,
          children: toolsChildren,
        },
        {
          id: 'msgs',
          color: '#10b981',
          label: ui.segChatMessages || 'Chat Messages',
          val: msgs,
        },
        {
          id: 'toolres',
          color: '#f59e0b',
          label: ui.segToolResults || 'Tool Results',
          val: toolRes,
          children: topSteps.map((s) => ({ name: s.label || s.name, tokens: s.tokens })),
        },
      ];
      if (overhead > 0) {
        segRows.push({ id: 'overhead', color: '#64748b', label: ui.segOverhead || 'Context Overhead', val: overhead });
      }
      if (draft > 0) {
        segRows.push({
          id: 'draft',
          color: '#ec4899',
          label: typeof ui.liveDraftN === 'function' ? ui.liveDraftN(draftEst.chars) : `Live Draft (${draftEst.chars} chars)`,
          val: draft,
        });
      }
      segRows.push({
        id: 'rem',
        color: ring.color,
        label: ui.segRemaining || 'Remaining Free Capacity',
        val: ring.remainingTokens,
        highlight: true,
      });

      const rulesB = Number(data?.budgets?.rulesTokenBudget || 0);
      const customB = Number(data?.budgets?.customizationTokenBudget || 0);

      tabBodyHtml = `
        <div class="ag-cs-ctx-kpi-grid">
          <div class="ag-cs-ctx-kpi">
            <span class="ag-cs-ctx-k">${escapeHtml(ui.kpiRemaining || 'Remaining Free')}</span>
            <span class="ag-cs-ctx-v" data-ag-live-kpi-rem-v="1" style="color:${ring.color}">${formatCompactK(ring.remainingTokens)} <small>(${ring.contextRemainingPct.toFixed(1)}%)</small></span>
            <span class="ag-cs-ctx-sub" data-ag-live-kpi-rem-sub="1">${escapeHtml(ui.usedWord || 'Used')} ${formatCompactK(ring.usedTokens)} / ${formatCompactK(totalW)}</span>
          </div>
          <div class="ag-cs-ctx-kpi">
            <span class="ag-cs-ctx-k">${escapeHtml(ui.kpiCacheHit || 'Cache Hit Rate')}</span>
            <span class="ag-cs-ctx-v">${(data?.cacheHitPct || 0).toFixed(1)}%</span>
            <span class="ag-cs-ctx-sub">${escapeHtml(ui.cacheReadShort || 'Read')} ${formatCompactK(data?.lastCacheRead || 0)} · ${escapeHtml(ui.cacheFreshShort || 'Fresh')} ${formatCompactK(data?.lastFreshInput || 0)}</span>
          </div>
          <div class="ag-cs-ctx-kpi">
            <span class="ag-cs-ctx-k">${escapeHtml(ui.kpiSpeed || 'Output Speed')}</span>
            <span class="ag-cs-ctx-v">${(data?.displaySpeed || data?.lastSpeed) ? (data.displaySpeed || data.lastSpeed) + ' tok/s' : '—'}</span>
            <span class="ag-cs-ctx-sub">${escapeHtml(ui.speedAvgShort || 'Avg')} ${data?.avgSpeed || 0} tok/s · TTFT ${(data?.avgTtft || data?.lastTtft || 0).toFixed(2)}s</span>
          </div>
          <div class="ag-cs-ctx-kpi">
            <span class="ag-cs-ctx-k">${escapeHtml(ui.kpiSessionTotal || 'Session Total')}</span>
            <span class="ag-cs-ctx-v">${formatCompactK(data?.totalTokens || 0)}</span>
            <span class="ag-cs-ctx-sub">${data?.turns || 0} ${escapeHtml(ui.turnsUnit || 'turns')} · ${data?.calls || 0} ${escapeHtml(ui.callsUnit || 'calls')} · ${escapeHtml(ui.outShort || 'Out')} ${formatCompactK(data?.totalOutput || 0)}</span>
          </div>
        </div>
        <div class="ag-cs-ctx-sec-title">${escapeHtml(ui.ctxBreakdownTitle || 'Context Window Breakdown')}</div>
        <div class="ag-cs-ctx-rows">
          ${segRows
            .map((r) => {
              const hasCh = Array.isArray(r.children) && r.children.length > 0;
              const isExp = hasCh && expandedHudGroups.has(r.id);
              const chHtml = isExp
                ? `<div class="ag-cs-ctx-children">
                    ${r.children
                      .slice(0, 12)
                      .map(
                        (c) => `
                      <div class="ag-cs-ctx-child-row">
                        <span class="ag-cs-ctx-child-name">${escapeHtml(c.name || '')}</span>
                        <span class="ag-cs-ctx-child-val">${formatCompactK(c.tokens || 0)}</span>
                      </div>`
                      )
                      .join('')}
                  </div>`
                : '';
              const labelAttr = r.id === 'draft' ? ' data-ag-live-draft-label="1"' : '';
              const valAttr = r.id === 'draft' ? ' data-ag-live-draft-val="1"' : r.id === 'rem' ? ' data-ag-live-rem-val="1"' : '';
              return `
                <div class="ag-cs-ctx-row${r.highlight ? ' is-highlight' : ''}${hasCh ? ' is-expandable' : ''}" ${hasCh ? `data-expand-group="${r.id}"` : ''}>
                  <span class="ag-cs-ctx-row-label"><span class="ag-cs-ctx-dot" style="background:${r.color}"></span><span${labelAttr}>${escapeHtml(r.label)}</span>${hasCh ? ` <small class="ag-cs-ctx-caret">${isExp ? '▾' : '▸'}</small>` : ''}</span>
                  <span class="ag-cs-ctx-row-val"${valAttr}>${formatCompactK(r.val)} <small>(${((r.val / totalW) * 100).toFixed(1)}%)</small></span>
                </div>
                ${chHtml}`;
            })
            .join('')}
        </div>
        ${
          rulesB > 0 || customB > 0
            ? `<div class="ag-cs-ctx-budgets">
                <span>${escapeHtml(ui.rulesBudget || 'Rules Budget')}: <strong>${formatCompactK(rulesB)}</strong></span>
                <span>${escapeHtml(ui.customBudget || 'Custom Budget')}: <strong>${formatCompactK(customB)}</strong></span>
                <span>${escapeHtml(ui.maxWindow || 'Max Window')}: <strong>${formatCompactK(totalW)}</strong></span>
              </div>`
            : ''
        }
        <div class="ag-cs-ctx-sec-title">${escapeHtml(ui.latestCallTitle || 'Latest Model Call')}</div>
        <div class="ag-cs-ctx-latest-grid">
          <div><span>${escapeHtml(ui.freshIn || 'Fresh In')}</span><strong>${formatCompactK(data?.lastFreshInput || 0)}</strong></div>
          <div><span>${escapeHtml(ui.cacheRead || 'Cache Read')}</span><strong>${formatCompactK(data?.lastCacheRead || 0)}</strong></div>
          <div><span>${escapeHtml(ui.replyOutput || 'Output')}</span><strong>${formatCompactK(data?.lastOutput || 0)}</strong></div>
          <div><span>${escapeHtml(ui.thinkingTokens || 'Thinking')}</span><strong>${formatCompactK(data?.lastThinking || 0)}</strong></div>
        </div>
      `;
    } else if (activeHudTab === 'turns') {
      const turns = Array.isArray(data?.turnDetails) ? data.turnDetails.slice().reverse() : [];
      if (turns.length === 0) {
        tabBodyHtml = `<div class="ag-cs-ctx-empty">${escapeHtml(ui.turnsEmpty || 'No turn records in active conversation yet.')}</div>`;
      } else {
        tabBodyHtml = `
          <div class="ag-cs-ctx-turns-list">
            ${turns
              .map((t) => {
                const dSign = t.ctxDelta >= 0 ? '+' : '';
                const dCls = t.ctxDelta >= 15000 ? 'is-high' : t.ctxDelta >= 5000 ? 'is-mid' : '';
                return `
                  <div class="ag-cs-ctx-turn-item">
                    <div class="ag-cs-ctx-turn-top">
                      <span class="ag-cs-ctx-turn-idx">#T${t.turn}</span>
                      <span class="ag-cs-ctx-turn-model">${escapeHtml(t.model || modelName)}</span>
                      <span class="ag-cs-ctx-turn-ctx">${escapeHtml(ui.ctxShort || 'Ctx')} ${formatCompactK(t.ctxUsed)}</span>
                      <span class="ag-cs-ctx-turn-delta ${dCls}">${dSign}${formatCompactK(t.ctxDelta)}</span>
                    </div>
                    ${t.userPreview ? `<div class="ag-cs-ctx-turn-prompt">${escapeHtml(t.userPreview)}</div>` : ''}
                    <div class="ag-cs-ctx-turn-meta">
                      <span>${escapeHtml(ui.outShort || 'Out')} ${formatCompactK(t.output)}</span>
                      ${t.thinking > 0 ? `<span>${escapeHtml(ui.thinkShort || 'Think')} ${formatCompactK(t.thinking)}</span>` : ''}
                      ${t.toolCalls > 0 ? `<span>🔧 ×${t.toolCalls}</span>` : ''}
                      ${t.speed > 0 ? `<span>⚡ ${t.speed} tok/s</span>` : ''}
                      <span>${escapeHtml(ui.cacheShort || 'Cache')} ${t.cacheHitPct}%</span>
                      ${t.subagentCalls > 0 ? `<span class="ag-cs-ctx-subagent-tag">🤖 ×${t.subagentCount || t.subagentCalls} (${formatCompactK(t.subagentTokens)})</span>` : ''}
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      }
    } else if (activeHudTab === 'tools') {
      const toolsList = Array.isArray(data?.toolBreakdown) ? data.toolBreakdown : [];
      const subList = Array.isArray(data?.subagents) ? data.subagents : [];
      const maxToolTok = toolsList.reduce((m, x) => Math.max(m, x.tokens || 0), 1);
      const subHead =
        typeof ui.subagentsHeading === 'function'
          ? ui.subagentsHeading(data?.subagentCount || 0, data?.subagentCalls || 0, formatCompactK(data?.subagentTokens || 0))
          : `Subagents (${data?.subagentCount || 0} · ${data?.subagentCalls || 0} calls · Total ${formatCompactK(data?.subagentTokens || 0)})`;
      const toolHead =
        typeof ui.toolResultsHeading === 'function'
          ? ui.toolResultsHeading(formatCompactK(data?.toolResultsTokens || 0))
          : `Tool Results Leaderboard (${formatCompactK(data?.toolResultsTokens || 0)} tok)`;
      tabBodyHtml = `
        <div class="ag-cs-ctx-sec-title">${escapeHtml(subHead)}</div>
        ${
          subList.length === 0
            ? `<div class="ag-cs-ctx-empty-sm">${escapeHtml(ui.noSubagents || 'No subagents invoked in this session.')}</div>`
            : `<div class="ag-cs-ctx-sub-list">
                ${subList
                  .map(
                    (s, idx) => `
                  <div class="ag-cs-ctx-sub-item">
                    <div class="ag-cs-ctx-sub-head">
                      <strong>🤖 #${idx + 1} (${escapeHtml(s.shortId || s.id || 'sub')}) ${s.isRunning ? `<em class="ag-cs-ctx-active-tag">${escapeHtml(ui.runningTag || 'Running')}</em>` : ''}</strong>
                      <span>${formatCompactK(s.totalTokens)} tok</span>
                    </div>
                    <div class="ag-cs-ctx-sub-meta">
                      <span>${escapeHtml(s.model || modelName)}</span>
                      <span>${s.calls || 0} ${escapeHtml(ui.callsUnit || 'calls')} / ${s.steps || 0} ${escapeHtml(ui.stepsUnit || 'steps')}</span>
                      <span>${escapeHtml(ui.outShort || 'Out')} ${formatCompactK(s.outputTokens || 0)}</span>
                      ${s.toolCount > 0 ? `<span>🔧 ×${s.toolCount}</span>` : ''}
                    </div>
                  </div>`
                  )
                  .join('')}
              </div>`
        }
        <div class="ag-cs-ctx-sec-title">${escapeHtml(toolHead)}</div>
        ${
          toolsList.length === 0
            ? `<div class="ag-cs-ctx-empty-sm">${escapeHtml(ui.noToolOutputs || 'No tool output data yet.')}</div>`
            : `<div class="ag-cs-ctx-tool-list">
                ${toolsList
                  .slice(0, 12)
                  .map(
                    (t) => `
                  <div class="ag-cs-ctx-tool-row">
                    <div class="ag-cs-ctx-tool-info">
                      <span class="ag-cs-ctx-tool-name">${escapeHtml(t.name)} <small>×${t.count}</small></span>
                      <span class="ag-cs-ctx-tool-val">~${formatCompactK(t.tokens)}</span>
                    </div>
                    <div class="ag-cs-ctx-tool-bar"><span style="width:${Math.min(100, ((t.tokens || 0) / maxToolTok) * 100).toFixed(1)}%"></span></div>
                  </div>`
                  )
                  .join('')}
              </div>`
        }
      `;
    } else if (activeHudTab === 'quotas') {
      const groups = Array.isArray(cachedQuotaData?.groups) ? cachedQuotaData.groups : [];
      tabBodyHtml = `
        <div class="ag-cs-ctx-sec-title">${escapeHtml(ui.quotaPoolsTitle || 'Model Quota Pools Remaining')}</div>
        ${
          groups.length === 0
            ? `<div class="ag-cs-ctx-empty-sm">${escapeHtml(ui.quotaLoading || 'Loading model quota status…')}</div>`
            : `<div class="ag-cs-ctx-quota-list">
                ${groups
                  .map((g) => {
                    const qPct = typeof g.effectiveRemainingPct === 'number' ? g.effectiveRemainingPct : 0;
                    const qCol = qPct <= 10 ? '#dc3c3d' : qPct <= 30 ? '#fbb315' : '#257de0';
                    const isAct = activeQuota && activeQuota.groupName === g.groupName;
                    const r5h = fmtBucketReset(g.b5h, lang);
                    const rWeek = fmtBucketReset(g.bWeek, lang);
                    return `
                      <div class="ag-cs-ctx-quota-row${isAct ? ' is-active' : ''}">
                        <div class="ag-cs-ctx-quota-top">
                          <span><strong>${escapeHtml(g.groupName)}</strong>${isAct ? ` <em class="ag-cs-ctx-active-tag">${escapeHtml(ui.activeTag || 'Active')}</em>` : ''}</span>
                          <span style="color:${qCol};font-weight:600">${escapeHtml(ui.remShort || 'Rem')} ${qPct.toFixed(1)}%</span>
                        </div>
                        <div class="ag-cs-ctx-quota-bar"><span style="width:${Math.max(0, Math.min(100, qPct)).toFixed(1)}%;background:${qCol}"></span></div>
                        <div class="ag-cs-ctx-quota-sub">
                          <span>${
                            [
                              g.b5h && !g.b5h.disabled && typeof g.b5h.remainingPct === 'number'
                                ? `5h: ${g.b5h.remainingPct.toFixed(1)}% (${escapeHtml(r5h || '—')})`
                                : '',
                              g.bWeek && g.bWeek !== g.b5h && !g.bWeek.disabled && typeof g.bWeek.remainingPct === 'number'
                                ? `${escapeHtml(ui.weeklyLabel || 'Weekly')}: ${g.bWeek.remainingPct.toFixed(1)}% (${escapeHtml(rWeek || '—')})`
                                : !g.b5h && g.bWeek && typeof g.bWeek.remainingPct === 'number'
                                ? `${escapeHtml(ui.weeklyLabel || 'Weekly')}: ${g.bWeek.remainingPct.toFixed(1)}% (${escapeHtml(rWeek || '—')})`
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          }</span>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
        }
      `;
    }

    const tabTurnsLabel = typeof ui.tabTurnsN === 'function' ? ui.tabTurnsN(turnCount) : `Turns (${turnCount})`;
    const tabToolsLabel = typeof ui.tabToolsN === 'function' ? ui.tabToolsN(toolCount) : `Tools (${toolCount})`;
    const prevBodyScrollTop = pop.querySelector('.ag-cs-ctx-body')?.scrollTop || 0;

    pop.innerHTML = `
      <div class="ag-cs-ctx-top-bar">
        <div class="ag-cs-ctx-title-wrap">
          <span class="ag-cs-ctx-title">${escapeHtml(ui.popoverTitle || 'Context & Token HUD')}</span>
          <span class="ag-cs-ctx-model-badge">${escapeHtml(modelName)}</span>
          ${statusBadgeHtml}
        </div>
        <div class="ag-cs-ctx-actions">
          <button type="button" class="ag-cs-ctx-act-btn" data-ctx-act="compact" title="${escapeHtml(ui.compactBtnTitle || 'Fill /compact into composer')}">/compact</button>
          <button type="button" class="ag-cs-ctx-act-btn" data-ctx-act="copy" title="${escapeHtml(ui.copyBtnTitle || 'Copy telemetry report')}">${escapeHtml(ui.copyBtnLabel || 'Copy')}</button>
          <button type="button" class="ag-cs-ctx-act-btn" data-ctx-act="refresh" title="${escapeHtml(ui.refreshBtnTitle || 'Refresh telemetry')}">↻</button>
          <button type="button" class="ag-cs-ctx-act-btn is-close" data-ctx-act="close" title="${escapeHtml(ui.closeBtnTitle || 'Close')}">×</button>
        </div>
      </div>
      <div class="ag-cs-ctx-hero">
        <div class="ag-cs-ctx-hero-line">
          <span class="ag-cs-ctx-rem-main" data-ag-live-rem-hero="1" style="color:${ring.color}">${escapeHtml(ui.remAvailLabel || 'Remaining')} ${remStr}</span>
          <span class="ag-cs-ctx-used-sub" data-ag-live-used="1">${escapeHtml(ui.usedWord || 'Used')} ${usedStr}${draft > 0 ? ` · ${escapeHtml(ui.draftWord || 'Draft')} +${formatCompactK(draft)}` : ''}</span>
        </div>
        ${lowCtxBannerHtml}
        ${quotaBadgeHtml ? `<div class="ag-cs-ctx-hero-sub">${quotaBadgeHtml}</div>` : ''}
        <div class="ag-cs-ctx-bar">
          <span class="ag-cs-ctx-seg-sys" style="width:${pctOf(sys)}%" title="${escapeHtml(ui.segSystemRules || 'System')}: ${formatCompactK(sys)}"></span>
          <span class="ag-cs-ctx-seg-tools" style="width:${pctOf(tools)}%" title="${escapeHtml(ui.toolsShort || 'Tools')}: ${formatCompactK(tools)}"></span>
          <span class="ag-cs-ctx-seg-msgs" style="width:${pctOf(msgs)}%" title="${escapeHtml(ui.segChatMessages || 'Messages')}: ${formatCompactK(msgs)}"></span>
          <span class="ag-cs-ctx-seg-toolres" style="width:${pctOf(toolRes)}%" title="${escapeHtml(ui.segToolResults || 'Tool Results')}: ${formatCompactK(toolRes)}"></span>
          ${overhead > 0 ? `<span class="ag-cs-ctx-seg-overhead" style="width:${pctOf(overhead)}%;background:#64748b" title="${escapeHtml(ui.segOverhead || 'Context Overhead')}: ${formatCompactK(overhead)}"></span>` : ''}
          <span class="ag-cs-ctx-seg-draft" data-ag-live-draft-seg="1" style="width:${pctOf(draft)}%" title="${escapeHtml(ui.draftWord || 'Draft')}: ${formatCompactK(draft)}"></span>
        </div>
      </div>
      <div class="ag-cs-ctx-tabs" role="tablist">
        <button type="button" role="tab" class="ag-cs-ctx-tab${activeHudTab === 'breakdown' ? ' is-active' : ''}" data-ctx-tab="breakdown">${escapeHtml(ui.tabBreakdown || 'Breakdown')}</button>
        <button type="button" role="tab" class="ag-cs-ctx-tab${activeHudTab === 'turns' ? ' is-active' : ''}" data-ctx-tab="turns">${escapeHtml(tabTurnsLabel)}</button>
        <button type="button" role="tab" class="ag-cs-ctx-tab${activeHudTab === 'tools' ? ' is-active' : ''}" data-ctx-tab="tools">${escapeHtml(tabToolsLabel)}</button>
        <button type="button" role="tab" class="ag-cs-ctx-tab${activeHudTab === 'quotas' ? ' is-active' : ''}" data-ctx-tab="quotas">${escapeHtml(ui.tabQuotas || 'Quotas')}</button>
      </div>
      <div class="ag-cs-ctx-body">
        ${tabBodyHtml}
      </div>
    `;
    pop._agCsRenderedData = data;
    pop._agCsHadDraft = draft > 0;
    pop._agCsLowCtxAttr = isLowCtx ? lowCtxLevel : '';
    const newBodyEl = pop.querySelector('.ag-cs-ctx-body');
    if (newBodyEl && prevBodyScrollTop > 0) newBodyEl.scrollTop = prevBodyScrollTop;

    pop.querySelectorAll('button[data-ctx-tab]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        activeHudTab = btn.getAttribute('data-ctx-tab') || 'breakdown';
        renderContextPopoverContent(pop, data, cascadeId);
        if (openPopoverAnchor) positionPopoverAboveAnchor(pop, openPopoverAnchor);
      });
    });

    pop.querySelectorAll('button[data-ctx-act]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const act = btn.getAttribute('data-ctx-act');
        if (act === 'close') {
          closeContextPopover();
        } else if (act === 'compact') {
          const targetCard = card;
          closeContextPopover();
          fillCompactCommand(targetCard);
        } else if (act === 'copy') {
          const curLang = getLang();
          const curUi = uiText(curLang);
          const safeData = data || createEmptyConvoData(cascadeId, getKnownMaxContextForCard(card, data));
          const textPayload =
            typeof usageCore.buildTelemetryReport === 'function'
              ? usageCore.buildTelemetryReport(safeData, draftEst, cachedQuotaData, activeQuota, curLang)
              : JSON.stringify(safeData || {}, null, 2);

          const setFeedback = (label, stateKind) => {
            if (!btn.isConnected) return;
            clearTimeout(btn._agCsFeedbackTimer);
            btn.setAttribute('data-action-state', stateKind);
            btn.textContent = label;
            btn._agCsFeedbackTimer = setTimeout(() => {
              if (!btn.isConnected) return;
              const resetUi = uiText(getLang());
              btn.removeAttribute('data-action-state');
              btn.textContent = resetUi.copyBtnLabel || 'Copy';
            }, 1400);
          };

          writeTextToClipboard(textPayload).then((clipOk) => {
            setFeedback(
              clipOk ? curUi.copiedBtnLabel || '✓ Copied' : curUi.actionFailedLabel || '✕ Failed',
              clipOk ? 'ok' : 'error'
            );
          });
        } else if (act === 'refresh') {
          Promise.all([fetchActiveConvo(cascadeId, true), fetchQuotaData(true)]).then(([fresh]) => {
            if (openPopover === pop && pop.isConnected) {
              renderContextPopoverContent(pop, fresh || data, cascadeId);
              if (openPopoverAnchor) positionPopoverAboveAnchor(pop, openPopoverAnchor);
            }
          });
        }
      });
    });

    pop.querySelectorAll('[data-expand-group]').forEach((row) => {
      row.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const gid = row.getAttribute('data-expand-group');
        if (!gid) return;
        if (expandedHudGroups.has(gid)) expandedHudGroups.delete(gid);
        else expandedHudGroups.add(gid);
        renderContextPopoverContent(pop, data, cascadeId);
        if (openPopoverAnchor) positionPopoverAboveAnchor(pop, openPopoverAnchor);
      });
    });
  }

  function positionPopoverAboveAnchor(pop, anchor) {
    if (!pop || !anchor) return;
    const aRect = anchor.getBoundingClientRect();
    const vw = window.innerWidth || 900;
    const vh = window.innerHeight || 700;
    const placeAbove = aRect.top >= 240 || aRect.top >= vh - aRect.bottom;
    if (aRect.top >= 240) {
      pop.style.maxHeight = Math.min(645, Math.max(220, Math.floor(aRect.top - 16))) + 'px';
    } else if (!placeAbove) {
      pop.style.maxHeight = Math.min(645, Math.max(180, Math.floor(vh - aRect.bottom - 16))) + 'px';
    } else {
      pop.style.maxHeight = Math.min(645, Math.max(180, Math.floor(aRect.top - 16))) + 'px';
    }
    const pRect = pop.getBoundingClientRect();
    const popW = pop.offsetWidth || pop.clientWidth || pRect.width;
    const maxCap = parseFloat(pop.style.maxHeight) || pRect.height;
    const popH = Math.min(pop.offsetHeight || pRect.height, maxCap);
    const left = Math.max(8, Math.min(vw - popW - 8, aRect.right - popW));
    let top = placeAbove ? aRect.top - popH - 8 : aRect.bottom + 8;
    if (placeAbove && top < 8) {
      top = Math.max(8, Math.min(vh - popH - 8, aRect.bottom + 8));
    } else if (!placeAbove && top + popH > vh - 8) {
      top = Math.max(8, aRect.top - popH - 8);
    }
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(Math.max(8, top)) + 'px';
  }

  function openContextPopover(anchor, data, initialTab) {
    if (openPopover && openPopoverAnchor === anchor && (!initialTab || activeHudTab === initialTab)) {
      closeContextPopover();
      return;
    }
    closeContextPopover();
    closeEffortPopover();
    if (initialTab) activeHudTab = initialTab;
    const inputBox = anchor?.closest?.('[data-testid="agent-input-box"]') || document.querySelector('[data-testid="agent-input-box"]');
    const cascadeId = resolveCascadeId(inputBox);
    openPopoverCascadeId = cascadeId;

    const pop = document.createElement('div');
    pop.className = 'ag-cs-ctx-popover';
    pop.setAttribute('data-ag-no-i18n', '');
    openPopover = pop;
    openPopoverAnchor = anchor;
    renderContextPopoverContent(pop, data, cascadeId);
    document.body.appendChild(pop);
    positionPopoverAboveAnchor(pop, anchor);

    Promise.all([
      cascadeId ? fetchActiveConvo(cascadeId, true) : Promise.resolve(null),
      fetchQuotaData(false),
    ]).then(([fresh]) => {
      if (openPopover === pop && pop.isConnected) {
        const latest = fresh || activeTrajCache.get(cascadeId)?.data || data;
        renderContextPopoverContent(pop, latest, cascadeId);
        positionPopoverAboveAnchor(pop, anchor);
      }
    });
  }

  let lastUserSubmitAt = 0;

  function unwrapTrajSummary(entry) {
    if (!entry || typeof entry !== 'object') return {};
    return entry.summary && typeof entry.summary === 'object' ? entry.summary : entry;
  }

  function isSummaryRunning(s) {
    if (!s || typeof s !== 'object') return false;
    if (
      s.notFullyIdle ||
      s.hasRunningSubagents ||
      Number(s.activeSubagentCount || 0) > 0 ||
      Number(s.backgroundTaskCount || 0) > 0
    ) {
      return true;
    }
    if (s.status === 2) return true;
    if (typeof s.status === 'string') {
      const u = s.status.toUpperCase();
      if (u.includes('RUNNING')) return true;
    }
    return false;
  }

  function getDomConvoSignal(cascadeId) {
    let cv = null;
    if (cascadeId) {
      const views = document.querySelectorAll('[data-testid="conversation-view"]');
      for (const v of views) {
        if (v.getAttribute('data-cascade-id') === cascadeId) {
          cv = v;
          break;
        }
      }
      if (!cv && views.length > 0) cv = views[0];
    } else {
      cv = document.querySelector('[data-testid="conversation-view"]');
    }
    const resps = cv ? cv.querySelectorAll('[data-testid="agent-response"]') : [];
    let fiberStepsLen = 0;
    let fiberRunning = false;
    if (resps.length > 0) {
      const lastResp = resps[resps.length - 1];
      const tf = extractFiberTurnContainer(lastResp);
      const steps = tf?.container?.steps;
      if (Array.isArray(steps)) {
        fiberStepsLen = steps.length;
        for (let i = Math.max(0, steps.length - 6); i < steps.length; i++) {
          if (steps[i]?.status === 1 || steps[i]?.status === 2) {
            fiberRunning = true;
            break;
          }
        }
      }
    }
    let domRunning = fiberRunning;
    if (!domRunning) {
      const panels = document.querySelectorAll('[data-testid="running-items-panel"]');
      for (const p of panels) {
        if (String(p.className || '').includes('grid-rows-[1fr]')) {
          domRunning = true;
          break;
        }
      }
    }
    if (!domRunning) {
      const inputBoxes = document.querySelectorAll('[data-testid="agent-input-box"]');
      for (const ib of inputBoxes) {
        if (ib.querySelector('[data-testid="stop-button"], [data-testid="cancel-button"]')) {
          domRunning = true;
          break;
        }
        for (const btn of ib.querySelectorAll('button')) {
          const aria = String(btn.getAttribute('aria-label') || '');
          const tid = String(btn.getAttribute('data-testid') || '');
          if (/stop|cancel|停止|取消/i.test(aria) || /stop|cancel/i.test(tid)) {
            domRunning = true;
            break;
          }
        }
        if (domRunning) break;
      }
    }
    return {
      domSig: `${resps.length}:${fiberStepsLen}:${domRunning ? 1 : 0}`,
      domRunning,
    };
  }

  async function fetchActiveConvo(cascadeId, force = false, scopeEl = null) {
    if (!cascadeId) return null;
    const h = ensureHooks(true);
    const liveProv = findCascadeAgentStateProvider(cascadeId, scopeEl);
    if (!h && !liveProv) return null;
    if (h && !h.svc && !h.trajCtx && !liveProv) return null;
    const st = h?.store?.getState?.() || {};
    const rawPrimary = st.trajectorySummaries?.summaries || {};
    const rawFallback = st.cascadeTrajectorySummaries || {};
    const allSummaries = { ...rawFallback, ...rawPrimary };
    const sumEntry = rawPrimary[cascadeId] || rawFallback[cascadeId] || allSummaries[cascadeId];
    const sum = unwrapTrajSummary(sumEntry);
    const isCloud = Boolean(sum?.cloud === true || cloudOnlyCascadeIds.has(cascadeId));
    const liveState = liveProv ? liveProv.getState?.() || null : null;
    if (liveProv && isCloud) {
      watchAgentStateProvider(cascadeId, liveProv);
    }
    const liveSlice = liveState?.trajectorySlice || null;
    const liveSteps = Array.isArray(liveSlice?.stepsInSlice) ? liveSlice.stepsInSlice : [];
    const liveLastStep = liveSteps.length > 0 ? liveSteps[liveSteps.length - 1] : null;
    const liveSig = liveState
      ? `${liveSlice?.totalStepsLength || liveSteps.length}:${liveSteps.length}:${liveState.status || 0}:${liveState.fullyIdle ? 1 : 0}:${liveLastStep?.status || 0}:${liveLastStep?.metadata?.modelUsage?.outputTokens || 0}:${liveLastStep?.step?.value?.thinking?.length || 0}:${liveLastStep?.step?.value?.response?.length || 0}:${liveState.contextWindowUsage?.estimatedTokensUsed || 0}`
      : '';
    const stepCount = Math.max(
      Number(sum?.stepCount || 0),
      Number(liveSlice?.totalStepsLength || 0),
      liveSteps.length
    );
    const lastMod = Math.floor(
      typeof usageCore?.tsSec === 'function' ? usageCore.tsSec(sum?.lastModifiedTime) : Number(sum?.lastModifiedTime?.seconds || 0)
    );
    const { domSig, domRunning } = getDomConvoSignal(cascadeId);
    const running = !!(
      isSummaryRunning(sum) ||
      liveState?.status === 2 ||
      (liveState && liveState.fullyIdle === false) ||
      domRunning
    );

    // Discover child subagents belonging to this conversation
    const childMetaList = [];
    for (const [subId, rawEntry] of Object.entries(allSummaries)) {
      if (subId === cascadeId) continue;
      const s = unwrapTrajSummary(rawEntry);
      const meta = s.trajectoryMetadata || {};
      if (meta.parentConversationId === cascadeId || meta.rootConversationId === cascadeId) {
        childMetaList.push({
          id: subId,
          parentId: meta.parentConversationId || '',
          rootId: meta.rootConversationId || '',
          summary: s.summary || '',
          summaryObj: s,
          stepCount: Number(s.stepCount || 0),
          status: isSummaryRunning(s) ? 2 : Number(s.status || 1),
          createdAt: meta.createdAt || s.createdTime,
        });
      }
    }

    let entry = activeTrajCache.get(cascadeId);
    if (entry) {
      // Touch for LRU ordering
      activeTrajCache.delete(cascadeId);
      activeTrajCache.set(cascadeId, entry);
    } else {
      entry = {
        fetching: false,
        promise: null,
        needsRefetch: false,
        lastStep: -1,
        lastMod: -1,
        lastSubCount: -1,
        lastRunning: false,
        lastDomSig: '',
        lastLiveSig: '',
        lastAt: 0,
        data: null,
      };
      activeTrajCache.set(cascadeId, entry);
      pruneMapCache(
        activeTrajCache,
        MAX_ACTIVE_TRAJ_CACHE,
        openPopoverCascadeId ? new Set([openPopoverCascadeId]) : null
      );
    }
    const now = Date.now();
    const changed =
      !entry.data ||
      entry.lastStep !== stepCount ||
      entry.lastMod !== lastMod ||
      entry.lastSubCount !== childMetaList.length ||
      entry.lastRunning !== running ||
      entry.lastDomSig !== domSig ||
      entry.lastLiveSig !== liveSig;

    if (entry.promise) {
      if (force || changed) entry.needsRefetch = true;
      return entry.promise;
    }

    const recentlySubmitted = now - lastUserSubmitAt < 12000;
    const isHot = running || Boolean(entry.data?.isRunning) || Boolean(crabState?.wasRunning) || recentlySubmitted;
    const hasDesktopPet = cfg.desktopPet !== false && typeof window.__agCsNekoBinding === 'function';
    const ttlMs = isHot ? 700 : document.hidden ? (hasDesktopPet ? 1200 : 15000) : 3500;
    if (!force && !changed && entry.data && now - entry.lastAt < ttlMs) {
      return entry.data;
    }

    entry.fetching = true;
    entry.promise = (async () => {
      try {
        const res = await resolveTrajectoryPayload(cascadeId, sum, h, {
          scopeEl,
          allowTempStream: !liveProv,
          watchLive: isCloud,
          timeoutMs: 3500,
        });
        if (!res) return entry.data;
        const knownMax = getKnownMaxContextForCard(null, entry.data);
        const analyzed = usageCore.analyzeActiveConversation(res, {
          cascadeId,
          knownLimits: knownMax > 0 ? { maxContextTokens: knownMax } : undefined,
        });
        if (entry.data && entry.data.totalSteps > 0 && analyzed && analyzed.totalSteps === 0 && analyzed.totalCalls === 0) {
          return entry.data;
        }
        if (
          analyzed &&
          analyzed.maxContextTokens > 0 &&
          analyzed.hasActiveLimits &&
          analyzed.hasExactContextLimits !== false &&
          analyzed.lastModel
        ) {
          const mKey = normalizeModelCtxKey(analyzed.lastModel);
          if (mKey) knownModelMaxCtx.set(mKey, analyzed.maxContextTokens);
        }
        if (analyzed && analyzed.calls > 0 && typeof usageCore.analyzeTrajectoryForUsage === 'function') {
          try {
            const rec = usageCore.analyzeTrajectoryForUsage(res, sum, cascadeId);
            if (rec) {
              usageRecords.set(cascadeId, rec);
              if (isCloud || cloudOnlyCascadeIds.has(cascadeId)) saveUsageCache();
            }
          } catch {}
        }

        if (childMetaList.length > 0 && typeof usageCore.attachSubagentSummaries === 'function') {
          const subItems = await Promise.all(
            childMetaList.slice(0, 12).map(async (cm) => {
              const cachedSub = subagentTrajCache.get(cm.id);
              const subIsCloud = Boolean(cm.summaryObj?.cloud === true || cloudOnlyCascadeIds.has(cm.id));
              if (!subIsCloud && cachedSub && cachedSub.stepCount === cm.stepCount && cachedSub.status === 1 && cm.status === 1) {
                return { ...cm, analysis: cachedSub.analysis };
              }
              try {
                const subRes = await resolveTrajectoryPayload(cm.id, cm.summaryObj, h, {
                  allowTempStream: true,
                  timeoutMs: 2500,
                });
                if (!subRes) return cm;
                const subAnalysis = usageCore.analyzeActiveConversation(subRes, { cascadeId: cm.id });
                subagentTrajCache.delete(cm.id);
                subagentTrajCache.set(cm.id, {
                  stepCount: Math.max(cm.stepCount, subAnalysis?.totalSteps || 0),
                  status: cm.status,
                  analysis: subAnalysis,
                });
                pruneMapCache(subagentTrajCache, MAX_SUBAGENT_TRAJ_CACHE, null);
                return { ...cm, analysis: subAnalysis };
              } catch {
                return cm;
              }
            })
          );
          usageCore.attachSubagentSummaries(analyzed, subItems);
        }

        if (analyzed) {
          const subRunning = Array.isArray(analyzed.subagents) && analyzed.subagents.some((s) => s.isRunning);
          const hasPendingBg = Boolean(
            Number(analyzed.pendingBgTasks || 0) > 0 ||
              Number(sum?.backgroundTaskCount || 0) > 0
          );
          if (hasPendingBg) {
            analyzed.pendingBgTasks = Math.max(1, Number(analyzed.pendingBgTasks || 0));
          }
          if (running || subRunning || hasPendingBg) {
            analyzed.isRunning = true;
            const hasLiveToolStep = Boolean(analyzed.recentSteps?.some((s) => s.status === 1 || s.status === 2));
            if (hasPendingBg && !analyzed.isThinking && !hasLiveToolStep) {
              analyzed.isBackgroundSuspended = true;
            } else if (!analyzed.isThinking && running && !hasLiveToolStep && !subRunning) {
              analyzed.isThinking = true;
            }
          }
        }

        entry.data = analyzed;
        entry.lastStep = stepCount;
        entry.lastMod = lastMod;
        entry.lastSubCount = childMetaList.length;
        entry.lastRunning = running;
        entry.lastDomSig = domSig;
        entry.lastLiveSig = liveSig;
        entry.lastAt = Date.now();
      } catch {} finally {
        entry.fetching = false;
        entry.promise = null;
        if (entry.needsRefetch && !destroyed) {
          entry.needsRefetch = false;
          entry.lastAt = 0;
          scheduleSync();
        }
      }
      return entry.data;
    })();
    return entry.promise;
  }

  // ── Gemini Chibi Neko Mascot Player (dsh-pet inspired physics + multi-pose) ──
  const NEKO_W = 86;
  const NEKO_H = 108;
  const NEKO_PEEK_W = 94;
  const NEKO_PEEK_H = 74;
  const NEKO_DOCK_VID_W = 98;
  const NEKO_DOCK_VID_H = 77;
  const NEKO_MEME_W = 92;
  const NEKO_MEME_H = 92;
  const dockVideoBlobCache = Object.create(null);

  const NEKO_DOCK_ALIASES = {
    idle: 'lie_idle',
    watch_typing: 'lie_watch_typing',
    think: 'lie_think',
    thinking: 'lie_think',
    coding: 'lie_coding',
    typing: 'lie_coding',
    background: 'sit_background',
    happy: 'sit_happy',
    shy: 'lie_peek_shy',
    paws: 'lie_peek_shy',
    error: 'sit_angry_pout',
    sleep: 'lie_sleep',
    sleeping: 'lie_sleep',
  };

  const NEKO_DOCK_IDLE_POOL = [
    'lie_idle',
    'lie_kick_feet',
    'lie_star_play',
    'lie_pat_edge',
    'lie_yawn',
    'sit_idle',
    'sit_milk_tea',
    'sit_snack',
    'sit_read_notes',
    'sit_music',
    'sit_stretch',
    'sit_wave_hi',
  ];

  const NEKO_DOCK_CATALOG = [
    { key: 'lie_idle', stance: 'lie', zh: '🎀 趴框待机 · 呼吸晃耳', en: '🎀 Lie · Idle & Ears' },
    { key: 'lie_watch_typing', stance: 'lie', zh: '👀 趴框盯打字 · 扫视光标', en: '👀 Lie · Watch Typing' },
    { key: 'lie_think', stance: 'lie', zh: '✦ 趴框思考 · 灵光一闪', en: '✦ Lie · Deep Thinking' },
    { key: 'lie_coding', stance: 'lie', zh: '💻 趴框敲代码 · 迷你键盘', en: '💻 Lie · Mini Keyboard' },
    { key: 'lie_sleep', stance: 'lie', zh: '💤 趴框打盹 · 枕臂安睡', en: '💤 Lie · Nap Loop' },
    { key: 'lie_yawn', stance: 'lie', zh: '🥱 趴框犯困 · 打哈欠揉眼', en: '🥱 Lie · Yawn & Rub Eyes' },
    { key: 'lie_kick_feet', stance: 'lie', zh: '🐾 趴框晃小脚 · 开心摇尾', en: '🐾 Lie · Kick Feet' },
    { key: 'lie_peek_shy', stance: 'lie', zh: '😳 趴框戳脸 · 害羞飞机耳', en: '😳 Lie · Shy Blush' },
    { key: 'lie_star_play', stance: 'lie', zh: '⭐ 趴框拨弄 · 拍悬浮蓝星', en: '⭐ Lie · Play Star' },
    { key: 'lie_pat_edge', stance: 'lie', zh: '🫶 趴框拍框沿 · 卖萌催促', en: '🫶 Lie · Pat Edge' },
    { key: 'sit_idle', stance: 'sit', zh: '🌸 坐姿待机 · 乖巧摇尾巴', en: '🌸 Sit · Idle Sway' },
    { key: 'sit_happy', stance: 'sit', zh: '🎉 坐姿庆祝 · 比耶冒爱心', en: '🎉 Sit · Happy Peace' },
    { key: 'sit_background', stance: 'sit', zh: '🔭 坐姿守候 · 搭眉远眺', en: '🔭 Sit · Lookout' },
    { key: 'sit_milk_tea', stance: 'sit', zh: '🧋 坐姿喝奶茶 · 满足吨吨', en: '🧋 Sit · Milk Tea' },
    { key: 'sit_snack', stance: 'sit', zh: '🍡 坐姿吃团子 · 鼓腮咀嚼', en: '🍡 Sit · Eat Dango' },
    { key: 'sit_read_notes', stance: 'sit', zh: '📖 坐姿翻本本 · 核对点头', en: '📖 Sit · Read Notes' },
    { key: 'sit_music', stance: 'sit', zh: '🎧 坐姿听音乐 · 戴耳机轻晃', en: '🎧 Sit · Listen Music' },
    { key: 'sit_angry_pout', stance: 'sit', zh: '😤 坐姿小傲娇 · 鼓嘴抱臂', en: '😤 Sit · Pout & Cross Arms' },
    { key: 'sit_stretch', stance: 'sit', zh: '🌤️ 坐姿伸懒腰 · 舒展回神', en: '🌤️ Sit · Stretch' },
    { key: 'sit_wave_hi', stance: 'sit', zh: '👋 坐姿挥挥手 · 元气招手', en: '👋 Sit · Wave Hi' },
  ];

  function canonicalDockVideoKey(vidKey) {
    const vids = crabAssets.NEKO_DOCK_VIDEOS;
    if (!vids || !vidKey) return 'lie_idle';
    if (vids[vidKey]) return vidKey;
    const mapped = NEKO_DOCK_ALIASES[vidKey];
    if (mapped && vids[mapped]) return mapped;
    return vids.lie_idle ? 'lie_idle' : vids.idle ? 'idle' : '';
  }

  function getDockVideoSrc(vidKey) {
    const vids = crabAssets.NEKO_DOCK_VIDEOS;
    const resolved = canonicalDockVideoKey(vidKey);
    if (!vids || !resolved || !vids[resolved]) return '';
    if (dockVideoBlobCache[resolved]) return dockVideoBlobCache[resolved];
    const dataUri = vids[resolved];
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof Blob === 'function' && typeof atob === 'function') {
        const comma = dataUri.indexOf(',');
        if (comma > 0) {
          const bin = atob(dataUri.slice(comma + 1));
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
          dockVideoBlobCache[resolved] = blobUrl;
          return blobUrl;
        }
      }
    } catch {}
    return dataUri;
  }
  const NEKO_SNACK_KEYS = ['onigiri', 'icecream', 'dumpling', 'rice', 'just_one_bowl'];
  const NEKO_IDLE_MEME_KEYS = ['onigiri', 'icecream', 'dumpling', 'paws', 'cute', 'crab'];
  const NEKO_GRAVITY = 1400;
  const NEKO_RESTITUTION = 0.78;
  const NEKO_FRICTION = 2.5;
  const NEKO_DEAD_SPEED = 420;
  const NEKO_MAX_THROW = 2600;
  const NEKO_SQ_MS = 220;

  let crabState = {
    root: null,
    sprite: null,
    strip: null,
    img: null,
    video: null,
    bubble: null,
    compactPrompt: null,
    taskPanel: null,
    taskExpanded: false,
    taskDoneState: '', // '' | 'done' | 'error'
    taskStartedAt: 0,
    idleConfirmSince: 0,
    idleConfirmTimer: null,
    lastTaskElapsedSec: 0,
    lastTelemetryJson: '',
    lastInfo: null,
    bubbleTimer: null,
    bubbleVariant: '',
    bubbleProtectedUntil: 0,
    bubbleHovered: false,
    quotaAnimKey: '',
    quotaAnimUntil: 0,
    quotaAnimTimer: null,
    compactDismissedMap: new Map(), // cascadeId -> pct when dismissed
    compactSendingCid: '',
    compactSendingUntil: 0,
    lastCtxPctByCid: new Map(),
    lastCompactedStepsByCid: new Map(),
    lastWaitingAlertCid: '',
    lastWaitingAlertAt: 0,
    chatterTimer: null,
    menuEl: null,
    stage: mascotCore.freshStage(Date.now()),
    wasRunning: false,
    anchor: null,
    forcedMood: '',    // '' | 'thinking' | 'coding' | 'ciallo' | 'happy' | 'paws' | 'snack' | 'burn_token' | 'sleeping'
    bubbleEnabled: true,
    roamEnabled: false,
    facing: 1,         // 1 | -1
    floating: false,
    fx: 0,
    fy: 0,
    vx: 0,
    vy: 0,
    throwing: false,
    throwRaf: 0,
    squashRaf: 0,
    squashUntil: 0,
    trail: [],
    roamOffset: 0,
    roamTarget: 0,
    roamTimer: null,
    lastBubbleAt: 0,
    idleMemeKey: 'onigiri',
    snackIdx: 0,
    userTypingUntil: 0,
    userTypingTimer: null,
    idleDockKey: 'lie_idle',
    idleDockTimer: null,
    curBoxMode: 'peek',
  };
  crabState.poseMode = 'peek';

  function nekoSquashScale(u, squash = 0.55) {
    if (u < 0.45) {
      const p = u / 0.45;
      return 1 - (1 - squash) * p * p;
    }
    const p = (u - 0.45) / 0.55;
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const f = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    return Math.min(1.12, squash + (1 - squash) * Math.max(f, 0));
  }

  function triggerNekoSquash(squash = 0.58) {
    if (!crabState.strip || typeof requestAnimationFrame !== 'function' || motionReduced()) return;
    if (crabState.squashRaf) cancelAnimationFrame(crabState.squashRaf);
    const start = performance.now();
    const step = (now) => {
      if (destroyed || !crabState.strip) return;
      const u = Math.min(1, (now - start) / NEKO_SQ_MS);
      const sy = nekoSquashScale(u, squash);
      const sx = 1 / Math.sqrt(Math.max(0.4, sy));
      const faceScale = crabState.facing < 0 ? -1 : 1;
      crabState.strip.style.transform = `scale(${(sx * faceScale).toFixed(4)}, ${sy.toFixed(4)})`;
      if (u < 1) {
        crabState.squashRaf = requestAnimationFrame(step);
      } else {
        crabState.squashRaf = 0;
        crabState.strip.style.transform = faceScale < 0 ? 'scaleX(-1)' : '';
      }
    };
    crabState.squashRaf = requestAnimationFrame(step);
  }

  function resolveNekoMood(animKey) {
    if (crabState.forcedMood) return crabState.forcedMood;
    switch (animKey) {
      case 'thinking':
        return 'thinking';
      case 'typing':
      case 'building':
      case 'conducting':
        return 'typing';
      case 'happy':
      case 'music':
        return 'happy';
      case 'tickle':
        return 'tickle';
      case 'poke-left':
        return 'poke-left';
      case 'poke-right':
        return 'poke-right';
      case 'error':
      case 'notification':
        return 'error';
      case 'sleeping':
        return 'sleeping';
      case 'waking':
        return 'waking';
      case 'drag':
        return 'drag';
      case 'idle-look':
        return 'idle-look';
      case 'idle-wave':
        return 'idle-wave';
      case 'idle-laptop':
        return 'idle-laptop';
      default:
        return 'idle';
    }
  }

  function resolveNekoDockVideoKey(mood, info) {
    const fm = crabState.forcedMood;
    if (fm) {
      return canonicalDockVideoKey(fm);
    }
    const now = Date.now();
    if (crabState.quotaAnimKey && crabState.quotaAnimUntil > now) {
      return canonicalDockVideoKey(crabState.quotaAnimKey);
    }
    if (mood === 'error') {
      return canonicalDockVideoKey('sit_angry_pout');
    }
    if (
      mood === 'poke-left' ||
      mood === 'poke-right' ||
      mood === 'tickle' ||
      mood === 'drag'
    ) {
      return canonicalDockVideoKey('lie_peek_shy');
    }
    if (crabState.userTypingUntil > now) {
      return canonicalDockVideoKey('lie_watch_typing');
    }
    if (info?.isRunning) {
      if (info.isWaiting) return canonicalDockVideoKey('lie_pat_edge');
      const hasLiveTool = Array.isArray(info.recentSteps) && info.recentSteps.some((s) => s.status === 1 || s.status === 2);
      const subRunning = Array.isArray(info.subagents) && info.subagents.some((s) => s.isRunning);
      const isBgWait = Boolean(Number(info.pendingBgTasks || 0) > 0 || info.isBackgroundSuspended || subRunning);
      if (isBgWait && !hasLiveTool) return canonicalDockVideoKey('sit_background');
      if (info.isThinking || mood === 'thinking') return canonicalDockVideoKey('lie_think');
      return canonicalDockVideoKey('lie_coding');
    }
    if (mood === 'thinking') return canonicalDockVideoKey('lie_think');
    if (mood === 'typing' || mood === 'coding') return canonicalDockVideoKey('lie_coding');
    if (mood === 'happy') return canonicalDockVideoKey('sit_happy');
    if (mood === 'idle-wave') return canonicalDockVideoKey('sit_wave_hi');
    if (mood === 'sleeping') return canonicalDockVideoKey('lie_sleep');
    if (mood === 'waking') return canonicalDockVideoKey('sit_stretch');
    if (mood === 'idle-look') return canonicalDockVideoKey('sit_background');
    if (mood === 'idle-laptop') return canonicalDockVideoKey('sit_read_notes');
    return canonicalDockVideoKey(crabState.idleDockKey || 'lie_idle');
  }

  function scheduleIdleDockRotation() {
    if (crabState.idleDockTimer) clearTimeout(crabState.idleDockTimer);
    if (destroyed || !crabState.root) return;
    const delayMs = 13000 + Math.floor(Math.random() * 9000);
    crabState.idleDockTimer = setTimeout(() => {
      crabState.idleDockTimer = null;
      if (destroyed || !crabState.root || !crabState.video) return;
      const curMood = crabState.root.getAttribute('data-ag-cs-mood') || 'idle';
      const isIdleNow =
        !crabState.forcedMood &&
        !crabState.lastInfo?.isRunning &&
        crabState.userTypingUntil <= Date.now() &&
        (curMood === 'idle' || curMood === 'idle-look' || curMood === 'idle-wave' || curMood === 'idle-laptop');
      if (isIdleNow && !document.hidden) {
        // Alternate gently between relaxing lie_idle and rich playful lie/sit dock clips
        if (crabState.idleDockKey !== 'lie_idle' && Math.random() < 0.35) {
          crabState.idleDockKey = 'lie_idle';
        } else {
          const choices = NEKO_DOCK_IDLE_POOL.filter((k) => k !== crabState.idleDockKey);
          crabState.idleDockKey = choices[Math.floor(Math.random() * choices.length)] || 'lie_idle';
        }
        syncNekoDockVideo(curMood);
      }
      scheduleIdleDockRotation();
    }, delayMs);
  }

  function syncNekoDockVideo(mood) {
    if (!crabState.root || !crabState.video) return false;
    const vids = crabAssets.NEKO_DOCK_VIDEOS;
    if (!vids || typeof vids !== 'object') return false;
    const curMood = mood || crabState.root.getAttribute('data-ag-cs-mood') || 'idle';
    const vidKey = resolveNekoDockVideoKey(curMood, crabState.lastInfo);
    const src = getDockVideoSrc(vidKey) || getDockVideoSrc('lie_idle');
    if (!src) return false;
    const stance = vidKey.startsWith('sit_') ? 'sit' : 'lie';
    crabState.curBoxMode = 'dock-video';
    crabState.root.setAttribute('data-ag-cs-has-video', '1');
    crabState.root.setAttribute('data-ag-cs-video', vidKey);
    crabState.root.setAttribute('data-ag-cs-dock-stance', stance);
    if (crabState.video.getAttribute('data-vid-key') !== vidKey) {
      crabState.video.setAttribute('data-vid-key', vidKey);
      crabState.video.src = src;
      try {
        const p = crabState.video.play?.();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }
    return true;
  }

  function resolveNekoVisual(mood) {
    const poses = crabAssets.NEKO_POSES || {};
    const pickPose = (k, box = 'chibi') => ({
      key: k,
      src: poses[k] || poses.idle || crabAssets.NEKO_DATA_URI,
      boxMode: box,
    });
    if (crabState.poseMode === 'peek' && !crabState.floating && poses.peek) {
      return pickPose('peek', 'peek');
    }
    switch (mood) {
      case 'thinking':
      case 'think':
        return pickPose('think');
      case 'typing':
      case 'coding':
      case 'ciallo':
      case 'idle-wave':
        return pickPose('wave');
      case 'happy':
      case 'snack':
      case 'idle-laptop':
      case 'burn_token':
        return pickPose('happy');
      case 'sleeping':
      case 'sleep':
      case 'waking':
        return pickPose('sleep');
      case 'paws':
      case 'error':
      case 'tickle':
      case 'poke-left':
      case 'poke-right':
      case 'drag':
        return pickPose('shy');
      default:
        return pickPose('idle');
    }
  }

  function getNekoLine(kind) {
    const zh = isZh();
    const ja = getLang() === 'ja';
    const bank = {
      thinking: zh
        ? ['正在认真思考喵~ ✦', '推演思路中…稍等哦', '大脑高速运转中喵 ✦']
        : ja
        ? ['考え中にゃ~ ✦', 'じっくり推論中…']
        : ['Thinking carefully~ ✦', 'Connecting the stars...'],
      typing: zh
        ? ['哒哒哒~努力写代码中！', '正在全速干活喵♪', '全息键盘冒火星啦~']
        : ja
        ? ['カタカタ作業中にゃ♪', 'コード書いてるにゃ！']
        : ['Typing away~ ♪', 'Writing code fast!'],
      watch_typing: zh
        ? ['我看看你在写什么好玩的喵~ 👀', '认真盯光标中…随时准备出发 ✦']
        : ja
        ? ['何を入力してるのかにゃ~ 👀']
        : ['Watching you type~ 👀'],
      background: zh
        ? ['正在帮你盯着后台任务动静喵~', '左右巡视中，后台有消息我马上喊你 ✦']
        : ja
        ? ['バックグラウンドを見守り中にゃ~']
        : ['Keeping an eye on background tasks~'],
      ciallo: zh
        ? ['Ciallo～(∠・ω< )⌒★', '嗨嗨~随时待命喵 ✦']
        : ja
        ? ['Ciallo～(∠・ω< )⌒★']
        : ['Ciallo~(∠・ω< )⌒★'],
      snack: zh
        ? ['干饭时间到~再来一碗喵！🍙', '偷偷吃口小饭团补充能量~', '吃饱饱才有力气写代码喵♪']
        : ja
        ? ['おにぎりもぐもぐにゃ~ 🍙']
        : ['Snack break~ nom nom 🍙'],
      burn_token: zh
        ? ['芜湖~ Token 燃烧起来啦！🔥', '算力全开，大的要来了喵！']
        : ja
        ? ['トークン燃焼中にゃ！🔥']
        : ['Burning tokens at full speed! 🔥'],
      happy: zh
        ? ['好耶！搞定啦喵~ ♪', '大功告成！夸夸我~', '任务完成 ✦ 超级顺利！']
        : ja
        ? ['できたにゃ~ ♪', '任務完了！ほめてほめて~']
        : ['All done~ ♪', 'Yay! Mission complete! ✦'],
      error: zh
        ? ['呜哇！好像有点不对劲…', '出错了喵，让我看看！']
        : ja
        ? ['うわっ！エラーかにゃ…']
        : ['Whoa! Something went wrong...'],
      poke: zh
        ? ['喵呜？戳我干嘛呀~', '别戳脸蛋啦会红的！', '在的在的，随时待命喵 ✦']
        : ja
        ? ['にゃっ？つつかないで~', 'ここにいるにゃ ✦']
        : ['Meow? Why poke me~', 'Always ready! ✦'],
      tickle: zh
        ? ['呀啊~好痒好痒别挠啦！(≧▽≦)', '哈哈哈投降啦喵~']
        : ja
        ? ['きゃっくすぐったいにゃ！(≧▽≦)']
        : ['Hahaha stop tickling me~ (≧▽≦)'],
      throw: zh
        ? ['呜哇要飞起来啦——！', '飞高高喵——！']
        : ja
        ? ['うわぁ飛んじゃうにゃ——！']
        : ['Wheee I am flying~!!'],
      sleep: zh
        ? ['呼呼…zzZ…小鱼干…', '抱紧大尾巴睡香香…']
        : ja
        ? ['すやすや…zzZ…']
        : ['Zzz… dreaming of stars…'],
      waiting: zh
        ? ['在等你确认喵~ 快看看对话框 👀', '有操作等你点头哦 ✦']
        : ja
        ? ['確認待ちにゃ~ 👀']
        : ['Waiting for your approval~ 👀'],
      subagent: zh
        ? ['子代理小分队正在并行干活喵~ 🔭', '我帮你盯着分身们的进度 ✦']
        : ja
        ? ['サブエージェントが作業中にゃ~ 🔭']
        : ['Subagents are working in parallel~ 🔭'],
      compacted: zh
        ? ['压缩完成啦！上下文瞬间清爽喵~ ♪', '记忆瘦身成功 ✦ 继续轻装冲鸭！']
        : ja
        ? ['圧縮完了！コンテキストすっきりにゃ~ ♪']
        : ['Compacted! Context window is fresh again~ ♪'],
      chatter: zh
        ? [
            '写代码辛苦啦，记得喝口水喵~',
            '今天也要元气满满哦 ✦',
            '双击我可以看看当前额度用量哦~',
            '右键我可以切换超多动作哦~',
          ]
        : ja
        ? [
            'お疲れさまにゃ、お水飲んでね~',
            '今日も一日がんばろうにゃ ✦',
            'ダブルクリックで枠の残りが見られるにゃ♪',
          ]
        : [
            'Stay hydrated while coding~',
            'Let’s shine today ✦',
            'Double-click me to check quota usage~',
          ],
    };
    const arr = bank[kind] || bank.chatter;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function hideNekoBubble() {
    if (crabState.bubbleTimer) {
      clearTimeout(crabState.bubbleTimer);
      crabState.bubbleTimer = null;
    }
    crabState.bubbleVariant = '';
    crabState.bubbleProtectedUntil = 0;
    crabState.bubbleHovered = false;
    if (crabState.bubble) {
      crabState.bubble.removeAttribute('data-open');
      crabState.bubble.removeAttribute('data-variant');
    }
  }

  function showNekoBubble(text, ms = 3200, opts = null) {
    if (destroyed || !crabState.bubble || !text) return;
    const force = Boolean(opts && opts.force);
    const variant = (opts && opts.variant) || '';
    const now = Date.now();
    if (!force && !crabState.bubbleEnabled) return;
    if (!force && crabState.bubbleProtectedUntil > now) return;

    crabState.bubble.textContent = text;
    if (variant) crabState.bubble.setAttribute('data-variant', variant);
    else crabState.bubble.removeAttribute('data-variant');
    crabState.bubble.setAttribute('data-open', '1');
    crabState.bubbleVariant = variant;
    crabState.lastBubbleAt = now;
    if (force && opts && opts.protectMs) {
      crabState.bubbleProtectedUntil = now + Number(opts.protectMs);
    } else if (!force) {
      crabState.bubbleProtectedUntil = 0;
    }
    if (crabState.bubbleTimer) clearTimeout(crabState.bubbleTimer);
    crabState.bubbleTimer = setTimeout(() => {
      crabState.bubbleTimer = null;
      if (crabState.bubbleHovered) return;
      hideNekoBubble();
    }, ms);
  }

  function showNekoQuotaBubble() {
    if (destroyed || !crabState.root) return;
    const q = buildQuotaDisplayInfo(crabState.lastInfo, crabState.anchor);
    const renderQuotaCard = (infoObj) => {
      const head = infoObj.summary.startsWith('【') || infoObj.summary.startsWith('[')
        ? infoObj.summary
        : `【${infoObj.summary}】`;
      showNekoBubble(`${head}\n${infoObj.tierText}`, 6800, {
        force: true,
        variant: 'quota',
        protectMs: 5200,
      });
    };

    // Map quota tier to matching dock video animation (mirrors desktop pet tiers)
    const tierAnimMap = ['happy', 'happy', 'idle', 'think', 'shy', 'sleep'];
    const vidKey = tierAnimMap[q.tierIdx] || 'happy';
    crabState.forcedMood = '';
    crabState.stage.asleep = false;
    crabState.stage.clicks = [];
    crabState.stage.reaction = null;
    crabState.quotaAnimKey = vidKey;
    crabState.quotaAnimUntil = Date.now() + 5000;
    if (crabState.quotaAnimTimer) clearTimeout(crabState.quotaAnimTimer);
    crabState.quotaAnimTimer = setTimeout(() => {
      crabState.quotaAnimTimer = null;
      crabState.quotaAnimKey = '';
      crabState.quotaAnimUntil = 0;
      if (!destroyed && crabState.root && crabState.video) {
        syncNekoDockVideo(crabState.root.getAttribute('data-ag-cs-mood') || 'idle');
      }
    }, 5100);

    triggerNekoSquash(0.72);
    syncNekoDockVideo(crabState.root.getAttribute('data-ag-cs-mood') || 'idle');
    renderQuotaCard(q);

    // Refresh quota data in background if missing or older than 30s, then update open bubble in place
    if (!cachedQuotaData || Date.now() - lastQuotaFetchAt > 30000) {
      fetchQuotaData(false)
        .then(() => {
          if (destroyed || !crabState.bubble) return;
          if (crabState.bubble.getAttribute('data-open') === '1' && crabState.bubbleVariant === 'quota') {
            const freshQ = buildQuotaDisplayInfo(crabState.lastInfo, crabState.anchor);
            renderQuotaCard(freshQ);
          }
          syncNekoToDesktop(crabState.lastInfo, false);
        })
        .catch(() => {});
    }
  }

  function renderNekoCompactPrompt(activeCard, info) {
    if (!crabState.compactPrompt || !activeCard) return;
    const el = crabState.compactPrompt;
    const isHomeCard = Boolean(activeCard.closest?.('.agy-home') && !activeCard.closest?.('[data-testid="conversation-view"]'));
    const cid = isHomeCard ? '' : (info?.cascadeId || crabState.activeCascadeId || '');
    if (isHomeCard || !cid) {
      el.removeAttribute('data-open');
      el.removeAttribute('data-level');
      el.removeAttribute('data-render-key');
      return;
    }

    const { ring } = getRingTelemetryForCard(activeCard, info);
    const hasUsage = Boolean((info?.calls || 0) > 0 || ring.usedTokens > 0);
    const usedPct = hasUsage ? Math.max(0, Math.min(100, Number(ring.contextUsedPct || 0))) : 0;
    const usedPctRound = Math.round(usedPct);
    const now = Date.now();
    const prevPct = crabState.lastCtxPctByCid.get(cid) || 0;
    const curCompactedSteps = Number(info?.compactedSteps || 0);
    const prevCompactedSteps = crabState.lastCompactedStepsByCid.get(cid);

    // Detect compaction finished -> clear sending/dismissed state & celebrate!
    const compactedJustNow =
      (prevCompactedSteps != null && curCompactedSteps > prevCompactedSteps) ||
      (prevPct >= 80 && usedPct < 70 && hasUsage);
    if (compactedJustNow) {
      crabState.compactDismissedMap.delete(cid);
      if (crabState.compactSendingCid === cid) {
        crabState.compactSendingCid = '';
        crabState.compactSendingUntil = 0;
      }
      crabState.quotaAnimKey = 'happy';
      crabState.quotaAnimUntil = now + 3600;
      if (crabState.quotaAnimTimer) clearTimeout(crabState.quotaAnimTimer);
      crabState.quotaAnimTimer = setTimeout(() => {
        crabState.quotaAnimTimer = null;
        crabState.quotaAnimKey = '';
        crabState.quotaAnimUntil = 0;
        if (!destroyed && crabState.root && crabState.video) {
          syncNekoDockVideo(crabState.root.getAttribute('data-ag-cs-mood') || 'idle');
        }
      }, 3700);
      triggerNekoSquash(0.66);
      showNekoBubble(getNekoLine('compacted'), 4200, { force: true, protectMs: 3200 });
    }
    crabState.lastCtxPctByCid.set(cid, usedPct);
    crabState.lastCompactedStepsByCid.set(cid, curCompactedSteps);

    const isSending = crabState.compactSendingCid === cid && crabState.compactSendingUntil > now;
    if (usedPct < 80 && !isSending) {
      crabState.compactDismissedMap.delete(cid);
      el.removeAttribute('data-open');
      el.removeAttribute('data-level');
      el.removeAttribute('data-render-key');
      return;
    }

    const dismissedPct = crabState.compactDismissedMap.get(cid);
    if (!isSending && typeof dismissedPct === 'number' && usedPctRound < dismissedPct + 5 && usedPctRound < 95) {
      el.removeAttribute('data-open');
      return;
    }

    const zh = isZh();
    const level = isSending ? 'sending' : usedPct >= 90 ? 'danger' : 'warn';
    const mainText = isSending
      ? zh
        ? '正在压缩当前会话…'
        : 'Compacting chat…'
      : usedPct >= 90
      ? zh
        ? `上下文告急 ${usedPctRound}% · 点此自动压缩`
        : `Context ${usedPctRound}% · Click to compact`
      : zh
      ? `上下文已用 ${usedPctRound}% · 点此自动压缩`
      : `Context ${usedPctRound}% · Click to compact`;

    // Gentle bounce when crossing 80% or 90% threshold for the first time
    if (!isSending && ((prevPct > 0 && prevPct < 80 && usedPct >= 80) || (prevPct > 0 && prevPct < 90 && usedPct >= 90))) {
      triggerNekoSquash(0.74);
    }

    const renderKey = `${cid}|${level}|${mainText}`;
    if (el.getAttribute('data-render-key') === renderKey && el.getAttribute('data-open') === '1') return;
    el.setAttribute('data-render-key', renderKey);
    el.setAttribute('data-open', '1');
    el.setAttribute('data-level', level);

    const iconSvg = isSending
      ? '<svg viewBox="0 0 16 16" class="ag-cs-neko-compact-ico is-spin" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="22 14" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 16 16" class="ag-cs-neko-compact-ico" aria-hidden="true"><path d="M5 3.5 8 6.5l3-3M5 12.5 8 9.5l3 3M3 8h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    el.innerHTML = `
      <button type="button" class="ag-cs-neko-compact-btn" data-compact-act="run" title="${escapeHtml(
        zh ? '点击立即向当前会话发送 /compact 自动压缩上下文' : 'Click to run /compact automatically in this conversation'
      )}" ${isSending ? 'disabled' : ''}>
        <span class="ag-cs-neko-compact-dot"></span>
        ${iconSvg}
        <span class="ag-cs-neko-compact-txt">${escapeHtml(mainText)}</span>
      </button>
      ${
        !isSending
          ? `<button type="button" class="ag-cs-neko-compact-close" data-compact-act="dismiss" title="${zh ? '暂不提示' : 'Dismiss'}">×</button>`
          : ''
      }
    `;
  }

  function closeNekoMenu() {
    if (crabState.menuEl && crabState.menuEl.parentElement) {
      crabState.menuEl.parentElement.removeChild(crabState.menuEl);
    }
    crabState.menuEl = null;
  }

  function applyNekoBoxStyle() {
    if (!crabState.root) return;
    const boxMode =
      crabState.curBoxMode === 'dock-video'
        ? 'dock-video'
        : crabState.floating
        ? crabState.curBoxMode === 'meme'
          ? 'meme'
          : 'chibi'
        : crabState.curBoxMode || (crabState.poseMode === 'peek' ? 'peek' : 'chibi');
    const w =
      boxMode === 'dock-video'
        ? NEKO_DOCK_VID_W
        : boxMode === 'peek'
        ? NEKO_PEEK_W
        : boxMode === 'meme'
        ? NEKO_MEME_W
        : NEKO_W;
    const h =
      boxMode === 'dock-video'
        ? NEKO_DOCK_VID_H
        : boxMode === 'peek'
        ? NEKO_PEEK_H
        : boxMode === 'meme'
        ? NEKO_MEME_H
        : NEKO_H;
    crabState.root.style.width = w + 'px';
    crabState.root.style.height = h + 'px';
    crabState.root.setAttribute('data-ag-cs-pose', boxMode);
    if (crabState.floating) {
      if (document.body && crabState.root.parentElement !== document.body) {
        if (crabState.anchor) crabState.anchor.removeAttribute('data-ag-cs-crab-anchor');
        document.body.appendChild(crabState.root);
      }
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 800;
      crabState.fx = Math.max(12, Math.min(vw - w - 12, crabState.fx));
      crabState.fy = Math.max(12, Math.min(vh - h - 12, crabState.fy));
      crabState.root.classList.add('is-floating');
      crabState.root.style.left = Math.round(crabState.fx) + 'px';
      crabState.root.style.top = Math.round(crabState.fy) + 'px';
      crabState.root.style.right = 'auto';
      crabState.root.style.bottom = 'auto';
      crabState.root.style.transform = '';
    } else {
      crabState.root.classList.remove('is-floating');
      crabState.root.style.left = '';
      crabState.root.style.top = '';
      crabState.root.style.right = '';
      crabState.root.style.bottom = '';
      crabState.root.style.transform = crabState.roamOffset ? `translateX(${Math.round(crabState.roamOffset)}px)` : '';
      if (crabState.anchor && crabState.anchor.isConnected && crabState.root.parentElement !== crabState.anchor) {
        crabState.anchor.setAttribute('data-ag-cs-crab-anchor', 'composer');
        crabState.anchor.appendChild(crabState.root);
      }
    }
    if (crabState.strip && !crabState.squashRaf) {
      crabState.strip.style.transform = crabState.facing < 0 ? 'scaleX(-1)' : '';
    }
  }

  function returnNekoHome() {
    if (crabState.throwRaf) {
      cancelAnimationFrame(crabState.throwRaf);
      crabState.throwRaf = 0;
    }
    crabState.throwing = false;
    crabState.floating = false;
    crabState.facing = 1;
    crabState.roamOffset = 0;
    crabState.stage.reaction = null;
    applyNekoBoxStyle();
    triggerNekoSquash(0.62);
    stepCrab();
  }

  function startNekoThrow() {
    if (typeof requestAnimationFrame !== 'function' || !crabState.root) return;
    if (crabState.throwRaf) cancelAnimationFrame(crabState.throwRaf);
    crabState.throwing = true;
    crabState.floating = true;
    let lastTs = performance.now();
    const step = (now) => {
      if (destroyed || !crabState.root || !crabState.throwing) {
        crabState.throwRaf = 0;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 800;
      const maxX = Math.max(12, vw - NEKO_W - 12);
      const maxY = Math.max(12, vh - NEKO_H - 12);

      crabState.vy += NEKO_GRAVITY * dt;
      crabState.fx += crabState.vx * dt;
      crabState.fy += crabState.vy * dt;

      let impacted = 0;
      if (crabState.fx < 12) {
        crabState.fx = 12;
        impacted = Math.max(impacted, Math.abs(crabState.vx));
        crabState.vx = Math.abs(crabState.vx) * NEKO_RESTITUTION;
        crabState.facing = 1;
      } else if (crabState.fx > maxX) {
        crabState.fx = maxX;
        impacted = Math.max(impacted, Math.abs(crabState.vx));
        crabState.vx = -Math.abs(crabState.vx) * NEKO_RESTITUTION;
        crabState.facing = -1;
      }

      if (crabState.fy < 12) {
        crabState.fy = 12;
        impacted = Math.max(impacted, Math.abs(crabState.vy));
        crabState.vy = Math.abs(crabState.vy) * NEKO_RESTITUTION;
      } else if (crabState.fy >= maxY) {
        crabState.fy = maxY;
        impacted = Math.max(impacted, Math.abs(crabState.vy));
        if (Math.abs(crabState.vy) < 45) {
          crabState.vy = 0;
          crabState.vx *= Math.exp(-NEKO_FRICTION * dt);
        } else {
          crabState.vy = -Math.abs(crabState.vy) * NEKO_RESTITUTION;
          crabState.vx *= Math.exp(-NEKO_FRICTION * 0.35 * dt);
        }
      }

      if (impacted > 280) {
        const t = Math.min(1, Math.max(0, (impacted - 280) / 1200));
        triggerNekoSquash(Math.min(0.8, 1 - t * 0.45));
      }

      applyNekoBoxStyle();

      if (crabState.fy >= maxY - 0.5 && Math.abs(crabState.vy) < 10 && Math.abs(crabState.vx) < 15) {
        crabState.throwing = false;
        crabState.throwRaf = 0;
        crabState.stage.reaction = null;
        stepCrab();
        return;
      }
      crabState.throwRaf = requestAnimationFrame(step);
    };
    crabState.throwRaf = requestAnimationFrame(step);
  }

  function scheduleNekoRoam() {
    if (crabState.roamTimer) clearTimeout(crabState.roamTimer);
    crabState.roamTimer = null;
    if (destroyed || !crabState.roamEnabled || !crabState.root) return;
    crabState.roamTimer = setTimeout(() => {
      crabState.roamTimer = null;
      if (destroyed || !crabState.roamEnabled || !crabState.root || crabState.throwing || crabState.stage.press) {
        scheduleNekoRoam();
        return;
      }
      const mood = crabState.root.getAttribute('data-ag-cs-mood') || 'idle';
      if (mood === 'idle' || mood === 'happy') {
        if (crabState.floating) {
          const vw = window.innerWidth || 1280;
          const nextX = Math.max(16, Math.min(vw - NEKO_W - 16, crabState.fx + (Math.random() - 0.5) * 240));
          crabState.facing = nextX >= crabState.fx ? 1 : -1;
          crabState.fx = nextX;
        } else {
          const nextOff = Math.max(-180, Math.min(0, crabState.roamOffset + (Math.random() - 0.5) * 140));
          crabState.facing = nextOff >= crabState.roamOffset ? 1 : -1;
          crabState.roamOffset = nextOff;
        }
        applyNekoBoxStyle();
        triggerNekoSquash(0.84);
      }
      scheduleNekoRoam();
    }, 4500 + Math.random() * 4500);
  }

  function scheduleNekoChatter() {
    if (crabState.chatterTimer) clearTimeout(crabState.chatterTimer);
    crabState.chatterTimer = null;
    if (destroyed || !crabState.root) return;
    crabState.chatterTimer = setTimeout(() => {
      crabState.chatterTimer = null;
      if (destroyed || !crabState.root) return;
      if (!document.hidden && crabState.bubbleEnabled && Date.now() - crabState.lastBubbleAt > 30000) {
        const mood = crabState.root.getAttribute('data-ag-cs-mood') || 'idle';
        if (mood === 'sleeping') showNekoBubble(getNekoLine('sleep'), 2800);
        else if (mood === 'idle') showNekoBubble(getNekoLine('chatter'), 3600);
      }
      scheduleNekoChatter();
    }, 36000 + Math.random() * 20000);
  }

  function openNekoContextMenu(clientX, clientY) {
    closeNekoMenu();
    if (!document.body) return;
    const zh = isZh();
    const menu = document.createElement('div');
    menu.className = 'ag-cs-neko-menu';
    menu.setAttribute('data-ag-no-i18n', '');
    const pickAction = (dockKey, bubbleKind) => () => {
      crabState.forcedMood = dockKey;
      crabState.stage.asleep = dockKey === 'lie_sleep';
      triggerNekoSquash(0.74);
      if (crabState.stage.current) showCrabSheet(crabState.stage.current, Date.now());
      else stepCrab();
      if (bubbleKind) showNekoBubble(getNekoLine(bubbleKind));
    };

    const items = [
      {
        label: zh ? '💰 看看额度用量' : '💰 Check Quota Usage',
        action: () => {
          showNekoQuotaBubble();
        },
      },
      { sep: true },
      {
        label: zh ? '✨ 智能随动 · 20动作轮播 (默认)' : '✨ Auto Dynamic · 20 Actions',
        active: !crabState.forcedMood,
        action: () => {
          crabState.forcedMood = '';
          crabState.stage.asleep = false;
          triggerNekoSquash(0.75);
          if (crabState.stage.current) showCrabSheet(crabState.stage.current, Date.now());
          else stepCrab();
        },
      },
      { sep: true },
      { group: zh ? '🐾 趴框系列 (10 动作)' : '🐾 Lying on Edge (10)' },
      ...NEKO_DOCK_CATALOG.filter((c) => c.stance === 'lie').map((c) => ({
        label: zh ? c.zh : c.en,
        active: canonicalDockVideoKey(crabState.forcedMood) === c.key && Boolean(crabState.forcedMood),
        action: pickAction(
          c.key,
          c.key === 'lie_sleep'
            ? 'sleep'
            : c.key === 'lie_think'
            ? 'thinking'
            : c.key === 'lie_coding'
            ? 'typing'
            : c.key === 'lie_watch_typing'
            ? 'watch_typing'
            : c.key === 'lie_peek_shy'
            ? 'poke'
            : 'chatter'
        ),
      })),
      { sep: true },
      { group: zh ? '🎀 坐框系列 (10 动作)' : '🎀 Sitting on Edge (10)' },
      ...NEKO_DOCK_CATALOG.filter((c) => c.stance === 'sit').map((c) => ({
        label: zh ? c.zh : c.en,
        active: canonicalDockVideoKey(crabState.forcedMood) === c.key && Boolean(crabState.forcedMood),
        action: pickAction(
          c.key,
          c.key === 'sit_happy'
            ? 'happy'
            : c.key === 'sit_background'
            ? 'background'
            : c.key === 'sit_angry_pout'
            ? 'error'
            : c.key === 'sit_milk_tea' || c.key === 'sit_snack'
            ? 'snack'
            : 'chatter'
        ),
      })),
      { sep: true },
      {
        label: (crabState.roamEnabled ? '☑ ' : '☐ ') + (zh ? '沿输入框漫游' : 'Roam on Input Bar'),
        action: () => {
          crabState.roamEnabled = !crabState.roamEnabled;
          if (!crabState.roamEnabled) {
            crabState.roamOffset = 0;
            crabState.facing = 1;
            applyNekoBoxStyle();
          } else {
            scheduleNekoRoam();
          }
        },
      },
      {
        label: (crabState.bubbleEnabled ? '☑ ' : '☐ ') + (zh ? '头顶气泡台词' : 'Speech Bubbles'),
        action: () => {
          crabState.bubbleEnabled = !crabState.bubbleEnabled;
          if (!crabState.bubbleEnabled && crabState.bubble) crabState.bubble.removeAttribute('data-open');
        },
      },
      {
        label: (cfg.desktopPet !== false ? '☑ ' : '☐ ') + (zh ? '桌面置顶猫耳娘' : 'Desktop Topmost Pet'),
        action: () => {
          saveSetting('desktopPet', cfg.desktopPet === false);
          syncNekoToDesktop(crabState.lastInfo, true);
        },
      },
    ];

    for (const it of items) {
      if (it.sep) {
        const sep = document.createElement('div');
        sep.className = 'ag-cs-neko-menu-sep';
        menu.appendChild(sep);
        continue;
      }
      if (it.group) {
        const grp = document.createElement('div');
        grp.className = 'ag-cs-neko-menu-group';
        grp.textContent = it.group;
        menu.appendChild(grp);
        continue;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-cs-neko-menu-item' + (it.active ? ' is-active' : '');
      btn.textContent = it.label;
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeNekoMenu();
        it.action();
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    const mw = menu.offsetWidth || 184;
    const mh = menu.offsetHeight || 360;
    menu.style.left = Math.max(8, Math.min(vw - mw - 8, clientX)) + 'px';
    menu.style.top = Math.max(8, Math.min(vh - mh - 8, clientY - mh)) + 'px';
    crabState.menuEl = menu;
  }

  function playCrabAnimation(strip, key, mode) {
    if (crabState.stage.animation) {
      crabState.stage.animation.cancel();
      crabState.stage.animation = null;
    }
    const sheet = crabAssets.CRAB_SHEETS[key];
    const duration = Math.max(900, (sheet ? sheet.frames : 16) * crabAssets.CRAB_FRAME_MS);
    if (mode === 'once' && strip && typeof strip.animate === 'function') {
      const anim = strip.animate([{ opacity: 1 }, { opacity: 1 }], { duration, iterations: 1, fill: 'forwards' });
      crabState.stage.animation = anim;
      anim.finished.then(
        () => {
          if (
            crabState.stage.animation !== anim ||
            !crabState.stage.current ||
            crabState.stage.current.key !== key ||
            crabState.stage.current.done
          )
            return;
          crabState.stage.current.done = true;
          mascotCore.finishStage(crabState.stage, key, Date.now(), Math.random);
          stepCrab();
        },
        () => {}
      );
    }
  }

  function showCrabSheet(next, now) {
    if (!crabState.root || !crabState.strip) return;
    const prevMood = crabState.root.getAttribute('data-ag-cs-mood') || 'idle';
    crabState.stage.current = { key: next.key, mode: next.mode, priority: next.priority, start: now };
    if (crabState.stage.reaction && crabState.stage.reaction.key === next.key) {
      crabState.stage.reaction.fresh = false;
    }
    const mood = resolveNekoMood(next.key);
    if (mood === 'idle-look' && prevMood !== 'idle-look') {
      crabState.facing = crabState.facing < 0 ? 1 : -1;
    } else if (mood === 'idle-laptop' && prevMood !== 'idle-laptop') {
      crabState.idleMemeKey = NEKO_IDLE_MEME_KEYS[Math.floor(Math.random() * NEKO_IDLE_MEME_KEYS.length)];
    }
    const vis = resolveNekoVisual(mood);
    crabState.curBoxMode = vis.boxMode;
    crabState.root.setAttribute('data-animation', next.key);
    crabState.root.setAttribute('data-ag-cs-mood', mood);
    if (!syncNekoDockVideo(mood) && crabState.img && vis.src) {
      if (crabState.img.getAttribute('data-pose') !== vis.key) {
        crabState.img.setAttribute('data-pose', vis.key);
        crabState.img.src = vis.src;
      }
    }
    applyNekoBoxStyle();
    if (prevMood !== mood) {
      if (mood === 'thinking') showNekoBubble(getNekoLine('thinking'), 3200);
      else if (mood === 'typing' || mood === 'coding') showNekoBubble(getNekoLine('typing'), 2800);
      else if (mood === 'happy') showNekoBubble(getNekoLine('happy'), 3200);
      else if (mood === 'idle-wave' || mood === 'ciallo') showNekoBubble(getNekoLine('ciallo'), 2800);
      else if (mood === 'idle-laptop' || mood === 'snack') showNekoBubble(getNekoLine('snack'), 2800);
      else if (mood === 'error') showNekoBubble(getNekoLine('error'), 3500);
    }
    playCrabAnimation(crabState.strip, next.key, next.mode);
    if (!crabState.root.hasAttribute('data-ready')) crabState.root.setAttribute('data-ready', '');
  }

  function stepCrab() {
    if (destroyed || !crabState.root || !crabState.strip) return;
    const now = Date.now();
    if (
      crabState.stage.current &&
      crabState.stage.current.mode === 'once' &&
      !crabState.stage.current.done &&
      now - crabState.stage.current.start >= (crabAssets.CRAB_SHEETS[crabState.stage.current.key]?.frames || 1) * crabAssets.CRAB_FRAME_MS
    ) {
      crabState.stage.current.done = true;
      mascotCore.finishStage(crabState.stage, crabState.stage.current.key, now, Math.random);
    }
    const next = mascotCore.decideStage(crabState.stage, now, crabState.stage.level, {
      extras: mascotCore.CRAB_EXTRAS,
      extrasAllowed: !motionReduced() && !document.hidden,
      random: Math.random,
    });
    const switching =
      !crabState.stage.current ||
      next.key !== crabState.stage.current.key ||
      (crabState.stage.reaction && crabState.stage.reaction.fresh);
    const settled = mascotCore.switchSettles(crabState.stage, next, now);
    if (switching && settled) {
      showCrabSheet(next, now);
    }
    if (crabState.stage.timer) clearTimeout(crabState.stage.timer);
    crabState.stage.timer = null;
    const at = mascotCore.nextDecisionAt(
      crabState.stage,
      now,
      switching && !settled,
      (k) => (crabAssets.CRAB_SHEETS[k]?.frames || 1) * crabAssets.CRAB_FRAME_MS
    );
    if (at !== Infinity) {
      crabState.stage.timer = setTimeout(() => {
        crabState.stage.timer = null;
        stepCrab();
      }, Math.max(0, at - now));
    }
  }

  function formatStepLabel(st, zh) {
    if (!st) return '';
    if (st.summary && String(st.summary).trim()) {
      const s = String(st.summary).trim();
      return s.length > 26 ? s.slice(0, 25) + '…' : s;
    }
    const rawTool = String(st.tool || '').trim();
    const shortTool = rawTool.length > 22 ? rawTool.slice(0, 21) + '…' : rawTool;
    const t = shortTool ? ` ${shortTool}` : '';
    switch (st.type) {
      case 'plannerResponse':
        return zh ? '思考与生成回复' : 'Planning & reply';
      case 'commandLine':
      case 'runCommand':
      case 'commandStatus':
        return (zh ? '运行命令' : 'Run command') + (rawTool && rawTool !== 'run_command' && rawTool !== 'command_status' ? t : '');
      case 'editFile':
      case 'writeToFile':
      case 'codeAction':
        return (zh ? '编辑文件' : 'Edit file') + (rawTool && !rawTool.startsWith('edit_file') ? t : rawTool.includes(':') ? ' ' + rawTool.split(':').slice(1).join(':').trim() : '');
      case 'viewFile':
      case 'readFile':
        return (zh ? '读取代码' : 'Read file') + (rawTool.includes(':') ? ' ' + rawTool.split(':').slice(1).join(':').trim() : '');
      case 'listDir':
        return (zh ? '浏览目录' : 'List dir') + (rawTool && rawTool !== 'list_dir' ? t : '');
      case 'search':
      case 'grep':
      case 'grepSearch':
      case 'find':
      case 'findByName':
        return (zh ? '搜索检索' : 'Search') + (rawTool && rawTool !== 'grep_search' && rawTool !== 'find_by_name' ? t : '');
      case 'searchWeb':
        return zh ? '网页搜索' : 'Web search';
      case 'subagent':
        return (zh ? '子代理协作' : 'Subagent') + t;
      default: {
        const low = rawTool.toLowerCase();
        if (zh) {
          if (low.includes('batch_search')) return '极速批量检索';
          if (low.includes('apply_edits')) return '批量原子编辑';
          if (low.includes('quick_outline')) return '提取代码大纲';
          if (low.includes('read_slices')) return '精准切片读取';
          if (low.includes('run_checks')) return '并发校验测试';
          if (low.includes('run_command')) return '运行命令';
          if (low.includes('read_file') || low.includes('view_file')) return '读取代码';
          if (low.includes('edit_file') || low.includes('write_file') || low.includes('replace_file')) return '编辑文件';
          if (low.includes('manage_task')) return '查看后台任务';
          if (low.includes('schedule')) return '定时巡检';
          if (low.includes('search') || low.includes('grep') || low.includes('find')) return '检索代码';
          if (low.includes('browser') || low.includes('web')) return '网页操作';
          if (low.includes('subagent') || low.includes('swarm')) return '子代理协作';
          if (low === 'update_steps' || low === 'update_focus') return '规划任务阶段';
        }
        return (shortTool || st.type || (zh ? '执行步骤' : 'Step')).slice(0, 26);
      }
    }
  }

  function resolveTaskStageInfo(info, fallbackLabel, zh) {
    const plan = Array.isArray(info?.planSteps) ? info.planSteps.filter((x) => x && x.title) : [];
    const focus = String(info?.currentFocus || '').trim();
    if (plan.length > 0) {
      let activeIdx = plan.findIndex((x) => x.status === 'in_progress');
      if (activeIdx < 0) activeIdx = plan.findIndex((x) => x.status === 'pending');
      if (activeIdx < 0) activeIdx = plan.length - 1;
      const cur = plan[activeIdx];
      const rawTitle = String(cur?.title || '').trim();
      const stageLabel = `[${activeIdx + 1}/${plan.length}] ${rawTitle}`;
      const lines = plan.slice(0, 8).map((x) => {
        const icon =
          x.status === 'in_progress'
            ? '⟳ '
            : x.status === 'done'
            ? '✓ '
            : x.status === 'failed'
            ? '! '
            : x.status === 'skipped'
            ? '– '
            : '○ ';
        return icon + String(x.title || '').trim();
      });
      if (focus && focus !== rawTitle && !rawTitle.includes(focus)) {
        lines.push((zh ? '· 当前：' : '· Focus: ') + (focus.length > 30 ? focus.slice(0, 29) + '…' : focus));
      }
      return { hasStage: true, stageLabel, detailLines: lines };
    }
    if (focus) {
      return { hasStage: true, stageLabel: focus, detailLines: null };
    }
    return { hasStage: false, stageLabel: fallbackLabel || '', detailLines: null };
  }

  function resolveTurnSteps(info) {
    const t = Number(info?.turnSteps || 0);
    if (t > 0) return t;
    const r = Array.isArray(info?.recentSteps) ? info.recentSteps.length : 0;
    const all = Number(info?.steps || 0);
    return Math.max(r, all);
  }

  function renderNekoTaskBubble(info) {
    if (!crabState.taskPanel) return;
    const panel = crabState.taskPanel;
    // When standalone desktop pet is active, do not duplicate the task progress bubble inside the web composer corner
    if (cfg.desktopPet !== false && typeof window.__agCsNekoBinding === 'function') {
      panel.removeAttribute('data-open');
      panel.removeAttribute('data-state');
      return;
    }
    const zh = isZh();
    const isRunning = Boolean(info?.isRunning);
    const isThinking = Boolean(info?.isThinking);
    const hasError = Boolean(info?.hasError);
    const doneState = crabState.taskDoneState;
    const stepsCount = resolveTurnSteps(info);
    const callsCount = Number(info?.calls || 0);
    const subRunning = Array.isArray(info?.subagents) ? info.subagents.filter((s) => s.isRunning).length : 0;
    const show = isRunning || doneState === 'done' || doneState === 'error';

    if (!show) {
      panel.removeAttribute('data-open');
      panel.removeAttribute('data-state');
      return;
    }

    const stateTag = isRunning ? (isThinking ? 'thinking' : 'running') : doneState === 'error' || hasError ? 'error' : 'done';
    const elapsedSec = isRunning
      ? crabState.taskStartedAt
        ? Math.max(1, Math.round((Date.now() - crabState.taskStartedAt) / 1000))
        : 0
      : crabState.lastTaskElapsedSec;
    const elapsedTxt = elapsedSec > 0 ? `${elapsedSec}s` : '';

    const recent = Array.isArray(info?.recentSteps) ? info.recentSteps : [];
    const liveStep = [...recent].reverse().find((s) => s.status === 1 || s.status === 2);
    const lastStep = recent[recent.length - 1];
    const hasPendingBg = Boolean(Number(info?.pendingBgTasks || 0) > 0 || info?.isBackgroundSuspended);
    const activeLabel = liveStep
      ? formatStepLabel(liveStep, zh)
      : hasPendingBg
      ? zh
        ? '后台挂起运行中'
        : 'Background task'
      : subRunning > 0
      ? zh
        ? `子代理协作 (${subRunning})`
        : `Subagent (${subRunning})`
      : lastStep
      ? formatStepLabel(lastStep, zh)
      : '';

    let pillText = '';
    if (stateTag === 'thinking') {
      pillText = zh
        ? `✦ 思考中 · ${stepsCount > 0 ? `${stepsCount}步` : `第${callsCount || 1}轮`}${elapsedTxt ? ' · ' + elapsedTxt : ''}`
        : `✦ Thinking · ${stepsCount} steps${elapsedTxt ? ' · ' + elapsedTxt : ''}`;
    } else if (stateTag === 'running') {
      pillText = zh
        ? `⚡ ${activeLabel || (subRunning ? `子代理协作 (${subRunning})` : '正在执行')} · ${stepsCount > 0 ? `${stepsCount}步` : '进行中'}${elapsedTxt ? ' · ' + elapsedTxt : ''}`
        : `⚡ ${activeLabel || 'Working'} · ${stepsCount} steps`;
    } else if (stateTag === 'error') {
      pillText = zh ? `! 任务遇到异常 · 点击查看` : `! Task warning · Click to view`;
    } else {
      const doneSteps = Math.max(stepsCount, crabState.lastTaskSteps || 0);
      pillText = zh
        ? `✓ 任务已完成${doneSteps > 0 ? ` · 本轮${doneSteps}步` : ''}${elapsedTxt ? ' · ' + elapsedTxt : ''}`
        : `✓ Task done${doneSteps > 0 ? ` · ${doneSteps} steps` : ''}${elapsedTxt ? ' · ' + elapsedTxt : ''}`;
    }

    const renderKey = `${stateTag}|${crabState.taskExpanded ? 1 : 0}|${pillText}|${recent.map((s) => s.type + s.status + s.tool + (s.summary || '')).join(',')}`;
    if (panel.getAttribute('data-render-key') === renderKey) return;
    panel.setAttribute('data-render-key', renderKey);
    panel.setAttribute('data-open', '1');
    panel.setAttribute('data-state', stateTag);
    if (crabState.taskExpanded) panel.classList.add('is-expanded');
    else panel.classList.remove('is-expanded');

    const taskTitle = info?.activeTaskTitle ? escapeHtml(info.activeTaskTitle) : zh ? '当前对话任务' : 'Active Task';
    const modelStr = info?.lastModel ? escapeHtml(info.lastModel) : '';
    const stepsHtml = recent
      .map((st) => {
        const stCls = st.status === 1 || st.status === 2 ? 'is-active' : st.status === 4 || st.status === 6 ? 'is-err' : 'is-ok';
        const icon = stCls === 'is-active' ? '⟳' : stCls === 'is-err' ? '!' : '✓';
        return `<div class="ag-cs-neko-task-step ${stCls}"><span>${icon}</span><span>${escapeHtml(formatStepLabel(st, zh))}</span></div>`;
      })
      .join('');

    panel.innerHTML = `
      <div class="ag-cs-neko-task-pill" data-act="toggle">
        <span class="ag-cs-neko-task-dot"></span>
        <span class="ag-cs-neko-task-txt">${escapeHtml(pillText)}</span>
        <span class="ag-cs-neko-task-chev">${crabState.taskExpanded ? '▴' : '▾'}</span>
        ${!isRunning ? `<button type="button" class="ag-cs-neko-task-dismiss" data-act="dismiss" title="${zh ? '知道了' : 'Dismiss'}">×</button>` : ''}
      </div>
      ${
        crabState.taskExpanded
          ? `<div class="ag-cs-neko-task-body">
              <div class="ag-cs-neko-task-head">${taskTitle}</div>
              <div class="ag-cs-neko-task-bar"><span class="ag-cs-neko-task-bar-fill"></span></div>
              <div class="ag-cs-neko-task-meta">${modelStr ? modelStr + ' · ' : ''}${zh ? `第 ${callsCount} 轮 · ${stepsCount} 步` : `T${callsCount} · ${stepsCount} steps`}${elapsedTxt ? ' · ' + elapsedTxt : ''}</div>
              ${stepsHtml ? `<div class="ag-cs-neko-task-steps">${stepsHtml}</div>` : ''}
            </div>`
          : ''
      }
    `;
  }

  const bgConvoTrack = new Map(); // cascadeId -> { startedAt, startSteps, wasRunning, doneState, doneAt, lastSteps, lastFetchAt, lastSeenStep, lastSeenMod, activeUntil }
  const bgSummaryBaseline = new Map(); // cascadeId -> { stepCount, lastModSec }
  let bgPollTimer = null;

  function ensureBgLivePoll(hasActiveBg) {
    if (!hasActiveBg || destroyed) {
      if (bgPollTimer) {
        clearInterval(bgPollTimer);
        bgPollTimer = null;
      }
      return;
    }
    if (bgPollTimer) return;
    bgPollTimer = setInterval(() => {
      if (destroyed) {
        clearInterval(bgPollTimer);
        bgPollTimer = null;
        return;
      }
      syncNekoToDesktop(crabState.lastInfo, false);
    }, 1000);
  }

  function isSummaryEntryRunning(s, nowMs) {
    if (!s || typeof s !== 'object') return false;
    const lastModSec = Number(s.lastModifiedTime?.seconds || 0);
    const hasBgOrSub = Boolean(
      Number(s.backgroundTaskCount || 0) > 0 ||
        s.hasRunningSubagents ||
        Number(s.activeSubagentCount || 0) > 0
    );
    if (lastModSec > 0 && nowMs / 1000 - lastModSec > (hasBgOrSub ? 3600 : 600)) {
      return false;
    }
    if (s.notFullyIdle || hasBgOrSub) return true;
    if (s.status === 2) return true;
    if (typeof s.status === 'string') {
      const u = s.status.toUpperCase();
      if (u.includes('RUNNING')) return true;
    }
    return false;
  }

  function shortTitleLabel(rawTitle, fallback) {
    const t = String(rawTitle || '').replace(/\s+/g, ' ').trim();
    if (!t) return fallback || '';
    return t.length > 14 ? t.slice(0, 13) + '…' : t;
  }

  function collectConcurrentDesktopTasks(primaryCid, primaryTask, zh) {
    const tasks = [];
    if (primaryTask && primaryTask.statusText) {
      tasks.push(primaryTask);
    }
    let anyBgRunning = false;
    try {
      const h = ensureHooks(true);
      const st = h?.store?.getState?.();
      const sums = st?.trajectorySummaries?.summaries || st?.cascadeTrajectorySummaries || {};
      const now = Date.now();
      for (const [cid, rawEntry] of Object.entries(sums)) {
        if (!cid || cid === primaryCid) continue;
        const s = unwrapTrajSummary(rawEntry);
        const meta = s.trajectoryMetadata || {};
        // Skip child subagents (already aggregated under their parent conversation)
        if (meta.parentConversationId) continue;

        const rawStepCount = Number(s.stepCount || 0);
        const lastModSec = Number(s.lastModifiedTime?.seconds || 0);
        const prevBase = bgSummaryBaseline.get(cid);
        // Only treat real stepCount growth (> 0) as background activity; never trigger on empty new-chat metadata touch
        const stepGrew = Boolean(prevBase && rawStepCount > 0 && rawStepCount > prevBase.stepCount);
        bgSummaryBaseline.set(cid, { stepCount: rawStepCount, lastModSec });

        const cached = activeTrajCache.get(cid)?.data || null;
        let tr = bgConvoTrack.get(cid);
        const hasBgSignal = Boolean(
          Number(s.backgroundTaskCount || 0) > 0 ||
            s.hasRunningSubagents ||
            Number(s.activeSubagentCount || 0) > 0 ||
            Number(cached?.pendingBgTasks || 0) > 0
        );
        const turnExplicitlyDone = Boolean(
          !hasBgSignal &&
            cached &&
            Number(cached.steps || 0) >= rawStepCount &&
            cached.turnSteps > 0 &&
            !cached.isRunning &&
            !cached.awaitingNextTurn
        );
        const summaryRunning = !turnExplicitlyDone && isSummaryEntryRunning(s, now);
        const cachedRunning = Boolean(cached?.isRunning && lastModSec > 0 && now / 1000 - lastModSec <= 600);
        const recentlyGrew = Boolean(!turnExplicitlyDone && (stepGrew || (tr && tr.activeUntil > now)));
        const running = summaryRunning || cachedRunning || recentlyGrew;

        if (running) {
          anyBgRunning = true;
          if (!tr) {
            tr = {
              startedAt: now,
              startSteps: rawStepCount > 0 ? Math.max(0, rawStepCount - 1) : 0,
              wasRunning: true,
              doneState: '',
              doneAt: 0,
              lastSteps: 1,
              lastFetchAt: 0,
              activeUntil: stepGrew ? now + 4500 : 0,
            };
            bgConvoTrack.set(cid, tr);
          } else {
            if (!tr.wasRunning) {
              tr.startedAt = now;
              tr.startSteps = rawStepCount > 0 ? Math.max(0, rawStepCount - 1) : 0;
              tr.wasRunning = true;
              tr.doneState = '';
              tr.doneAt = 0;
              tr.lastSteps = 0;
            }
            if (stepGrew) tr.activeUntil = now + 4500;
          }
          // Throttled live detail fetch for background running conversations, then push immediately!
          if (now - tr.lastFetchAt >= 1200) {
            tr.lastFetchAt = now;
            fetchActiveConvo(cid, true)
              .then(() => {
                if (!destroyed) syncNekoToDesktop(crabState.lastInfo, false);
              })
              .catch(() => {});
          }
        } else if (tr && tr.wasRunning) {
          tr.wasRunning = false;
          tr.doneState = cached?.hasError ? 'error' : 'done';
          tr.doneAt = now;
        }
        if (!tr) continue;
        // Expire old completed background items after 120s
        if (!running && tr.doneAt && now - tr.doneAt > 120000) {
          bgConvoTrack.delete(cid);
          continue;
        }
        if (!running && !tr.doneState) continue;

        const totalSteps = Math.max(rawStepCount, Number(cached?.steps || 0));
        const deltaSteps = Math.max(
          tr.lastSteps || 0,
          totalSteps > tr.startSteps ? totalSteps - tr.startSteps : Number(cached?.turnSteps || 0)
        );
        if (deltaSteps > tr.lastSteps) tr.lastSteps = deltaSteps;

        const elapsedSec = running
          ? Math.max(1, Math.round((now - tr.startedAt) / 1000))
          : Math.max(1, Math.round(((tr.doneAt || now) - tr.startedAt) / 1000));
        const title =
          String((typeof s.summary === 'string' ? s.summary : '') || cached?.activeTaskTitle || '').trim() ||
          (zh ? `会话 ${cid.slice(0, 6)}` : `Chat ${cid.slice(0, 6)}`);
        const recent = Array.isArray(cached?.recentSteps) ? cached.recentSteps : [];
        const liveStep = [...recent].reverse().find((x) => x.status === 1 || x.status === 2);
        const lastStep = recent[recent.length - 1];
        const isBgSuspended = Boolean(
          Number(s.backgroundTaskCount || 0) > 0 ||
            Number(cached?.pendingBgTasks || 0) > 0 ||
            cached?.isBackgroundSuspended
        );
        const bgSubRunning =
          (Array.isArray(cached?.subagents) ? cached.subagents.filter((x) => x.isRunning).length : 0) ||
          Number(s.activeSubagentCount || 0) ||
          (s.hasRunningSubagents ? 1 : 0);
        const activeLabel = liveStep
          ? formatStepLabel(liveStep, zh)
          : isBgSuspended
          ? zh
            ? '后台挂起运行中'
            : 'Background task'
          : bgSubRunning > 0
          ? zh
            ? `子代理协作 (${bgSubRunning})`
            : `Subagent (${bgSubRunning})`
          : lastStep
          ? formatStepLabel(lastStep, zh)
          : '';

        const stageInfo = resolveTaskStageInfo(cached, activeLabel, zh);
        let workState = 'idle';
        let statusText = '';
        if (running) {
          if (cached?.isThinking) {
            workState = 'thinking';
            statusText = stageInfo.hasStage
              ? `✦ ${stageInfo.stageLabel} (${elapsedSec}s)`
              : zh
              ? `✦ 思考中 · ${deltaSteps > 0 && deltaSteps <= 99 ? `${deltaSteps}步 ` : ''}(${elapsedSec}s)`
              : `✦ Thinking · ${deltaSteps || 1}`;
          } else {
            workState = 'working';
            statusText = stageInfo.hasStage
              ? `⚡ ${stageInfo.stageLabel} (${elapsedSec}s)`
              : zh
              ? `⚡ ${stageInfo.stageLabel || '后台执行中'}${deltaSteps > 0 && deltaSteps <= 99 ? ` · ${deltaSteps}步` : ''} (${elapsedSec}s)`
              : `⚡ ${stageInfo.stageLabel || 'Working'} (${elapsedSec}s)`;
          }
        } else if (tr.doneState === 'done') {
          workState = 'done';
          statusText = zh
            ? `✓ 已完成${deltaSteps > 0 && deltaSteps <= 99 ? ` · ${deltaSteps}步` : ''} (${elapsedSec}s)`
            : `✓ Done${deltaSteps > 0 ? ` · ${deltaSteps}` : ''} (${elapsedSec}s)`;
        } else if (tr.doneState === 'error') {
          workState = 'error';
          statusText = zh ? `! 任务遇到异常` : `! Task warning`;
        }
        if (statusText) {
          const bgSubTotal = Math.max(
            bgSubRunning,
            Array.isArray(cached?.subagents) ? cached.subagents.length : 0,
            Number(s.subagentCount || 0)
          );
          const bgAgentMode = bgSubTotal > 0 ? 'multi' : 'single';
          tasks.push({
            id: cid,
            shortTitle: shortTitleLabel(title, cid.slice(0, 6)),
            taskTitle: title,
            workState,
            running,
            doneState: running ? '' : tr.doneState,
            statusText,
            steps: deltaSteps,
            elapsedSec,
            agentMode: bgAgentMode,
            subagentRunning: bgSubRunning,
            subagentTotal: bgSubTotal,
            detailLines:
              stageInfo.detailLines ||
              recent
                .map((x) => {
                  const icon = x.status === 1 || x.status === 2 ? '⟳ ' : x.status === 4 || x.status === 6 ? '! ' : '✓ ';
                  return icon + formatStepLabel(x, zh);
                })
                .filter(Boolean),
          });
        }
      }
    } catch {}
    ensureBgLivePoll(anyBgRunning);
    return tasks;
  }

  function syncNekoToDesktop(info, force = false) {
    try {
      const send = window.__agCsNekoBinding;
      if (typeof send !== 'function') return;
      const isRunning = Boolean(info?.isRunning);
      const isThinking = Boolean(info?.isThinking);
      const isWaiting = Boolean(info?.isWaiting);
      const mood = crabState.root?.getAttribute('data-ag-cs-mood') || 'idle';
      const desktopPose =
        mood === 'thinking'
          ? 'think'
          : mood === 'happy' || mood === 'typing' || mood === 'idle-wave'
          ? 'happy'
          : mood === 'sleeping' || mood === 'waking'
          ? 'sleep'
          : mood === 'error' || mood === 'poke-left' || mood === 'poke-right' || mood === 'tickle'
          ? 'shy'
          : 'idle';
      const pose = desktopPose;
      const zh = isZh();
      const rawTotalSteps = Number(info?.steps || 0);
      const deltaSteps =
        typeof crabState.taskStartStepCount === 'number' && rawTotalSteps > crabState.taskStartStepCount
          ? rawTotalSteps - crabState.taskStartStepCount
          : resolveTurnSteps(info);
      const steps = isRunning ? deltaSteps : Math.max(deltaSteps, crabState.lastTaskSteps || 0);
      const calls = Number(info?.calls || 0);
      const elapsedSec = isRunning
        ? crabState.taskStartedAt
          ? Math.max(1, Math.round((Date.now() - crabState.taskStartedAt) / 1000))
          : 0
        : crabState.lastTaskElapsedSec;
      const recent = Array.isArray(info?.recentSteps) ? info.recentSteps : [];
      const liveStep = [...recent].reverse().find((s) => s.status === 1 || s.status === 2);
      const lastStep = recent[recent.length - 1];
      const subRunning = Array.isArray(info?.subagents) ? info.subagents.filter((s) => s.isRunning).length : 0;
      const hasPendingBg = Boolean(Number(info?.pendingBgTasks || 0) > 0 || info?.isBackgroundSuspended);
      const activeLabel = liveStep
        ? formatStepLabel(liveStep, zh)
        : hasPendingBg
        ? zh
          ? '后台挂起运行中'
          : 'Background task'
        : subRunning > 0
        ? zh
          ? `子代理协作 (${subRunning})`
          : `Subagent (${subRunning})`
        : lastStep
        ? formatStepLabel(lastStep, zh)
        : '';

      const stageInfo = resolveTaskStageInfo(info, activeLabel, zh);
      let workState = 'idle';
      let statusText = '';
      if (isRunning) {
        if (isWaiting) {
          workState = 'waiting';
          statusText = stageInfo.hasStage
            ? `⏳ ${stageInfo.stageLabel}${elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}`
            : zh
            ? `⏳ 等待你的确认${elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}`
            : `⏳ Waiting for approval`;
        } else if (isThinking) {
          workState = 'thinking';
          statusText = stageInfo.hasStage
            ? `✦ ${stageInfo.stageLabel}${elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}`
            : zh
            ? `✦ 思考中 · ${steps > 0 && steps <= 99 ? `${steps}步` : `第${calls || 1}轮`}${elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}`
            : `✦ Thinking · ${steps}`;
        } else {
          workState = 'working';
          statusText = stageInfo.hasStage
            ? `⚡ ${stageInfo.stageLabel}${elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}`
            : zh
            ? `⚡ ${stageInfo.stageLabel || (subRunning ? `子代理协作 (${subRunning})` : '正在执行')}${steps > 0 && steps <= 99 ? ` · ${steps}步` : ''}${elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}`
            : `⚡ ${stageInfo.stageLabel || 'Working'} · ${steps}`;
        }
      } else if (crabState.taskDoneState === 'done') {
        workState = 'done';
        statusText = zh
          ? `✓ 任务已完成${steps > 0 && steps <= 99 ? ` · 本轮${steps}步` : ''}${elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}`
          : `✓ Task completed${steps > 0 ? ` (${steps} steps)` : ''}`;
      } else if (crabState.taskDoneState === 'error') {
        workState = 'error';
        statusText = zh ? `! 任务遇到异常` : `! Task warning`;
      }

      const primaryCid = String(info?.cascadeId || crabState.activeCascadeId || '');
      let summaryTitle = '';
      try {
        const h = ensureHooks(true);
        const sums = h?.store?.getState?.()?.trajectorySummaries?.summaries || {};
        const sum = primaryCid ? unwrapTrajSummary(sums[primaryCid]) : null;
        if (sum && typeof sum.summary === 'string' && sum.summary.trim()) {
          summaryTitle = sum.summary.trim();
        }
      } catch {}
      const primaryTitle = String(
        summaryTitle ||
          info?.activeTaskTitle ||
          document.title?.replace(/\s*-\s*Antigravity.*$/i, '') ||
          ''
      ).trim();
      const detailLines =
        stageInfo.detailLines ||
        recent
          .map((s) => {
            const icon = s.status === 1 || s.status === 2 ? '⟳ ' : s.status === 4 || s.status === 6 ? '! ' : '✓ ';
            return icon + formatStepLabel(s, zh);
          })
          .filter(Boolean);
      const primarySubTotal = Math.max(
        subRunning,
        Array.isArray(info?.subagents) ? info.subagents.length : 0,
        Number(info?.subagentCount || 0)
      );
      const primaryTask =
        primaryCid && statusText
          ? {
              id: primaryCid,
              shortTitle: shortTitleLabel(primaryTitle, zh ? '当前会话' : 'Active'),
              taskTitle: primaryTitle || (zh ? '当前对话任务' : 'Active Task'),
              workState,
              running: isRunning,
              doneState: crabState.taskDoneState || '',
              statusText,
              steps,
              elapsedSec,
              agentMode: primarySubTotal > 0 ? 'multi' : 'single',
              subagentRunning: subRunning,
              subagentTotal: primarySubTotal,
              detailLines,
            }
          : null;
      const tasks = collectConcurrentDesktopTasks(primaryCid, primaryTask, zh);

      let quotaUsedPct = -1;
      let quotaSummary = '';
      try {
        if (!cachedQuotaData || Date.now() - lastQuotaFetchAt > 60000) {
          fetchQuotaData(false)
            .then(() => {
              if (!destroyed) syncNekoToDesktop(crabState.lastInfo, false);
            })
            .catch(() => {});
        }
        const qInfo = buildQuotaDisplayInfo(info, crabState.anchor);
        if (qInfo && qInfo.usedPct >= 0) {
          quotaUsedPct = qInfo.usedPct;
          quotaSummary = qInfo.summary;
        }
      } catch {}

      const payload = {
        __agCsNekoSync: {
          enabled: cfg.mascot === 'crab' && cfg.desktopPet !== false,
          pose,
          mood,
          workState,
          running: isRunning,
          doneState: crabState.taskDoneState || '',
          statusText,
          taskTitle: primaryTitle,
          steps,
          calls,
          elapsedSec,
          quotaUsedPct,
          quotaSummary,
          detailLines,
          tasks,
        },
      };
      const json = JSON.stringify(payload);
      if (!force && json === crabState.lastTelemetryJson) return;
      crabState.lastTelemetryJson = json;
      send(json);
    } catch {}
  }

  function buildCrabNode() {
    const root = document.createElement('span');
    root.className = 'ag-cs-crab ag-cs-neko';
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('data-ag-no-i18n', '');
    root.setAttribute('data-ag-cs-mood', 'idle');
    root.setAttribute('data-ag-cs-pose', crabState.poseMode);
    const taskPanel = document.createElement('div');
    taskPanel.className = 'ag-cs-neko-task';
    taskPanel.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    taskPanel.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const actEl = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
      const act = actEl ? actEl.getAttribute('data-act') : 'toggle';
      if (act === 'dismiss') {
        crabState.taskDoneState = '';
        crabState.taskExpanded = false;
        renderNekoTaskBubble(crabState.lastInfo);
        syncNekoToDesktop(crabState.lastInfo, true);
        return;
      }
      crabState.taskExpanded = !crabState.taskExpanded;
      renderNekoTaskBubble(crabState.lastInfo);
    });
    root.appendChild(taskPanel);

    const compactPrompt = document.createElement('div');
    compactPrompt.className = 'ag-cs-neko-compact';
    compactPrompt.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    compactPrompt.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const actEl = ev.target && ev.target.closest ? ev.target.closest('[data-compact-act]') : null;
      const act = actEl ? actEl.getAttribute('data-compact-act') : '';
      const cid = crabState.activeCascadeId || crabState.lastInfo?.cascadeId || '';
      if (act === 'dismiss') {
        const curPct = Math.round(crabState.lastCtxPctByCid.get(cid) || 80);
        if (cid) crabState.compactDismissedMap.set(cid, curPct);
        compactPrompt.removeAttribute('data-open');
        return;
      }
      if (act === 'run') {
        if (cid && crabState.compactSendingCid === cid && crabState.compactSendingUntil > Date.now()) return;
        const ok = triggerAutoCompact(crabState.anchor);
        if (ok) {
          crabState.compactSendingCid = cid;
          crabState.compactSendingUntil = Date.now() + 25000;
          triggerNekoSquash(0.68);
          showNekoBubble(
            isZh() ? '收到！正在自动压缩当前会话喵~ ✦' : 'Got it! Compacting this conversation~ ✦',
            3800,
            { force: true, protectMs: 2600 }
          );
          if (crabState.anchor) renderNekoCompactPrompt(crabState.anchor, crabState.lastInfo);
        }
      }
    });
    root.appendChild(compactPrompt);

    const bubble = document.createElement('span');
    bubble.className = 'ag-cs-neko-bubble';
    bubble.addEventListener('mouseenter', () => {
      crabState.bubbleHovered = true;
    });
    bubble.addEventListener('mouseleave', () => {
      crabState.bubbleHovered = false;
      if (crabState.bubble && crabState.bubble.getAttribute('data-open') === '1' && !crabState.bubbleTimer) {
        crabState.bubbleTimer = setTimeout(() => {
          crabState.bubbleTimer = null;
          if (!crabState.bubbleHovered) hideNekoBubble();
        }, 1400);
      }
    });
    bubble.addEventListener('click', (ev) => {
      ev.stopPropagation();
      hideNekoBubble();
    });
    root.appendChild(bubble);

    const sprite = document.createElement('span');
    sprite.className = 'ag-cs-neko-stage';
    const strip = document.createElement('span');
    strip.className = 'ag-cs-neko-body-wrap';
    const img = document.createElement('img');
    img.className = 'ag-cs-neko-img';
    img.alt = '';
    img.draggable = false;
    const initSrc = (crabAssets.NEKO_POSES && crabAssets.NEKO_POSES.peek) || crabAssets.NEKO_DATA_URI;
    if (initSrc) img.src = initSrc;
    strip.appendChild(img);
    const video = document.createElement('video');
    video.className = 'ag-cs-neko-video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    strip.appendChild(video);
    const fx = document.createElement('span');
    fx.className = 'ag-cs-neko-fx';
    fx.innerHTML = `<span class="ag-cs-neko-fx-think">✦</span><span class="ag-cs-neko-fx-sleep">Zzz</span><span class="ag-cs-neko-fx-happy">✦ ♥</span><span class="ag-cs-neko-fx-shy">♥</span><span class="ag-cs-neko-fx-error">!</span>`;
    strip.appendChild(fx);
    sprite.appendChild(strip);
    root.appendChild(sprite);

    const hit = document.createElement('span');
    hit.className = 'ag-cs-crab-hit ag-cs-neko-docked-hit';
    hit.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      closeNekoMenu();
      crabState.stage.quietSince = Date.now();
      crabState.forcedMood = '';
      crabState.stage.press = {
        id: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        lifted: false,
      };
    });
    const endPress = (ev, allowPoke) => {
      const p = crabState.stage.press;
      if (!p || ev.pointerId !== p.id) return;
      crabState.stage.press = null;
      if (!allowPoke) return;
      triggerNekoSquash(0.64);
      const now = Date.now();
      if (crabState.stage.clicks.length > 0 && now - crabState.stage.clicks[crabState.stage.clicks.length - 1] > 450) {
        crabState.stage.clicks = [];
      }
      crabState.stage.clicks.push(now);
      if (crabState.stage.clicks.length >= 4) {
        crabState.stage.clicks = [];
        crabState.stage.reaction = { key: 'tickle', mode: 'once', fresh: true };
        showNekoBubble(getNekoLine('tickle'), 2800);
        stepCrab();
        return;
      }
      const box = hit.getBoundingClientRect ? hit.getBoundingClientRect() : { left: 0, width: 94 };
      const key = ev.clientX - box.left < (box.width || 94) / 2 ? 'poke-left' : 'poke-right';
      crabState.stage.reaction = { key, mode: 'once', fresh: true };
      stepCrab();
    };
    hit.addEventListener('pointerup', (ev) => endPress(ev, true));
    hit.addEventListener('pointercancel', (ev) => endPress(ev, false));
    hit.addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      if (crabState.floating) {
        returnNekoHome();
      }
      showNekoQuotaBubble();
    });
    hit.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openNekoContextMenu(ev.clientX, ev.clientY);
    });
    hit.addEventListener('click', (ev) => ev.stopPropagation());
    root.appendChild(hit);
    return { root, sprite, strip, img, video, bubble, compactPrompt, taskPanel };
  }

  function stopTaskLivePoll() {
    if (crabState.taskPollTimer) {
      clearInterval(crabState.taskPollTimer);
      crabState.taskPollTimer = null;
    }
  }

  function ensureTaskLivePoll(activeCard, cascadeId) {
    if (destroyed || !cascadeId) return;
    crabState.activeCascadeId = cascadeId;
    if (crabState.taskPollTimer) return;
    crabState.taskPollTimer = setInterval(() => {
      if (destroyed || !crabState.root || !crabState.anchor || !crabState.anchor.isConnected) {
        stopTaskLivePoll();
        return;
      }
      const cid = crabState.activeCascadeId || resolveCascadeId(crabState.anchor.closest?.('[data-testid="agent-input-box"]') || crabState.anchor);
      if (!cid) {
        stopTaskLivePoll();
        return;
      }
      fetchActiveConvo(cid, true).then((fresh) => {
        if (!destroyed && crabState.root && crabState.anchor && crabState.anchor.isConnected) {
          syncCrab(crabState.anchor, fresh || crabState.lastInfo);
        }
      });
    }, 800);
  }

  function unmountCrab() {
    closeNekoMenu();
    stopTaskLivePoll();
    ensureBgLivePoll(false);
    if (crabState.stage.timer) clearTimeout(crabState.stage.timer);
    if (crabState.bubbleTimer) clearTimeout(crabState.bubbleTimer);
    if (crabState.quotaAnimTimer) clearTimeout(crabState.quotaAnimTimer);
    if (crabState.chatterTimer) clearTimeout(crabState.chatterTimer);
    if (crabState.roamTimer) clearTimeout(crabState.roamTimer);
    if (crabState.userTypingTimer) clearTimeout(crabState.userTypingTimer);
    if (crabState.idleDockTimer) clearTimeout(crabState.idleDockTimer);
    if (crabState.idleConfirmTimer) clearTimeout(crabState.idleConfirmTimer);
    crabState.idleDockTimer = null;
    if (crabState.throwRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(crabState.throwRaf);
    if (crabState.squashRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(crabState.squashRaf);
    if (crabState.stage.animation) crabState.stage.animation.cancel();
    if (crabState.root && crabState.root.parentElement) crabState.root.parentElement.removeChild(crabState.root);
    if (crabState.anchor) crabState.anchor.removeAttribute('data-ag-cs-crab-anchor');
    crabState.root = null;
    crabState.sprite = null;
    crabState.strip = null;
    crabState.img = null;
    crabState.video = null;
    crabState.bubble = null;
    crabState.compactPrompt = null;
    crabState.taskPanel = null;
    crabState.bubbleTimer = null;
    crabState.bubbleVariant = '';
    crabState.bubbleProtectedUntil = 0;
    crabState.bubbleHovered = false;
    crabState.quotaAnimTimer = null;
    crabState.quotaAnimKey = '';
    crabState.quotaAnimUntil = 0;
    crabState.chatterTimer = null;
    crabState.roamTimer = null;
    crabState.idleConfirmTimer = null;
    crabState.idleConfirmSince = 0;
    crabState.throwRaf = 0;
    crabState.squashRaf = 0;
    crabState.throwing = false;
    crabState.floating = false;
    crabState.anchor = null;
    crabState.stage = mascotCore.freshStage(Date.now());
  }

  function isConversationActuallyRunning(activeCard, activeInfo) {
    // Blank new-conversation home page has no running conversation
    const isHomeCard = Boolean(activeCard?.closest?.('.agy-home') && !activeCard?.closest?.('[data-testid="conversation-view"]'));
    if (isHomeCard) return false;
    if (activeInfo?.isRunning || Number(activeInfo?.pendingBgTasks || 0) > 0) return true;
    try {
      const h = ensureHooks(true);
      const inputBox = activeCard?.closest?.('[data-testid="agent-input-box"]') || activeCard;
      const cid = activeInfo?.cascadeId || resolveCascadeId(inputBox);
      const nowMs = Date.now();
      if (h && cid) {
        const st = h.store?.getState?.();
        const sums = st?.trajectorySummaries?.summaries || st?.cascadeTrajectorySummaries || {};
        const sum = unwrapTrajSummary(sums[cid]);
        if (sum && typeof sum === 'object' && isSummaryEntryRunning(sum, nowMs)) {
          return true;
        }
        // Also check any running child subagent belonging to this conversation
        for (const [subId, rawEntry] of Object.entries(sums)) {
          if (subId === cid) continue;
          const s = unwrapTrajSummary(rawEntry);
          const meta = s.trajectoryMetadata || {};
          if (meta.parentConversationId === cid || meta.rootConversationId === cid) {
            if (isSummaryEntryRunning(s, nowMs)) {
              return true;
            }
          }
        }
      }
      const panels = document.querySelectorAll('[data-testid="running-items-panel"]');
      for (const p of panels) {
        if (String(p.className || '').includes('grid-rows-[1fr]')) {
          return true;
        }
      }
      const stopSel =
        '[data-testid="stop-button"], [data-testid="cancel-cascade-button"], ' +
        'button[aria-label*="Stop generating"], button[aria-label*="停止生成"]';
      const cv = activeCard?.closest?.('[data-testid="conversation-view"]');
      if (cv && cv.querySelector && cv.querySelector(stopSel)) {
        return true;
      }
      if (activeCard && activeCard.querySelector && activeCard.querySelector(stopSel)) {
        return true;
      }
    } catch {}
    if (activeInfo && Number(activeInfo.turnSteps || 0) > 0 && !activeInfo.isRunning && !activeInfo.awaitingNextTurn) {
      return false;
    }
    return false;
  }

  function syncCrab(activeCard, activeInfo) {
    if (cfg.mascot !== 'crab' || !activeCard) {
      unmountCrab();
      return;
    }
    let needsStep = false;
    if (!crabState.root) {
      const built = buildCrabNode();
      crabState.root = built.root;
      crabState.sprite = built.sprite;
      crabState.strip = built.strip;
      crabState.img = built.img;
      crabState.video = built.video;
      crabState.bubble = built.bubble;
      crabState.compactPrompt = built.compactPrompt;
      crabState.taskPanel = built.taskPanel;
      needsStep = true;
      scheduleNekoChatter();
      scheduleNekoRoam();
      scheduleIdleDockRotation();
    }
    crabState.anchor = activeCard;
    if (crabState.floating) {
      if (document.body && crabState.root.parentElement !== document.body) {
        activeCard.removeAttribute('data-ag-cs-crab-anchor');
        document.body.appendChild(crabState.root);
      }
    } else if (crabState.root.parentElement !== activeCard) {
      activeCard.setAttribute('data-ag-cs-crab-anchor', 'composer');
      activeCard.appendChild(crabState.root);
      needsStep = true;
    }

    const inputBox = activeCard.closest?.('[data-testid="agent-input-box"]') || activeCard;
    const isHomeCard = Boolean(activeCard.closest?.('.agy-home') && !activeCard.closest?.('[data-testid="conversation-view"]'));
    const currentCid = isHomeCard ? '' : (activeInfo?.cascadeId || resolveCascadeId(inputBox) || '');

    // When switching conversations (including opening a brand-new blank chat), immediately clear stale primary state
    // so previous chat's done/running badge never flickers or leaks onto the new conversation.
    if (currentCid !== (crabState.activeCascadeId || '')) {
      crabState.activeCascadeId = currentCid;
      crabState.wasRunning = false;
      crabState.idleConfirmSince = 0;
      if (crabState.idleConfirmTimer) {
        clearTimeout(crabState.idleConfirmTimer);
        crabState.idleConfirmTimer = null;
      }
      stopTaskLivePoll();
      crabState.taskDoneState = '';
      crabState.taskExpanded = false;
      crabState.taskStartedAt = 0;
      crabState.taskStartStepCount = null;
      crabState.lastTaskSteps = 0;
      crabState.lastTaskElapsedSec = 0;
    }

    // Preserve last valid trajectory info for the same conversation if transient call passed null
    let mergedInfo = isHomeCard ? null : activeInfo;
    if (!mergedInfo && currentCid && crabState.lastInfo && crabState.lastInfo.cascadeId === currentCid) {
      mergedInfo = { ...crabState.lastInfo, isRunning: false };
    }

    const now = Date.now();
    const rawRunning = isConversationActuallyRunning(activeCard, mergedInfo);
    const effectiveInfo = mergedInfo
      ? { ...mergedInfo, cascadeId: mergedInfo.cascadeId || currentCid, isRunning: rawRunning }
      : currentCid
      ? { cascadeId: currentCid, isRunning: rawRunning, steps: 0, turnSteps: 0, calls: 0, recentSteps: [] }
      : null;

    if (rawRunning) {
      crabState.idleConfirmSince = 0;
      if (crabState.idleConfirmTimer) {
        clearTimeout(crabState.idleConfirmTimer);
        crabState.idleConfirmTimer = null;
      }
      if (!crabState.wasRunning) {
        crabState.taskStartedAt = now;
        crabState.taskDoneState = '';
        crabState.lastTaskSteps = 0;
        const initTotal = Number(effectiveInfo?.steps || 0);
        crabState.taskStartStepCount = initTotal > 0 ? Math.max(0, initTotal - 1) : 0;
        crabState.wasRunning = true;
      }
      const rawTotalNow = Number(effectiveInfo?.steps || 0);
      const curSteps =
        typeof crabState.taskStartStepCount === 'number' && rawTotalNow > crabState.taskStartStepCount
          ? rawTotalNow - crabState.taskStartStepCount
          : resolveTurnSteps(effectiveInfo);
      if (curSteps > (crabState.lastTaskSteps || 0)) {
        crabState.lastTaskSteps = curSteps;
      }
      if (currentCid) ensureTaskLivePoll(activeCard, currentCid);
      crabState.stage.quietSince = now;
      crabState.stage.asleep = false;
    } else if (crabState.wasRunning) {
      // Between tool calls there can be a 2-5s gap before the next plannerResponse starts.
      // Never declare done using stale info: force a fresh trajectory fetch before confirming completion.
      const waitMs = effectiveInfo?.awaitingNextTurn ? 5500 : 2400;
      if (!crabState.idleConfirmSince) {
        crabState.idleConfirmSince = now;
        if (crabState.idleConfirmTimer) clearTimeout(crabState.idleConfirmTimer);
        crabState.idleConfirmTimer = setTimeout(() => {
          crabState.idleConfirmTimer = null;
          if (destroyed || !crabState.root || !crabState.anchor) return;
          const cid = currentCid || crabState.activeCascadeId;
          if (cid) {
            fetchActiveConvo(cid, true).then((fresh) => {
              if (!destroyed && crabState.root && crabState.anchor) {
                syncCrab(crabState.anchor, fresh || crabState.lastInfo);
              }
            });
          } else {
            syncCrab(crabState.anchor, crabState.lastInfo);
          }
        }, waitMs + 150);
      }
      if (now - crabState.idleConfirmSince >= waitMs) {
        stopTaskLivePoll();
        crabState.wasRunning = false;
        crabState.idleConfirmSince = 0;
        if (crabState.idleConfirmTimer) {
          clearTimeout(crabState.idleConfirmTimer);
          crabState.idleConfirmTimer = null;
        }
        const finalSteps = Math.max(resolveTurnSteps(effectiveInfo), crabState.lastTaskSteps || 0);
        crabState.lastTaskSteps = finalSteps;
        crabState.lastTaskElapsedSec = crabState.taskStartedAt
          ? Math.max(1, Math.round((now - crabState.taskStartedAt) / 1000))
          : 0;
        // Only show "task completed" when we actually observed real steps (> 0) or an explicit error
        if (effectiveInfo?.hasError) {
          crabState.taskDoneState = 'error';
          mascotCore.takeMoment(crabState.stage, 'error', now);
          triggerNekoSquash(0.6);
          needsStep = true;
        } else if (finalSteps > 0) {
          crabState.taskDoneState = 'done';
          mascotCore.takeMoment(crabState.stage, 'attention', now);
          triggerNekoSquash(0.6);
          needsStep = true;
        } else {
          crabState.taskDoneState = '';
        }
      }
    } else {
      stopTaskLivePoll();
    }

    const effectiveRunningForUi = rawRunning || crabState.wasRunning;
    const uiInfo = effectiveInfo ? { ...effectiveInfo, isRunning: effectiveRunningForUi } : effectiveInfo;
    crabState.lastInfo = uiInfo || null;
    const nextLevel = mascotCore.levelFromActiveInfo(uiInfo);
    if (!crabState.stage.level || crabState.stage.level.state !== nextLevel.state) {
      crabState.stage.level = nextLevel;
      needsStep = true;
    }
    if (needsStep || !crabState.stage.current) stepCrab();
    else if (crabState.root && crabState.video) {
      syncNekoDockVideo(crabState.root.getAttribute('data-ag-cs-mood') || 'idle');
      applyNekoBoxStyle();
    }
    if (uiInfo?.isRunning && uiInfo?.isWaiting) {
      const waitCid = uiInfo.cascadeId || currentCid || '';
      if (waitCid !== crabState.lastWaitingAlertCid || now - crabState.lastWaitingAlertAt > 45000) {
        crabState.lastWaitingAlertCid = waitCid;
        crabState.lastWaitingAlertAt = now;
        showNekoBubble(getNekoLine('waiting'), 4200);
      }
    }
    renderNekoCompactPrompt(activeCard, uiInfo);
    renderNekoTaskBubble(uiInfo);
    syncNekoToDesktop(uiInfo);
  }

  // ── Per-Turn Token Badges (.ag-cs-turn-bar) & Surround HUD Bars ────────
  function clearTurnBadges() {
    document.querySelectorAll('.ag-cs-turn-bar').forEach((n) => n.remove());
  }

  function extractFiberTurnContainer(el) {
    let fEl = el;
    let foundContainer = null;
    let foundCascadeId = '';
    let foundStepIdx = -1;
    let foundStepTimeSec = 0;

    const readStepIndexFromObj = (obj) => {
      if (!obj || typeof obj !== 'object') return -1;
      const srcIdx = obj.metadata?.sourceTrajectoryStepInfo?.stepIndex;
      if (typeof srcIdx === 'number' && Number.isInteger(srcIdx) && srcIdx >= 0) return srcIdx;
      for (const k of ['stepIndex', 'startStepIndex', 'firstStepIndex', 'index']) {
        const v = obj[k];
        if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v;
      }
      if (Array.isArray(obj.stepIndices) && obj.stepIndices.length > 0) {
        const valid = obj.stepIndices.filter((n) => Number.isInteger(n) && n >= 0);
        if (valid.length > 0) return Math.min(...valid);
      }
      return -1;
    };

    for (let d = 0; d < 6 && fEl; d++) {
      const fk = Object.keys(fEl).find((k) => k.startsWith('__reactFiber$'));
      let f = fk ? fEl[fk] : null;
      for (let fd = 0; fd < 16 && f; fd++) {
        const p = f.memoizedProps || f.pendingProps;
        if (p && typeof p === 'object') {
          if (!foundCascadeId && typeof p.cascadeId === 'string' && p.cascadeId) {
            foundCascadeId = p.cascadeId;
          }
          if (foundStepIdx < 0) {
            const directIdx = readStepIndexFromObj(p);
            if (directIdx >= 0) foundStepIdx = directIdx;
          }
          if (!foundContainer && p.container && Array.isArray(p.container.steps)) {
            foundContainer = p.container;
            if (!foundCascadeId && typeof p.container.cascadeId === 'string') {
              foundCascadeId = p.container.cascadeId;
            }
            if (foundStepIdx < 0) {
              const cIdx = readStepIndexFromObj(p.container);
              if (cIdx >= 0) foundStepIdx = cIdx;
            }
            let hasCheckpoint = false;
            let hasPlannerResp = false;
            let checkpointStepIdx = -1;
            for (const s of p.container.steps) {
              const sIdx = readStepIndexFromObj(s);
              if (foundStepIdx < 0 && sIdx >= 0) foundStepIdx = sIdx;
              if (s?.step?.case === 'checkpoint') {
                hasCheckpoint = true;
                if (sIdx >= 0) checkpointStepIdx = sIdx;
              } else if (s?.step?.case === 'plannerResponse') {
                hasPlannerResp = true;
              }
              if (foundStepTimeSec === 0 && s?.metadata?.createdAt && typeof usageCore.tsSec === 'function') {
                const sec = usageCore.tsSec(s.metadata.createdAt);
                if (sec > 0) foundStepTimeSec = sec;
              }
            }
            return {
              container: foundContainer,
              cascadeId: foundCascadeId,
              stepIndex: foundStepIdx,
              stepTimeSec: foundStepTimeSec,
              isCheckpointOnly: hasCheckpoint && !hasPlannerResp,
              checkpointStepIdx,
            };
          }
        }
        f = f.return;
      }
      fEl = fEl.parentElement;
    }
    if (foundCascadeId || foundStepIdx >= 0 || foundStepTimeSec > 0) {
      return {
        container: null,
        cascadeId: foundCascadeId,
        stepIndex: foundStepIdx,
        stepTimeSec: foundStepTimeSec,
      };
    }
    return null;
  }

  function summarizeFiberSteps(steps, fallbackModel, prevCtxUsed) {
    let ctxUsed = 0;
    let outSum = 0;
    let thinkSum = 0;
    let lastIn = 0;
    let lastCr = 0;
    let toolCalls = 0;
    let llmCalls = 0;
    for (const s of steps) {
      const sc = s?.step?.case;
      const mu = s?.metadata?.modelUsage || s?.step?.value?.metadata?.modelUsage;
      if (mu) {
        const inp = Number(mu.inputTokens || 0);
        const cr = Number(mu.cacheReadTokens || 0);
        const out = Number(mu.outputTokens || 0);
        if (inp + cr > 0) {
          ctxUsed = inp + cr;
          lastIn = inp;
          lastCr = cr;
          llmCalls++;
        }
        outSum += out;
      }
      if (sc === 'plannerResponse') {
        const th = s?.step?.value?.thinking || '';
        if (th && typeof usageCore.estimateTextTokens === 'function') {
          thinkSum += usageCore.estimateTextTokens(th).tokens;
        }
      } else if (sc && sc !== 'userInput' && sc !== 'systemMessage' && sc !== 'checkpoint') {
        toolCalls++;
      }
    }
    const promptTot = lastIn + lastCr;
    const cacheHitPct = promptTot > 0 ? Math.round((lastCr / promptTot) * 100) : 0;
    const ctxDelta = prevCtxUsed > 0 && ctxUsed > 0 ? ctxUsed - prevCtxUsed : ctxUsed;
    return {
      model: fallbackModel || 'Model',
      ctxUsed,
      ctxDelta,
      output: outSum,
      thinking: thinkSum,
      toolCalls,
      calls: llmCalls,
      speed: 0,
      cacheHitPct,
      subagentCount: 0,
      subagentCalls: 0,
      subagentTokens: 0,
    };
  }

  function syncTurnBadges(data) {
    if (cfg.turnBadges === false || !data || !Array.isArray(data.turnDetails) || data.turnDetails.length === 0) {
      clearTurnBadges();
      return;
    }
    const lang = getLang();
    const ui = uiText(lang);
    const cv = document.querySelector('[data-testid="conversation-view"]');
    if (!cv) {
      clearTurnBadges();
      return;
    }
    const allResps = Array.from(cv.querySelectorAll('[data-testid="agent-response"]'));
    if (allResps.length === 0) {
      clearTurnBadges();
      return;
    }

    // Build DOM turn-group map from [data-testid="user-input-step"] boundaries in main conversation
    const mainFlowNodes = Array.from(
      cv.querySelectorAll('[data-testid="user-input-step"], [data-testid="agent-response"]')
    ).filter((el) => !el.closest('[data-testid="subagent-tab-conversation"]'));
    const hasDomUserSteps = mainFlowNodes.some((el) => el.matches('[data-testid="user-input-step"]'));
    const domTurnGroupByResp = new Map();
    if (hasDomUserSteps) {
      let currentGroup = 0;
      for (const node of mainFlowNodes) {
        if (node.matches('[data-testid="user-input-step"]')) {
          currentGroup++;
        } else {
          domTurnGroupByResp.set(node, currentGroup);
        }
      }
    }

    // Group responses by cascadeId and deduplicate multi-response turns (keeping the last response host per turn)
    const rawMainTargets = [];
    const mainByContainer = new Map();
    const mainByDomGroup = new Map();
    const otherTargets = [];
    const otherByContainer = new Map();

    for (const resp of allResps) {
      const host = resp.closest('[data-turn-content]') || resp.parentElement || resp;
      const fiberInfo = extractFiberTurnContainer(resp);
      const inSubagentPane = Boolean(resp.closest('[data-testid="subagent-tab-conversation"]'));
      const isMain =
        !inSubagentPane &&
        (!fiberInfo || !fiberInfo.cascadeId || !data.cascadeId || sameCascadeId(fiberInfo.cascadeId, data.cascadeId));
      const item = {
        host,
        resp,
        fiberInfo,
        domTurnGroup: hasDomUserSteps && domTurnGroupByResp.has(resp) ? domTurnGroupByResp.get(resp) : -1,
      };

      if (isMain) {
        const containerRef = fiberInfo && fiberInfo.container ? fiberInfo.container : null;
        if (containerRef && mainByContainer.has(containerRef)) {
          const existing = mainByContainer.get(containerRef);
          existing.host = host;
          existing.resp = resp;
          if (fiberInfo && fiberInfo.stepIndex >= 0 && existing.fiberInfo.stepIndex < 0) {
            existing.fiberInfo = fiberInfo;
          }
          continue;
        }
        if (item.domTurnGroup >= 0 && mainByDomGroup.has(item.domTurnGroup)) {
          const existing = mainByDomGroup.get(item.domTurnGroup);
          existing.host = host;
          existing.resp = resp;
          if (containerRef && !existing.fiberInfo?.container) {
            existing.fiberInfo = fiberInfo;
          }
          if (containerRef) mainByContainer.set(containerRef, existing);
          continue;
        }
        rawMainTargets.push(item);
        if (containerRef) mainByContainer.set(containerRef, item);
        if (item.domTurnGroup >= 0) mainByDomGroup.set(item.domTurnGroup, item);
      } else {
        const containerRef = fiberInfo && fiberInfo.container ? fiberInfo.container : null;
        if (containerRef && otherByContainer.has(containerRef)) {
          const existing = otherByContainer.get(containerRef);
          existing.host = host;
          existing.resp = resp;
          continue;
        }
        otherTargets.push(item);
        if (containerRef) otherByContainer.set(containerRef, item);
      }
    }

    // Deduplicate any adjacent targets that share the exact same host element
    const mainTargets = [];
    const seenMainHosts = new Set();
    for (let i = rawMainTargets.length - 1; i >= 0; i--) {
      const item = rawMainTargets[i];
      if (seenMainHosts.has(item.host)) continue;
      seenMainHosts.add(item.host);
      mainTargets.push(item);
    }
    mainTargets.reverse();

    const turns = data.turnDetails;
    const activeSet = new Set();

    const renderBadgeOnHost = (host, t) => {
      if (!host || !t) return;
      let bar = host.querySelector(':scope > .ag-cs-turn-bar') || host.querySelector('.ag-cs-turn-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'ag-cs-turn-bar';
        bar.setAttribute('data-ag-no-i18n', '');
        bar.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const latest = activeTrajCache.get(data.cascadeId)?.data || data;
          openContextPopover(bar, latest, 'turns');
        });
        host.appendChild(bar);
      }
      activeSet.add(bar);

      const dSign = t.ctxDelta >= 0 ? '+' : '-';
      const dCls = t.ctxDelta >= 15000 ? 'is-high' : t.ctxDelta >= 5000 ? 'is-mid' : 'is-low';
      const shortModel = String(t.model || data.lastModel || '').replace(/\s*\([^)]*\)\s*/g, '').trim() || 'Model';
      const barKey = `${t.turn}|${t.ctxUsed}|${t.ctxDelta}|${t.output}|${t.thinking}|${t.toolCalls || 0}|${t.speed}|${t.cacheHitPct}|${t.subagentCalls}|${lang}`;
      if (bar.getAttribute('data-ag-cs-turn-key') !== barKey) {
        bar.setAttribute('data-ag-cs-turn-key', barKey);
        bar.innerHTML = `
          <span class="ag-cs-tb-idx">#T${t.turn}</span>
          <span class="ag-cs-tb-model">${escapeHtml(shortModel)}</span>
          <span class="ag-cs-tb-sep">·</span>
          <span class="ag-cs-tb-item">${escapeHtml(ui.ctxShort || 'Ctx')} <strong>${formatCompactK(t.ctxUsed)}</strong></span>
          <span class="ag-cs-tb-delta ${dCls}">${dSign}${formatCompactK(Math.abs(t.ctxDelta))}</span>
          <span class="ag-cs-tb-sep">·</span>
          <span class="ag-cs-tb-item">${escapeHtml(ui.outShort || 'Out')} <strong>${formatCompactK(t.output)}</strong></span>
          ${t.thinking > 0 ? `<span class="ag-cs-tb-item is-think">${escapeHtml(ui.thinkShort || 'Think')} ${formatCompactK(t.thinking)}</span>` : ''}
          ${t.toolCalls > 0 ? `<span class="ag-cs-tb-item">🔧 ×${t.toolCalls}</span>` : ''}
          ${t.subagentCalls > 0 ? `<span class="ag-cs-tb-sub">🤖 ×${t.subagentCount || t.subagentCalls} (${formatCompactK(t.subagentTokens)})</span>` : ''}
          ${t.speed > 0 ? `<span class="ag-cs-tb-item">⚡ ${t.speed} tok/s</span>` : ''}
          <span class="ag-cs-tb-item">${escapeHtml(ui.cacheShort || 'Cache')} ${t.cacheHitPct}%</span>
        `;
      }
    };

    const renderCheckpointBadgeOnHost = (host, cp) => {
      if (!host || !cp) return;
      let bar = host.querySelector(':scope > .ag-cs-turn-bar') || host.querySelector('.ag-cs-turn-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'ag-cs-turn-bar';
        bar.setAttribute('data-ag-no-i18n', '');
        bar.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const latest = activeTrajCache.get(data.cascadeId)?.data || data;
          openContextPopover(bar, latest, 'breakdown');
        });
        host.appendChild(bar);
      }
      activeSet.add(bar);

      const isZh = lang === 'zh-CN' || lang === 'zh-TW' || lang === 'yue';
      const label = isZh ? '会话已压缩' : lang === 'ja' ? '会話圧縮済み' : 'Compacted';
      const afterPrefix = cp.isEstimated ? '~' : '';
      const beforeStr = cp.beforeCtx > 0 ? formatCompactK(cp.beforeCtx) : '';
      const afterStr = `${afterPrefix}${formatCompactK(cp.afterCtx || 0)}`;
      const savedStr = cp.savedTokens > 0 ? `-${formatCompactK(cp.savedTokens)}` : '';
      const barKey = `cp|${cp.stepIdx}|${cp.beforeCtx}|${cp.afterCtx}|${cp.savedTokens}|${cp.isEstimated ? 1 : 0}|${lang}`;
      if (bar.getAttribute('data-ag-cs-turn-key') !== barKey) {
        bar.setAttribute('data-ag-cs-turn-key', barKey);
        bar.innerHTML = `
          <span class="ag-cs-tb-idx">🗜️ ${escapeHtml(label)}</span>
          <span class="ag-cs-tb-sep">·</span>
          <span class="ag-cs-tb-item">${escapeHtml(ui.ctxShort || 'Ctx')} ${beforeStr ? `${beforeStr} → ` : ''}<strong>${afterStr}</strong></span>
          ${savedStr ? `<span class="ag-cs-tb-delta is-low">${savedStr}</span>` : ''}
        `;
      }
    };

    const checkpointList = Array.isArray(data.checkpoints) ? data.checkpoints : [];
    const checkpointTargets = [];
    const turnTargets = [];
    for (const target of mainTargets) {
      if (target.fiberInfo?.isCheckpointOnly) {
        checkpointTargets.push(target);
      } else {
        turnTargets.push(target);
      }
    }

    const hasIndexedTurns = turns.some((td) => td.userStepIdx >= 0);
    const matchTurnByFiber = (fiberInfo) => {
      if (!fiberInfo) return null;
      if (typeof fiberInfo.stepIndex === 'number' && fiberInfo.stepIndex >= 0 && hasIndexedTurns) {
        for (let i = 0; i < turns.length; i++) {
          const td = turns[i];
          if (td.userStepIdx >= 0 && fiberInfo.stepIndex >= td.userStepIdx && fiberInfo.stepIndex < td.nextUserStepIdx) {
            return td;
          }
        }
        return null;
      }
      if (typeof fiberInfo.stepTimeSec === 'number' && fiberInfo.stepTimeSec > 0) {
        let best = null;
        for (let i = 0; i < turns.length; i++) {
          const td = turns[i];
          if (
            td.startTimeSec > 0 &&
            fiberInfo.stepTimeSec >= td.startTimeSec - 2 &&
            (!Number.isFinite(td.nextStartTimeSec) || fiberInfo.stepTimeSec < td.nextStartTimeSec - 1)
          ) {
            best = td;
          }
        }
        if (best) return best;
      }
      return null;
    };

    // Prefer exact Fiber step/timestamp binding; keep only the final host per turn
    const turnToHost = new Map();
    const matchedTargets = turnTargets.map((target) => ({ target, turn: matchTurnByFiber(target.fiberInfo) }));
    const anyFiberMatched = matchedTargets.some((m) => m.turn !== null);

    if (anyFiberMatched && matchedTargets.every((m) => m.turn !== null)) {
      for (const m of matchedTargets) {
        turnToHost.set(m.turn.turn, { host: m.target.host, turn: m.turn });
      }
    } else if (anyFiberMatched) {
      const usedTurnIds = new Set();
      for (const m of matchedTargets) {
        if (m.turn) {
          turnToHost.set(m.turn.turn, { host: m.target.host, turn: m.turn });
          usedTurnIds.add(m.turn.turn);
        }
      }
      const remainingTargets = matchedTargets
        .filter((m) => {
          if (m.turn) return false;
          const fi = m.target.fiberInfo;
          // If Fiber already has an exact stepIndex or timestamp that matched no turn,
          // this DOM node is a non-LLM step (e.g. /compact checkpoint) — never attach a stale historical turn.
          if (fi && hasIndexedTurns && typeof fi.stepIndex === 'number' && fi.stepIndex >= 0) return false;
          if (fi && typeof fi.stepTimeSec === 'number' && fi.stepTimeSec > 0) return false;
          return true;
        })
        .map((m) => m.target);
      const remainingTurns = turns.filter((t) => !usedTurnIds.has(t.turn));
      const count = Math.min(remainingTargets.length, remainingTurns.length);
      for (let i = 0; i < count; i++) {
        const target = remainingTargets[remainingTargets.length - count + i];
        const t = remainingTurns[remainingTurns.length - count + i];
        if (target && t) turnToHost.set(t.turn, { host: target.host, turn: t });
      }
    } else {
      const count = Math.min(turnTargets.length, turns.length);
      for (let i = 0; i < count; i++) {
        const target = turnTargets[turnTargets.length - count + i];
        const t = turns[turns.length - count + i];
        if (target && t) turnToHost.set(t.turn, { host: target.host, turn: t });
      }
    }

    for (const entry of turnToHost.values()) {
      renderBadgeOnHost(entry.host, entry.turn);
    }

    if (checkpointTargets.length > 0 && checkpointList.length > 0) {
      for (let i = 0; i < checkpointTargets.length; i++) {
        const target = checkpointTargets[i];
        const cpIdx = target.fiberInfo?.checkpointStepIdx ?? -1;
        const cp =
          (cpIdx >= 0 ? checkpointList.find((c) => c.stepIdx === cpIdx) : null) ||
          checkpointList[Math.min(i, checkpointList.length - 1)] ||
          checkpointList[checkpointList.length - 1];
        if (cp) renderCheckpointBadgeOnHost(target.host, cp);
      }
    }

    // Also render badges for any subagent conversation turns visible in DOM
    let prevSubCtx = 0;
    for (let i = 0; i < otherTargets.length; i++) {
      const target = otherTargets[i];
      const steps = target.fiberInfo?.container?.steps;
      if (Array.isArray(steps) && steps.length > 0) {
        const fb = summarizeFiberSteps(steps, data.lastModel, prevSubCtx);
        if (fb.ctxUsed > 0 || fb.output > 0) {
          prevSubCtx = fb.ctxUsed;
          renderBadgeOnHost(target.host, { ...fb, turn: i + 1 });
        }
      }
    }

    document.querySelectorAll('.ag-cs-turn-bar').forEach((b) => {
      if (!activeSet.has(b)) b.remove();
    });
  }

  function syncSurroundHud(card, footer, data) {
    const inputBox = card?.closest?.('[data-testid="agent-input-box"]');
    const composerShell = card?.closest?.('#antigravity\\.agentSidePanelInputBox') || card?.parentElement;
    if (!inputBox || !card) return;
    const d = data || createEmptyConvoData('', getKnownMaxContextForCard(card, data));
    const lang = getLang();
    const ui = uiText(lang);
    const { ring, draftEst, activeQuota } = getRingTelemetryForCard(card, d);
    const totalW = ring.maxTokens || 256000;
    const pctOf = (v) => Math.max(0, Math.min(100, ((Number(v) || 0) / totalW) * 100)).toFixed(2);
    const chatMsgs =
      d.chatMsgTokens != null ? d.chatMsgTokens : Math.max(0, Number(d.msgTokens || 0) - Number(d.toolResultsTokens || 0));
    const topSpeed = Number(d.displaySpeed || d.lastSpeed || 0);

    // 1. Top HUD Bar (.ag-cs-hud-top-bar)
    let topBar = card.querySelector('.ag-cs-hud-top-bar');
    if (cfg.hudTopBar === true) {
      if (!topBar) {
        topBar = document.createElement('div');
        topBar.className = 'ag-cs-hud-top-bar';
        topBar.setAttribute('data-ag-no-i18n', '');
        topBar.addEventListener('click', (ev) => {
          if (ev.target && ev.target.closest && ev.target.closest('[data-hud-compact-btn]')) return;
          ev.stopPropagation();
          openContextPopover(topBar, resolveCardConvoData(card, d), 'breakdown');
        });
        card.insertBefore(topBar, card.firstChild);
      }
      const ctxRemPctRound = Math.round(ring.contextRemainingPct);
      const isLowCtx = Boolean((d.calls > 0 || ring.usedTokens > 0) && ring.contextRemainingPct <= 20);
      const lowCtxAttr = isLowCtx ? (ring.contextRemainingPct <= 10 ? 'danger' : 'warn') : '';
      if (lowCtxAttr) topBar.setAttribute('data-ctx-low', lowCtxAttr);
      else topBar.removeAttribute('data-ctx-low');
      const ctxColor = ctxRemPctRound <= 10 ? '#dc3c3d' : ctxRemPctRound <= 30 ? '#fbb315' : '#257de0';
      const topKey = `${ctxRemPctRound}|${lowCtxAttr}|${ring.remainingTokens}|${totalW}|${ring.usedTokens}|${d.sysTokens || 0}|${d.toolsTokens || 0}|${chatMsgs}|${d.toolResultsTokens || 0}|${d.overheadTokens || 0}|${draftEst.tokens}|${Math.round(d.cacheHitPct || 0)}|${topSpeed}|${lang}`;
      if (topBar.getAttribute('data-ag-cs-top-key') !== topKey) {
        topBar.setAttribute('data-ag-cs-top-key', topKey);
        topBar.innerHTML = `
          <div class="ag-cs-hud-top-track">
            <span style="width:${pctOf(d.sysTokens)}%;background:#3b82f6"></span>
            <span style="width:${pctOf(d.toolsTokens)}%;background:#a855f7"></span>
            <span style="width:${pctOf(chatMsgs)}%;background:#10b981"></span>
            <span style="width:${pctOf(d.toolResultsTokens)}%;background:#f59e0b"></span>
            ${Number(d.overheadTokens || 0) > 0 ? `<span style="width:${pctOf(d.overheadTokens)}%;background:#64748b"></span>` : ''}
            <span style="width:${pctOf(draftEst.tokens)}%;background:#ec4899"></span>
          </div>
          <div class="ag-cs-hud-top-row">
            <span class="ag-cs-hud-rem" style="color:${ctxColor}">${escapeHtml(ui.remShort || 'Rem')} ${ctxRemPctRound}% (${formatCompactK(ring.remainingTokens)} / ${formatCompactK(totalW)})</span>
            <span>${escapeHtml(ui.usedWord || 'Used')} ${formatCompactK(ring.usedTokens)}${draftEst.tokens > 0 ? ` +${formatCompactK(draftEst.tokens)}` : ''}</span>
            <span>${escapeHtml(ui.cacheShort || 'Cache')} ${Math.round(d.cacheHitPct || 0)}%</span>
            ${topSpeed > 0 ? `<span>⚡ ${topSpeed} tok/s</span>` : ''}
            <button type="button" class="ag-cs-hud-compact-btn"${lowCtxAttr ? ` data-ctx-low="${lowCtxAttr}"` : ''} data-hud-compact-btn="1">/compact</button>
          </div>
        `;
        const cBtn = topBar.querySelector('[data-hud-compact-btn]');
        if (cBtn) {
          cBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            fillCompactCommand(card);
          });
        }
      }
    } else if (topBar) {
      topBar.remove();
    }

    // 2. Bottom HUD Bar (.ag-cs-hud-bottom-bar)
    let botBar = card.querySelector('.ag-cs-hud-bottom-bar');
    if (cfg.hudBottomBar === true) {
      if (!botBar) {
        botBar = document.createElement('div');
        botBar.className = 'ag-cs-hud-bottom-bar';
        botBar.setAttribute('data-ag-no-i18n', '');
        botBar.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openContextPopover(botBar, resolveCardConvoData(card, d), 'turns');
        });
        card.appendChild(botBar);
      }
      const qPct = activeQuota && typeof activeQuota.effectiveRemainingPct === 'number' ? `${Math.round(activeQuota.effectiveRemainingPct)}%` : '';
      const botKey = `${d.totalTokens}|${d.turns}|${d.calls}|${d.totalOutput}|${d.subagentTokens}|${qPct}|${lang}`;
      if (botBar.getAttribute('data-ag-cs-bot-key') !== botKey) {
        botBar.setAttribute('data-ag-cs-bot-key', botKey);
        botBar.innerHTML = `
          <span>${escapeHtml(ui.sessionThroughput || 'Session')} <strong>${formatCompactK(d.totalTokens)}</strong></span>
          <span>${d.turns || d.calls} ${escapeHtml(ui.turnsUnit || 'turns')} / ${d.calls} ${escapeHtml(ui.callsUnit || 'calls')}</span>
          <span>${escapeHtml(ui.outShort || 'Out')} ${formatCompactK(d.totalOutput || 0)}</span>
          ${d.subagentCount > 0 ? `<span>🤖 ×${d.subagentCount} (${formatCompactK(d.subagentTokens)})</span>` : ''}
          ${qPct ? `<span>${escapeHtml(ui.modelQuotaRem || 'Quota Rem')} <strong>${qPct}</strong></span>` : ''}
        `;
      }
    } else if (botBar) {
      botBar.remove();
    }

    // 3. Rim Progress Border (data-ag-cs-rim on composerShell + proportional .ag-cs-hud-rim-progress)
    let rimBar = card.querySelector('.ag-cs-hud-rim-progress');
    if (cfg.hudRimProgress === true) {
      if (composerShell) {
        composerShell.setAttribute('data-ag-cs-rim', '1');
        composerShell.style.setProperty('--ag-cs-rim-color', ring.color);
      }
      const rimHost = card.querySelector(':scope > div.relative.w-full') || card;
      if (rimHost) {
        if (!rimBar || rimBar.parentElement !== rimHost) {
          rimBar?.remove();
          rimBar = document.createElement('div');
          rimBar.className = 'ag-cs-hud-rim-progress';
          rimBar.setAttribute('aria-hidden', 'true');
          rimBar.setAttribute('data-ag-no-i18n', '');
          const fill = document.createElement('span');
          fill.className = 'ag-cs-hud-rim-fill';
          rimBar.appendChild(fill);
          rimHost.appendChild(rimBar);
        }
        const fill = rimBar.firstElementChild;
        if (fill) {
          const usedPct = Math.max(2, Math.min(100, 100 - ring.pct));
          fill.style.width = `${usedPct.toFixed(1)}%`;
          fill.style.background = ring.color;
        }
      }
    } else {
      if (composerShell && composerShell.hasAttribute('data-ag-cs-rim')) {
        composerShell.removeAttribute('data-ag-cs-rim');
        composerShell.style.removeProperty('--ag-cs-rim-color');
      }
      if (rimBar) rimBar.remove();
    }

    // 4. Footer Chip (.ag-cs-hud-footer-chip)
    if (footer) {
      let chip = footer.querySelector('.ag-cs-hud-footer-chip');
      if (cfg.hudFooterChip === true) {
        if (!chip) {
          chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'ag-cs-hud-footer-chip';
          chip.setAttribute('data-ag-no-i18n', '');
          chip.addEventListener('click', (ev) => {
            ev.stopPropagation();
            openContextPopover(chip, resolveCardConvoData(card, d), 'quotas');
          });
          footer.appendChild(chip);
        }
        const chipTxt = `${ui.remShort || 'Rem'} ${ring.pctRound}% (${formatCompactK(ring.remainingTokens)})`;
        if (chip.textContent !== chipTxt) {
          chip.textContent = chipTxt;
          chip.style.setProperty('--ag-cs-chip-color', ring.color);
        }
      } else if (chip) {
        chip.remove();
      }
    }
  }

  // ── Interactive Thinking Effort Slider Popover (Claude Code & ChatGPT Performance) ──
  let openEffortPop = null;
  let openEffortAnchor = null;
  let openEffortModelBtn = null;
  let openEffortBadgeEl = null;
  let perfBackdropEl = null;
  let effortMatrixRaf = 0;
  let codexMotionRaf = 0;

  function cancelCodexMotionRaf() {
    if (codexMotionRaf) {
      cancelAnimationFrame(codexMotionRaf);
      codexMotionRaf = 0;
    }
  }

  function unmountPerfBackdrop() {
    if (perfBackdropEl && perfBackdropEl.parentElement) {
      perfBackdropEl.parentElement.removeChild(perfBackdropEl);
    }
    perfBackdropEl = null;
  }

  function syncPerfBackdrop(frameUrl, rgb, dark) {
    if (effortCore.normalizeEffortStyle(cfg.effortSliderStyle) !== 'liangwufeng' || cfg.performanceBackdrop !== 'page' || !openEffortPop || !openEffortPop.isConnected) {
      unmountPerfBackdrop();
      return;
    }
    let imgEl = perfBackdropEl?.querySelector?.('.ag-cs-perf-backdrop-img') || null;
    if (!perfBackdropEl || !perfBackdropEl.isConnected) {
      perfBackdropEl = document.createElement('div');
      perfBackdropEl.className = 'ag-cs-perf-backdrop';
      perfBackdropEl.setAttribute('aria-hidden', 'true');
      perfBackdropEl.setAttribute('data-ag-no-i18n', '');
      imgEl = document.createElement('div');
      imgEl.className = 'ag-cs-perf-backdrop-img';
      perfBackdropEl.appendChild(imgEl);
      document.body.appendChild(perfBackdropEl);
    }
    perfBackdropEl.setAttribute('data-perf-theme', dark ? 'dark' : 'light');
    const [r, g, b] = Array.isArray(rgb) ? rgb : [245, 165, 36];
    perfBackdropEl.style.backgroundImage = dark
      ? `radial-gradient(640px 380px at 82% 8%, rgba(${r},${g},${b},0.28), transparent 64%), radial-gradient(560px 360px at 14% 94%, rgba(${r},${g},${b},0.18), transparent 58%), linear-gradient(180deg, rgba(7,9,14,0.34), rgba(7,9,14,0.52))`
      : `radial-gradient(640px 380px at 82% 8%, rgba(${r},${g},${b},0.22), transparent 64%), radial-gradient(560px 360px at 14% 94%, rgba(${r},${g},${b},0.16), transparent 58%), linear-gradient(180deg, rgba(248,250,252,0.38), rgba(241,245,249,0.54))`;
    if (imgEl) {
      imgEl.style.backgroundImage = frameUrl ? `url("${frameUrl}")` : 'none';
    }
  }

  function closeEffortPopover() {
    if (effortMatrixRaf) {
      cancelAnimationFrame(effortMatrixRaf);
      effortMatrixRaf = 0;
    }
    cancelCodexMotionRaf();
    unmountPerfBackdrop();
    if (openEffortPop && openEffortPop.parentElement) {
      openEffortPop.parentElement.removeChild(openEffortPop);
    }
    openEffortPop = null;
    openEffortAnchor = null;
    openEffortModelBtn = null;
    openEffortBadgeEl = null;
  }

  function refreshOpenEffortPopover() {
    if (!openEffortPop || !openEffortPop.isConnected) return;
    renderEffortPopoverContent(openEffortPop, openEffortModelBtn, openEffortBadgeEl);
    positionEffortPopover(openEffortPop, openEffortAnchor || openEffortModelBtn);
    if (typeof openEffortPop._syncEffortKnob === 'function') {
      openEffortPop._syncEffortKnob(true);
    }
  }

  function resolveModelEffortContext(modelBtn, badgeEl) {
    const readLiveBadgeEffort = (el) => {
      if (!el) return '';
      const rawTxt = (el.textContent || '').trim();
      const parsed = effortCore.normalizeEffortBadgeText(rawTxt);
      if (parsed) return parsed;
      const attr = (el.getAttribute('data-ag-cs-effort') || '').trim().toLowerCase();
      if (attr) return attr;
      const btn = el.closest ? el.closest('[data-testid="model-selector-trigger"]') : null;
      const aria = btn ? btn.getAttribute('aria-label') || '' : '';
      return effortCore.parseModelLabelEffort(aria).effort || '';
    };
    let badgeEffort = readLiveBadgeEffort(badgeEl);
    if (!badgeEffort && modelBtn) {
      const foundBadge = modelBtn.querySelector('.ag-cs-effort-badge, [data-ag-cs-effort]');
      if (foundBadge) {
        badgeEffort = readLiveBadgeEffort(foundBadge);
      } else {
        const spans = modelBtn.querySelectorAll('span');
        const sub = spans.length >= 2 ? spans[spans.length - 1] : null;
        if (sub && sub.childElementCount === 0) {
          badgeEffort = readLiveBadgeEffort(sub);
        }
      }
    }
    let fiberProps = null;
    if (modelBtn) {
      const fk = Object.keys(modelBtn).find((k) => k.startsWith('__reactFiber$'));
      for (let cur = fk && modelBtn[fk], d = 0; cur && d < 30; cur = cur.return, d++) {
        const mp = cur.memoizedProps;
        if (mp && Array.isArray(mp.modelOptions) && typeof mp.setSelectedModel === 'function') {
          fiberProps = mp;
          break;
        }
        if (mp && mp.value && Array.isArray(mp.value.modelOptions) && typeof mp.value.setSelectedModel === 'function') {
          fiberProps = mp.value;
          break;
        }
      }
    }

    const selectedLabel = fiberProps?.selectedModel?.label || getCurrentModelLabel(modelBtn?.closest?.('.surface-composer-card')) || '';
    const resolved = effortCore.resolveClaudeEffortSteps(fiberProps?.modelOptions, selectedLabel, badgeEffort);

    const commitSelection = (opt, effortId, effortDisplay, fullLabel, onHostResolved) => {
      const hasRealModelSetter = Boolean(opt && fiberProps && typeof fiberProps.setSelectedModel === 'function');
      if (hasRealModelSetter) {
        try {
          fiberProps.setSelectedModel(opt);
        } catch {}
      }
      const syncBadgeDom = () => {
        let targetBadge = badgeEl && badgeEl.isConnected ? badgeEl : null;
        if (!targetBadge && modelBtn) {
          targetBadge = modelBtn.querySelector('.ag-cs-effort-badge, [data-ag-cs-effort]');
          if (!targetBadge) {
            const spans = modelBtn.querySelectorAll('span');
            const sub = spans.length >= 2 ? spans[spans.length - 1] : null;
            if (sub && sub.childElementCount === 0) targetBadge = sub;
          }
        }
        let resolvedDisplay = effortDisplay;
        if (targetBadge) {
          if (!hasRealModelSetter) {
            targetBadge.textContent = ' ' + effortDisplay;
          } else if (effortId === 'xhigh' && /\bextra\b/i.test(targetBadge.textContent || '')) {
            resolvedDisplay = 'Extra';
          }
          const badgeLevel = String(resolvedDisplay || '').trim().toLowerCase() === 'extra' ? 'extra' : effortId;
          targetBadge.setAttribute('data-ag-cs-effort', badgeLevel);
          targetBadge.classList.add('ag-cs-effort-badge');
          openEffortAnchor = targetBadge;
          openEffortBadgeEl = targetBadge;
        }
        if (resolvedDisplay !== effortDisplay && typeof onHostResolved === 'function') {
          onHostResolved(resolvedDisplay);
        }
        if (modelBtn && !hasRealModelSetter) {
          const aria = modelBtn.getAttribute('aria-label') || '';
          if (aria) {
            modelBtn.setAttribute('aria-label', fullLabel || aria.replace(/\b(Low|Medium|High|XHigh|Max)\)?$/i, effortDisplay));
          }
        }
      };
      syncBadgeDom();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          syncBadgeDom();
          scheduleSync();
        });
      }
    };

    return {
      fiberProps,
      selectedLabel,
      badgeEffort,
      baseName: resolved.baseName,
      steps: resolved.steps,
      selectedIdx: resolved.selectedIdx,
      selectStep(step, onHostResolved) {
        if (!step) return;
        commitSelection(step.option, step.id, step.display, step.option?.label, onHostResolved);
      },
      selectPreset(preset, onHostResolved) {
        if (!preset) return;
        commitSelection(preset.option, preset.effort, preset.effortDisplay, preset.fullLabel, onHostResolved);
      },
    };
  }

  function paintEffortMatrixCanvas(canvas, activeStep, isApex, startTime, matrixState) {
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cssW = Math.max(180, Math.round(canvas.clientWidth || canvas.getBoundingClientRect().width || 232));
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const wDev = Math.round(cssW * dpr);
    const hDev = Math.round(effortCore.BAND_H * dpr);

    if (canvas.width !== wDev || canvas.height !== hDev) {
      canvas.width = wDev;
      canvas.height = hDev;
    }

    ctx.clearRect(0, 0, wDev, hDev);
    if (!isApex) return;

    if (!matrixState.field || matrixState.field.widthDev !== wDev || matrixState.field.dpr !== dpr) {
      matrixState.field = effortCore.solveField(wDev, dpr);
    }

    const blocks = matrixState.field.blocks;
    const dark = isDarkTheme();
    const accent =
      cfg.effortAccent === false
        ? dark
          ? [200, 200, 208]
          : [71, 85, 105]
        : dark
          ? activeStep?.rgb || [163, 89, 255]
          : [124, 58, 237];
    const flash =
      cfg.effortAccent === false
        ? dark
          ? [255, 255, 255]
          : [15, 23, 42]
        : dark
          ? [242, 232, 255]
          : [196, 181, 253];
    const reduced = motionReduced();
    const t = reduced ? 10 : Math.max(0, (performance.now() - startTime) / 1000);
    const rgb = [0, 0, 0];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.fade <= 0.004) continue;
      const phase = reduced ? 1 : effortCore.arrivalPhase(t, block.entrance);
      const rise = reduced ? 1 : effortCore.arrivalRise(phase);
      if (rise <= 0.004) continue;
      const glow = reduced ? 0 : effortCore.arrivalGlow(phase);
      const flashShare = effortCore.flashAt(block, t);
      const flow = effortCore.flowAt(block, t);
      effortCore.composeBlockColour(accent, flash, flashShare, glow, flow, rgb);
      const boost = Math.max(flashShare, flow, glow);
      const alpha = Math.max(0, Math.min(0.96, block.fade * rise * (0.3 + 0.64 * boost)));
      if (alpha <= 0.01) continue;
      ctx.fillStyle = `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha.toFixed(3)})`;
      ctx.fillRect(block.x, block.y, block.size, block.size);
    }
  }

  /**
   * Render the ChatGPT Codex effort slider popover (Microqian2th/dsh-codex-effort-slider style).
   */
  function renderCodexEffortPopover(pop, ctx, lang) {
    unmountPerfBackdrop();
    const ui = uiText(lang);
    const steps = ctx.steps || [];
    const count = steps.length;
    if (count <= 0) return;

    let currentIdx = Math.max(0, Math.min(count - 1, ctx.selectedIdx || 0));
    const initPct = effortCore.codexPctFromIndex(currentIdx, count);
    const motion = { x: initPct, v: 0, a: 0, target: initPct };
    let dragging = false;
    let pointerActive = false;
    let downClientX = 0;
    let snapTargetIdx = currentIdx;
    let shownIdx = currentIdx;
    let lastAt = performance.now();
    let starAnimCache = null;

    const particles = effortCore.CODEX_PARTICLES;
    const ticksHtml = steps
      .map(
        (s, idx) =>
          `<span class="ag-cs-codex-tick" data-tick-idx="${idx}" data-on="${idx <= currentIdx ? '1' : '0'}" style="left:${effortCore.codexKnobOffsetOf(effortCore.codexPctFromIndex(idx, count))}" title="${escapeHtml(s.display)}"></span>`
      )
      .join('');

    const starsHtml = particles
      .map((p, idx) => {
        const dur = effortCore.codexStarDurationFor(idx);
        const delay = effortCore.codexStarDelayFor(idx, dur, particles);
        const bright = effortCore.codexStarBrightnessFor(idx);
        return `<span class="ag-cs-codex-star" style="top:${p.y.toFixed(3)}%;animation-duration:${dur.toFixed(3)}s;animation-delay:${delay.toFixed(3)}s"><span class="ag-cs-codex-star-dot" style="--ag-cs-codex-b:${bright.toFixed(3)};opacity:0"></span></span>`;
      })
      .join('');

    const initStep = steps[currentIdx] || steps[0];
    const effortTitle = escapeHtml(ui.effortTitle || 'Reasoning effort');
    pop.innerHTML = `
      <div class="ag-cs-codex-head">
        <span class="ag-cs-codex-title">${effortTitle}</span>
        <span class="ag-cs-codex-value">${escapeHtml(initStep.display)}</span>
      </div>
      <div class="ag-cs-codex-track" role="slider" tabindex="0" aria-label="${effortTitle}" aria-valuemin="0" aria-valuemax="${Math.max(0, count - 1)}" aria-valuenow="${currentIdx}" aria-valuetext="${escapeHtml(initStep.display)}">
        <div class="ag-cs-codex-fill"></div>
        <div class="ag-cs-codex-energy"><div class="ag-cs-codex-sweep"></div></div>
        <div class="ag-cs-codex-stars">${starsHtml}</div>
        ${ticksHtml}
        <div class="ag-cs-codex-knob"></div>
      </div>
    `;

    const valEl = pop.querySelector('.ag-cs-codex-value');
    const track = pop.querySelector('.ag-cs-codex-track');
    const fillEl = pop.querySelector('.ag-cs-codex-fill');
    const energyEl = pop.querySelector('.ag-cs-codex-energy');
    const starsEl = pop.querySelector('.ag-cs-codex-stars');
    const knobEl = pop.querySelector('.ag-cs-codex-knob');
    const tickEls = Array.from(pop.querySelectorAll('.ag-cs-codex-tick'));
    const starTrackEls = Array.from(pop.querySelectorAll('.ag-cs-codex-star'));
    const starDotEls = Array.from(pop.querySelectorAll('.ag-cs-codex-star-dot'));

    const updateStarRates = (pct) => {
      const rate = motionReduced()
        ? Math.max(0.25, effortCore.codexSpeedFor(pct) / 2.6)
        : effortCore.codexSpeedFor(pct);
      if (!starAnimCache) {
        starAnimCache = starTrackEls.map((el) => {
          try {
            const list = typeof el.getAnimations === 'function' ? el.getAnimations() : [];
            return list && list.length > 0 ? list : null;
          } catch {
            return null;
          }
        });
      }
      for (let i = 0; i < starAnimCache.length; i += 1) {
        const anims = starAnimCache[i];
        if (!anims) continue;
        for (let a = 0; a < anims.length; a += 1) {
          try {
            anims[a].playbackRate = rate;
          } catch {}
        }
      }
    };

    const resolveKnobOffset = (pct) => {
      const trackW = track ? track.clientWidth || 0 : 0;
      if (trackW > effortCore.CODEX_KNOB_SIZE) {
        const px = effortCore.CODEX_KNOB_RADIUS + effortCore.codexClamp01(pct) * (trackW - effortCore.CODEX_KNOB_SIZE);
        return `${px.toFixed(2)}px`;
      }
      return effortCore.codexKnobOffsetOf(pct);
    };

    const applyShown = (shownPct, displayIdx) => {
      const clampedPct = effortCore.codexClamp01(shownPct);
      const safeIdx = Math.max(0, Math.min(count - 1, displayIdx));
      const st = steps[safeIdx] || steps[0];
      const energy = effortCore.codexEnergyFor(clampedPct);
      const knobOffset = resolveKnobOffset(clampedPct);

      pop.setAttribute('data-energy', energy > 0 ? '1' : '0');
      pop.style.setProperty('--ag-cs-codex-energy', String(energy));

      if (fillEl) {
        fillEl.style.width = knobOffset;
        fillEl.style.background = effortCore.codexFillBackgroundFor(clampedPct);
      }
      if (energyEl) {
        energyEl.style.width = knobOffset;
      }
      if (starsEl) {
        starsEl.style.width = knobOffset;
        starsEl.style.opacity = effortCore.codexStarLayerOpacityFor(clampedPct).toFixed(3);
      }
      if (knobEl) {
        knobEl.style.left = knobOffset;
      }

      const progress = effortCore.codexStarProgressFor(clampedPct, count);
      const glow = 0.45 + 0.55 * progress;
      for (let s = 0; s < starDotEls.length; s += 1) {
        const dot = starDotEls[s];
        const reveal = effortCore.codexParticleReveal(s, progress, starDotEls.length);
        const bright = effortCore.codexStarBrightnessFor(s) * glow;
        dot.style.setProperty('--ag-cs-codex-b', bright.toFixed(3));
        dot.style.opacity = reveal.toFixed(3);
      }
      updateStarRates(clampedPct);

      for (let t = 0; t < tickEls.length; t += 1) {
        tickEls[t].setAttribute('data-on', t <= safeIdx ? '1' : '0');
      }
      if (valEl && st) {
        if (valEl.textContent !== st.display) valEl.textContent = st.display;
        valEl.style.color = effortCore.codexValueColorFor(clampedPct, st);
      }
      if (track && st) {
        track.setAttribute('aria-valuenow', String(safeIdx));
        track.setAttribute('aria-valuetext', st.display);
      }
    };

    const runMotionLoop = () => {
      cancelCodexMotionRaf();
      const tick = (now) => {
        if (!pop.isConnected || openEffortPop !== pop) {
          codexMotionRaf = 0;
          return;
        }
        const dt = Math.min(0.05, Math.max(0.001, (now - lastAt) / 1000));
        lastAt = now;
        effortCore.codexMotionStep(motion, dt);
        shownIdx = dragging ? effortCore.codexIndexFromPct(motion.x, count) : snapTargetIdx;
        applyShown(motion.x, shownIdx);
        if (!effortCore.codexMotionSettled(motion) && !motionReduced()) {
          codexMotionRaf = requestAnimationFrame(tick);
        } else {
          motion.x = motion.target;
          motion.v = 0;
          motion.a = 0;
          shownIdx = snapTargetIdx;
          applyShown(motion.target, snapTargetIdx);
          codexMotionRaf = 0;
        }
      };
      lastAt = performance.now();
      codexMotionRaf = requestAnimationFrame(tick);
    };

    const setTarget = (targetPct, nextIdx, commit) => {
      const clampedTarget = effortCore.codexClamp01(targetPct);
      const boundedIdx = Math.max(0, Math.min(count - 1, nextIdx));
      snapTargetIdx = boundedIdx;
      motion.target = clampedTarget;

      if (commit) {
        currentIdx = boundedIdx;
        const st = steps[boundedIdx];
        if (st) {
          ctx.selectStep(st, (resolvedDisplay) => {
            if (!pop.isConnected || openEffortPop !== pop) return;
            if (resolvedDisplay && valEl && resolvedDisplay !== valEl.textContent) {
              valEl.textContent = resolvedDisplay;
            }
          });
        }
      }

      const trackW = track ? track.clientWidth || 0 : 0;
      if (motionReduced() || trackW <= 0 || typeof requestAnimationFrame !== 'function') {
        cancelCodexMotionRaf();
        motion.x = clampedTarget;
        motion.v = 0;
        motion.a = 0;
        shownIdx = boundedIdx;
        applyShown(clampedTarget, boundedIdx);
      } else {
        shownIdx = boundedIdx;
        applyShown(motion.x, boundedIdx);
        runMotionLoop();
      }
    };

    pop._syncEffortKnob = () => applyShown(motion.x, shownIdx);
    applyShown(initPct, currentIdx);

    if (track) {
      const pctFromClientX = (clientX) => {
        const r = track.getBoundingClientRect();
        const trackW = track.clientWidth || r.width || 1;
        const zoomScale = trackW > 0 && r.width > 0 ? r.width / trackW : 1;
        const localX = (clientX - r.left) / (zoomScale || 1);
        const usable = Math.max(1, trackW - effortCore.CODEX_KNOB_SIZE);
        return effortCore.codexClamp01((localX - effortCore.CODEX_KNOB_RADIUS) / usable);
      };

      track.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        ev.stopPropagation();
        pointerActive = true;
        dragging = false;
        downClientX = ev.clientX;
        try {
          track.setPointerCapture(ev.pointerId);
        } catch {}
        const pct = pctFromClientX(ev.clientX);
        const idx = effortCore.codexIndexFromPct(pct, count);
        setTarget(pct, idx, false);
      });

      track.addEventListener('pointermove', (ev) => {
        if (!pointerActive) return;
        if (!dragging && Math.abs(ev.clientX - downClientX) >= effortCore.DRAG_THRESHOLD_PX) {
          dragging = true;
          track.classList.add('is-dragging');
        }
        if (!dragging) return;
        const pct = pctFromClientX(ev.clientX);
        const idx = effortCore.codexIndexFromPct(pct, count);
        setTarget(pct, idx, false);
      });

      const finishPointer = (ev) => {
        if (!pointerActive) return;
        pointerActive = false;
        dragging = false;
        track.classList.remove('is-dragging');
        const pct = pctFromClientX(ev.clientX);
        const idx = effortCore.codexIndexFromPct(pct, count);
        setTarget(effortCore.codexPctFromIndex(idx, count), idx, true);
      };

      track.addEventListener('pointerup', finishPointer);
      track.addEventListener('pointercancel', finishPointer);
      track.addEventListener('keydown', (ev) => {
        let next = -1;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') next = Math.min(count - 1, currentIdx + 1);
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') next = Math.max(0, currentIdx - 1);
        else if (ev.key === 'Home') next = 0;
        else if (ev.key === 'End') next = count - 1;
        if (next >= 0) {
          ev.preventDefault();
          setTarget(effortCore.codexPctFromIndex(next, count), next, true);
        }
      });
    }
  }

  function renderEffortPopoverContent(pop, modelBtn, badgeEl) {
    if (effortMatrixRaf) {
      cancelAnimationFrame(effortMatrixRaf);
      effortMatrixRaf = 0;
    }
    cancelCodexMotionRaf();
    const lang = getLang();
    const ui = uiText(lang);
    const dark = isDarkTheme();
    const styleMode = effortCore.normalizeEffortStyle(cfg.effortSliderStyle);
    const ctx = resolveModelEffortContext(modelBtn, badgeEl);
    pop.setAttribute('data-effort-style', styleMode);
    pop.setAttribute('data-effort-theme', dark ? 'dark' : 'light');
    pop.setAttribute('data-perf-theme', dark ? 'dark' : 'light');
    pop._syncEffortKnob = null;

    if (styleMode === 'claude') {
      unmountPerfBackdrop();
      let currentIdx = ctx.selectedIdx;
      const count = ctx.steps.length;
      const maxIdx = Math.max(1, count - 1);
      let currentProgress = currentIdx / maxIdx;
      let matrixStartTime = performance.now();
      const matrixState = { field: null };
      let swapClearTimer = null;

      const step = ctx.steps[currentIdx] || ctx.steps[0];
      const isApex = currentIdx === count - 1;
      const pct = effortCore.computeEffortTintPercent(count, currentIdx);
      pop.style.setProperty('--ag-cs-effort-pct', (pct ?? 67) + '%');
      pop.style.setProperty('--ag-cs-effort-step-tint', step.tint);
      pop.style.setProperty('--ag-cs-effort-progress', currentProgress.toFixed(4));
      if (isApex) pop.setAttribute('data-effort-apex', '1');
      else pop.removeAttribute('data-effort-apex');

      const effortTitle = escapeHtml(ui.effortTitle || 'Reasoning effort');
      pop.innerHTML = `
        <div class="ag-cs-effort-head">
          <span class="ag-cs-effort-title">${effortTitle}</span>
          <span class="ag-cs-effort-value-slot">
            <span class="ag-cs-effort-value">${escapeHtml(step.display)}</span>
            <span class="ag-cs-effort-value-preview" aria-hidden="true"></span>
          </span>
        </div>
        <div class="ag-cs-effort-ends">
          <span>${escapeHtml(ui.effortFaster || 'Faster')}</span>
          <span>${escapeHtml(ui.effortSmarter || 'Smarter')}</span>
        </div>
        <div class="ag-cs-effort-track" role="slider" tabindex="0" aria-label="${effortTitle}" aria-valuemin="0" aria-valuemax="${maxIdx}" aria-valuenow="${currentIdx}" aria-valuetext="${escapeHtml(step.display)}">
          <div class="ag-cs-effort-groove">
            <div class="ag-cs-effort-fill"></div>
            <canvas class="ag-cs-effort-matrix"></canvas>
            <div class="ag-cs-effort-ticks">
              ${ctx.steps
                .map(
                  (s, idx) =>
                    `<span class="ag-cs-effort-tick${idx <= currentIdx ? ' is-reached' : ''}" style="left:calc(8px + ${(idx / maxIdx).toFixed(4)} * (100% - 16px))" data-tick-idx="${idx}" data-effort-id="${escapeHtml(s.id)}" title="${escapeHtml(s.display)}"></span>`
                )
                .join('')}
            </div>
          </div>
          <div class="ag-cs-effort-knob"></div>
        </div>
      `;

      const track = pop.querySelector('.ag-cs-effort-track');
      const slotEl = pop.querySelector('.ag-cs-effort-value-slot');
      const valEl = pop.querySelector('.ag-cs-effort-value');
      const previewEl = pop.querySelector('.ag-cs-effort-value-preview');
      const knobEl = pop.querySelector('.ag-cs-effort-knob');
      const canvas = pop.querySelector('.ag-cs-effort-matrix');
      const tickEls = Array.from(pop.querySelectorAll('.ag-cs-effort-tick'));

      const positionKnob = (prog, instant = false) => {
        if (!knobEl) return;
        const applyCoords = () => {
          const trackW = track ? (track.clientWidth || 0) : 0;
          const span = trackW > 16 ? trackW - 16 : 0;
          if (span > 0) {
            knobEl.style.left = '';
            knobEl.style.setProperty('--ag-cs-knob-x', `${(prog * span).toFixed(2)}px`);
          } else {
            knobEl.style.setProperty('--ag-cs-knob-x', '0px');
            knobEl.style.left = `calc(${prog.toFixed(4)} * (100% - 16px))`;
          }
        };
        if (instant) {
          knobEl.style.transition = 'none';
          applyCoords();
          if (knobEl.isConnected) void knobEl.offsetWidth;
          knobEl.style.transition = '';
        } else {
          applyCoords();
        }
      };
      pop._syncEffortKnob = (instant = false) => positionKnob(currentProgress, instant);

      const animateValueSwap = (prevIdx, nextIdx, nextText) => {
        if (!valEl) return;
        const prevText = valEl.textContent || '';
        if (prevText === nextText) return;
        if (slotEl && previewEl && !motionReduced() && prevIdx !== nextIdx) {
          previewEl.textContent = prevText;
          valEl.textContent = nextText;
          slotEl.removeAttribute('data-swap-dir');
          void slotEl.offsetWidth;
          slotEl.setAttribute('data-swap-dir', nextIdx > prevIdx ? 'up' : 'down');
          if (swapClearTimer) clearTimeout(swapClearTimer);
          swapClearTimer = setTimeout(() => {
            if (slotEl.isConnected) slotEl.removeAttribute('data-swap-dir');
          }, 170);
        } else {
          valEl.textContent = nextText;
        }
      };

      const stepLoop = () => {
        if (!pop.isConnected || openEffortPop !== pop) {
          effortMatrixRaf = 0;
          return;
        }
        const st = ctx.steps[currentIdx];
        const apex = currentIdx === count - 1;
        paintEffortMatrixCanvas(canvas, st, apex, matrixStartTime, matrixState);
        if (apex && !motionReduced()) {
          effortMatrixRaf = requestAnimationFrame(stepLoop);
        } else {
          effortMatrixRaf = 0;
        }
      };

      const updateVisual = (prog, idx, commit) => {
        const prevIdx = currentIdx;
        const wasApex = prevIdx === count - 1;
        currentProgress = Math.max(0, Math.min(1, prog));
        currentIdx = Math.max(0, Math.min(count - 1, idx));
        const st = ctx.steps[currentIdx];
        const apex = currentIdx === count - 1;
        const nextPct = effortCore.computeEffortTintPercent(count, currentIdx);
        pop.style.setProperty('--ag-cs-effort-pct', (nextPct ?? 67) + '%');
        pop.style.setProperty('--ag-cs-effort-step-tint', st.tint);
        pop.style.setProperty('--ag-cs-effort-progress', currentProgress.toFixed(4));
        if (apex) pop.setAttribute('data-effort-apex', '1');
        else pop.removeAttribute('data-effort-apex');
        animateValueSwap(prevIdx, currentIdx, st.display);
        positionKnob(currentProgress);
        if (track) {
          track.setAttribute('aria-valuenow', String(currentIdx));
          track.setAttribute('aria-valuetext', st.display);
        }
        tickEls.forEach((tk, i) => {
          if (i <= currentIdx) tk.classList.add('is-reached');
          else tk.classList.remove('is-reached');
        });
        if (apex && !wasApex) {
          matrixStartTime = performance.now();
        }
        paintEffortMatrixCanvas(canvas, st, apex, matrixStartTime, matrixState);
        if (apex && !effortMatrixRaf && !motionReduced()) {
          effortMatrixRaf = requestAnimationFrame(stepLoop);
        } else if (!apex && effortMatrixRaf) {
          cancelAnimationFrame(effortMatrixRaf);
          effortMatrixRaf = 0;
        }
        if (commit) {
          ctx.selectStep(st, (resolvedDisplay) => {
            if (!resolvedDisplay || ctx.steps[currentIdx] !== st) return;
            st.display = resolvedDisplay;
            if (valEl && valEl.isConnected) valEl.textContent = resolvedDisplay;
            if (track && track.isConnected) track.setAttribute('aria-valuetext', resolvedDisplay);
            if (tickEls[currentIdx]) tickEls[currentIdx].setAttribute('title', resolvedDisplay);
          });
        }
      };

      positionKnob(currentProgress, true);
      paintEffortMatrixCanvas(canvas, step, isApex, matrixStartTime, matrixState);
      if (isApex && !motionReduced()) {
        effortMatrixRaf = requestAnimationFrame(stepLoop);
      }

      let lastPointerCommitAt = 0;

      tickEls.forEach((tk) => {
        tk.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (ev.detail > 0 && performance.now() - lastPointerCommitAt < 300) return;
          const idx = Number(tk.getAttribute('data-tick-idx') || 0);
          updateVisual(idx / maxIdx, idx, true);
        });
      });

      if (track) {
        let pointerActive = false;
        let dragging = false;
        let downClientX = 0;
        let lastIdx = currentIdx;

        const resolvePointer = (clientX, applyDamping) => {
          const r = track.getBoundingClientRect();
          const span = Math.max(1, r.width - 16);
          const rawX = Math.max(0, Math.min(span, clientX - r.left - 8));
          const visualX = applyDamping ? effortCore.dampTravel(rawX, span, count) : rawX;
          const prog = visualX / span;
          const nearest = effortCore.nearestStepIndex(rawX, span, count);
          return { prog, nearest };
        };

        track.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          ev.stopPropagation();
          pointerActive = true;
          dragging = false;
          downClientX = ev.clientX;
          lastIdx = currentIdx;
          try {
            track.setPointerCapture(ev.pointerId);
          } catch {}
          const { prog, nearest } = resolvePointer(ev.clientX, true);
          lastIdx = nearest;
          updateVisual(prog, nearest, false);
        });
        track.addEventListener('pointermove', (ev) => {
          if (!pointerActive) return;
          if (!dragging && Math.abs(ev.clientX - downClientX) >= effortCore.DRAG_THRESHOLD_PX) {
            dragging = true;
            track.classList.add('is-dragging');
            knobEl?.setAttribute('data-dragging', '1');
          }
          if (!dragging) return;
          const { prog, nearest } = resolvePointer(ev.clientX, true);
          lastIdx = nearest;
          updateVisual(prog, nearest, false);
        });
        const finishDrag = (ev) => {
          if (!pointerActive) return;
          pointerActive = false;
          const wasDragging = dragging;
          dragging = false;
          track.classList.remove('is-dragging');
          knobEl?.removeAttribute('data-dragging');
          const { nearest } = resolvePointer(ev.clientX, false);
          const finalIdx = wasDragging ? lastIdx : nearest;
          lastPointerCommitAt = performance.now();
          updateVisual(finalIdx / maxIdx, finalIdx, true);
        };
        track.addEventListener('pointerup', finishDrag);
        track.addEventListener('pointercancel', finishDrag);
        track.addEventListener('keydown', (ev) => {
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            const next = Math.min(count - 1, currentIdx + 1);
            updateVisual(next / maxIdx, next, true);
          } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
            ev.preventDefault();
            const next = Math.max(0, currentIdx - 1);
            updateVisual(next / maxIdx, next, true);
          } else if (ev.key === 'Home') {
            ev.preventDefault();
            updateVisual(0, 0, true);
          } else if (ev.key === 'End') {
            ev.preventDefault();
            updateVisual(1, count - 1, true);
          }
        });
      }
    } else if (styleMode === 'chatgpt') {
      renderCodexEffortPopover(pop, ctx, lang);
    } else {
      // Liang Wufeng / Performance Slider style (mobius/dsh-performance-slider)
      const perfCtx = effortCore.resolvePerformancePresets(ctx.fiberProps?.modelOptions, ctx.selectedLabel, ctx.badgeEffort, lang);
      const presets = perfCtx.presets;
      const totalPresets = presets.length;
      const maxFrame = effortCore.PERF_FRAME_COUNT - 1;
      let currentIdx = perfCtx.activeIdx;
      let currentFrame = effortCore.frameForLevel(currentIdx, totalPresets);
      let isDragging = false;

      const activePreset = presets[currentIdx] || presets[0];
      const gridCols =
        totalPresets >= 2
          ? '0.5fr ' + (totalPresets > 2 ? '1fr '.repeat(totalPresets - 2) : '') + '0.5fr'
          : '1fr';

      pop.style.setProperty('--ag-cs-perf-color', activePreset.color);

      const composeCardBackdropCss = (frameUrl, aura, isDark) => {
        if (cfg.performanceBackdrop === 'card' && frameUrl) {
          return isDark
            ? `linear-gradient(180deg, rgba(7,9,14,0.68) 0%, rgba(7,9,14,0.20) 24%, rgba(7,9,14,0.24) 46%, rgba(7,9,14,0.62) 60%, rgba(7,9,14,0.82) 76%, rgba(7,9,14,0.92) 100%), url("${frameUrl}"), ${aura}`
            : `linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.26) 24%, rgba(248,250,252,0.32) 46%, rgba(248,250,252,0.68) 60%, rgba(241,245,249,0.86) 76%, rgba(241,245,249,0.95) 100%), url("${frameUrl}"), ${aura}`;
        }
        if (cfg.performanceBackdrop === 'page') {
          const auraStr = String(aura || '');
          const lgIdx = auraStr.lastIndexOf(', linear-gradient(');
          const softAura = lgIdx >= 0 ? auraStr.slice(0, lgIdx) : auraStr;
          return isDark
            ? `linear-gradient(180deg, rgba(14,17,24,0.24), rgba(14,17,24,0.42))${softAura ? ', ' + softAura : ''}`
            : `linear-gradient(180deg, rgba(255,255,255,0.38), rgba(241,245,249,0.52))${softAura ? ', ' + softAura : ''}`;
        }
        return isDark ? `${effortCore.PERF_SCRIM}, ${aura}` : `linear-gradient(180deg, rgba(255,255,255,0.48), rgba(241,245,249,0.68)), ${aura}`;
      };

      pop.innerHTML = `
        <div class="ag-cs-perf-card-bg" aria-hidden="true"></div>
        <div class="ag-cs-perf-head">
          <span class="ag-cs-perf-kicker">${escapeHtml(ui.perfKicker || 'PERFORMANCE')}</span>
          <span class="ag-cs-perf-meta">${escapeHtml(activePreset.modelShort)} · ${escapeHtml(activePreset.effortDisplay || activePreset.effort)} · frame ${String(currentFrame).padStart(2, '0')}</span>
        </div>
        <div class="ag-cs-perf-bar ag-cs-chatgpt-rail" role="slider" tabindex="0" aria-label="${escapeHtml(ui.perfSliderAria || 'Performance slider')}" aria-valuemin="0" aria-valuemax="${maxFrame}" aria-valuenow="${currentFrame}" aria-valuetext="${escapeHtml(activePreset.fullLabel)}">
          <div class="ag-cs-perf-thumb" style="left:calc(15px + ${(currentFrame / maxFrame).toFixed(4)} * (100% - 30px))"></div>
        </div>
        <div class="ag-cs-perf-ticks" style="grid-template-columns:${gridCols}">
          ${presets
            .map(
              (p, idx) => `
            <button type="button" class="ag-cs-perf-tick${idx === currentIdx ? ' is-active' : ''}" data-step-idx="${idx}" data-effort-id="${escapeHtml(p.effort)}" title="${escapeHtml(p.fullLabel)}">
              <span class="ag-cs-perf-tick-model">${escapeHtml(p.modelShort)}</span>
              <span class="ag-cs-perf-tick-effort">${escapeHtml(p.effortSubtitle)}</span>
            </button>`
            )
            .join('')}
        </div>
      `;

      const bgEl = pop.querySelector('.ag-cs-perf-card-bg');
      const metaEl = pop.querySelector('.ag-cs-perf-meta');
      const bar = pop.querySelector('.ag-cs-perf-bar');
      const thumb = pop.querySelector('.ag-cs-perf-thumb');
      const tickBtns = Array.from(pop.querySelectorAll('.ag-cs-perf-tick'));
      let hasCommittedStatus = false;
      let committedStatusText = '';

      const setPerfStatus = (txt) => {
        let statusEl = pop.querySelector('.ag-cs-perf-status');
        if (!txt) {
          if (statusEl) statusEl.remove();
          return;
        }
        if (!statusEl) {
          statusEl = document.createElement('div');
          statusEl.className = 'ag-cs-perf-status';
          pop.appendChild(statusEl);
        }
        statusEl.textContent = txt;
      };

      const applyVisual = (rawFrameFloat, idx, commit, draggingNow, showStatus = true) => {
        const clampedFloat = Math.max(0, Math.min(maxFrame, rawFrameFloat));
        const frameInt = Math.round(clampedFloat);
        currentFrame = frameInt;
        currentIdx = Math.max(0, Math.min(totalPresets - 1, idx));
        const preset = presets[currentIdx] || presets[0];
        const curDark = isDarkTheme();
        const color = draggingNow ? effortCore.interpolatePerfColor(clampedFloat) : preset.color;
        const aura = curDark ? preset.auraDark : preset.auraLight;
        const frameUrl = perfAssets?.frames?.[frameInt] || '';
        const cardBgCss = composeCardBackdropCss(frameUrl, aura, curDark);

        pop.setAttribute('data-effort-theme', curDark ? 'dark' : 'light');
        pop.setAttribute('data-perf-theme', curDark ? 'dark' : 'light');
        pop.style.setProperty('--ag-cs-perf-color', color);
        if (bgEl) bgEl.style.backgroundImage = cardBgCss;
        syncPerfBackdrop(frameUrl, preset.rgb, curDark);

        if (metaEl) {
          metaEl.textContent = `${preset.modelShort} · ${preset.effortDisplay || preset.effort} · frame ${String(frameInt).padStart(2, '0')}`;
        }
        if (thumb) {
          const prog = clampedFloat / maxFrame;
          thumb.style.left = `calc(15px + ${prog.toFixed(4)} * (100% - 30px))`;
        }
        if (bar) {
          bar.setAttribute('aria-valuenow', String(frameInt));
          bar.setAttribute('aria-valuetext', preset.fullLabel);
        }
        tickBtns.forEach((tb, i) => {
          tb.classList.toggle('is-active', i === currentIdx);
        });
        if (showStatus) {
          const frameStr = String(frameInt).padStart(2, '0');
          const txt = draggingNow
            ? typeof ui.perfPreviewStatus === 'function'
              ? ui.perfPreviewStatus(frameStr, preset.modelShort, preset.effortSubtitle, preset.fullLabel)
              : `Frame ${frameStr} · Release to select ${preset.fullLabel}`
            : typeof ui.perfCommittedStatus === 'function'
              ? ui.perfCommittedStatus(currentIdx + 1, preset.fullLabel)
              : `Preset ${currentIdx + 1}: ${preset.fullLabel}`;
          if (!draggingNow) {
            hasCommittedStatus = true;
            committedStatusText = txt;
          }
          setPerfStatus(txt);
        } else {
          setPerfStatus('');
        }
        if (commit) {
          ctx.selectPreset(preset, (resolvedDisplay) => {
            if (!resolvedDisplay || presets[currentIdx] !== preset) return;
            preset.effortDisplay = resolvedDisplay;
            if (metaEl && metaEl.isConnected) {
              metaEl.textContent = `${preset.modelShort} · ${resolvedDisplay} · frame ${String(frameInt).padStart(2, '0')}`;
            }
          });
        }
      };

      applyVisual(currentFrame, currentIdx, false, false, false);

      tickBtns.forEach((btn) => {
        const showHoverStatus = () => {
          if (isDragging) return;
          const idx = Number(btn.getAttribute('data-step-idx') || 0);
          const p = presets[idx];
          if (!p) return;
          const msg =
            typeof ui.perfHoverStatus === 'function'
              ? ui.perfHoverStatus(idx + 1, p.fullLabel)
              : `Select preset ${idx + 1}: ${p.fullLabel}`;
          setPerfStatus(msg);
        };
        const clearHoverStatus = () => {
          if (isDragging) return;
          setPerfStatus(hasCommittedStatus ? committedStatusText : '');
        };
        btn.addEventListener('pointerenter', showHoverStatus);
        btn.addEventListener('mouseenter', showHoverStatus);
        btn.addEventListener('focus', showHoverStatus);
        btn.addEventListener('pointerleave', clearHoverStatus);
        btn.addEventListener('mouseleave', clearHoverStatus);
        btn.addEventListener('blur', clearHoverStatus);
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const idx = Number(btn.getAttribute('data-step-idx') || 0);
          const f = effortCore.frameForLevel(idx, totalPresets);
          applyVisual(f, idx, true, false, true);
        });
      });

      if (bar) {
        const resolveFrameFromClientX = (clientX) => {
          const r = bar.getBoundingClientRect();
          const span = Math.max(1, r.width - 30);
          const rel = Math.max(0, Math.min(1, (clientX - r.left - 15) / span));
          const fFloat = rel * maxFrame;
          const idx = effortCore.levelForFrame(Math.round(fFloat), totalPresets);
          return { fFloat, idx };
        };

        bar.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          ev.stopPropagation();
          isDragging = true;
          bar.classList.add('is-dragging');
          try {
            bar.setPointerCapture(ev.pointerId);
          } catch {}
          const { fFloat, idx } = resolveFrameFromClientX(ev.clientX);
          applyVisual(fFloat, idx, false, true, true);
        });
        bar.addEventListener('pointermove', (ev) => {
          if (!isDragging) return;
          const { fFloat, idx } = resolveFrameFromClientX(ev.clientX);
          applyVisual(fFloat, idx, false, true, true);
        });
        const finishPerfDrag = (ev) => {
          if (!isDragging) return;
          isDragging = false;
          bar.classList.remove('is-dragging');
          const { idx } = resolveFrameFromClientX(ev.clientX);
          const snapF = effortCore.frameForLevel(idx, totalPresets);
          applyVisual(snapF, idx, true, false, true);
        };
        bar.addEventListener('pointerup', finishPerfDrag);
        bar.addEventListener('pointercancel', finishPerfDrag);
        bar.addEventListener('keydown', (ev) => {
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            const next = Math.min(totalPresets - 1, currentIdx + 1);
            applyVisual(effortCore.frameForLevel(next, totalPresets), next, true, false, true);
          } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
            ev.preventDefault();
            const next = Math.max(0, currentIdx - 1);
            applyVisual(effortCore.frameForLevel(next, totalPresets), next, true, false, true);
          } else if (ev.key === 'Home') {
            ev.preventDefault();
            applyVisual(0, 0, true, false, true);
          } else if (ev.key === 'End') {
            ev.preventDefault();
            applyVisual(maxFrame, totalPresets - 1, true, false, true);
          }
        });
      }
    }
  }

  function positionEffortPopover(pop, anchor) {
    if (!pop) return;
    let target = anchor && anchor.isConnected ? anchor : null;
    if (!target) {
      target = document.querySelector('[data-testid="model-selector-trigger"] .ag-cs-effort-badge, [data-testid="model-selector-trigger"]');
    }
    if (!target) return;
    const aRect = target.getBoundingClientRect();
    const pRect = pop.getBoundingClientRect();
    const vw = window.innerWidth || 900;
    const left = Math.max(8, Math.min(vw - pRect.width - 8, aRect.left + aRect.width / 2 - pRect.width / 2));
    let top = aRect.top - pRect.height - 10;
    if (top < 8) top = aRect.bottom + 10;
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(Math.max(8, top)) + 'px';
  }

  function openEffortPopover(badgeEl, modelBtn) {
    const anchor = badgeEl || modelBtn;
    if (!anchor) return;
    if (openEffortPop && (openEffortAnchor === anchor || (modelBtn && modelBtn.contains(openEffortAnchor)))) {
      closeEffortPopover();
      return;
    }
    closeEffortPopover();
    closeContextPopover();

    const pop = document.createElement('div');
    pop.className = 'ag-cs-effort-popover';
    pop.setAttribute('data-ag-no-i18n', '');
    openEffortPop = pop;
    openEffortAnchor = anchor;
    openEffortModelBtn = modelBtn || anchor?.closest?.('[data-testid="model-selector-trigger"]') || null;
    openEffortBadgeEl = badgeEl || null;
    document.body.appendChild(pop);
    renderEffortPopoverContent(pop, openEffortModelBtn, openEffortBadgeEl);
    positionEffortPopover(pop, anchor);
    if (typeof pop._syncEffortKnob === 'function') {
      pop._syncEffortKnob(true);
    }
  }

  // ── Smooth Typing Cursor Gliding Animation (.ag-cs-smooth-caret) ───────
  let caretTypingTimer = null;
  let caretRaf = 0;
  let pendingCaretTyping = false;
  const emptyCaretProbeCache = new WeakMap();
  const caretPrevState = new WeakMap();

  function teardownSmoothCarets() {
    if (caretTypingTimer) {
      clearTimeout(caretTypingTimer);
      caretTypingTimer = null;
    }
    if (caretRaf) {
      cancelAnimationFrame(caretRaf);
      caretRaf = 0;
    }
    pendingCaretTyping = false;
    document.querySelectorAll('.ag-cs-smooth-caret').forEach((n) => n.remove());
    document.querySelectorAll('[data-ag-cs-smooth-caret]').forEach((n) => n.removeAttribute('data-ag-cs-smooth-caret'));
    document.querySelectorAll('[data-ag-cs-caret-host]').forEach((n) => n.removeAttribute('data-ag-cs-caret-host'));
  }

  function measureEditorCaretBox(ed) {
    if (!ed) return null;
    const edRect = ed.getBoundingClientRect();
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(ed) : null;
    const padL = parseFloat(cs?.paddingLeft || '8') || 8;
    const padT = parseFloat(cs?.paddingTop || '8') || 8;
    const fontSize = parseFloat(cs?.fontSize || '14') || 14;
    const lineH = parseFloat(cs?.lineHeight || '22') || fontSize * 1.5 || 22;
    const estGlyphH = Math.max(16, Math.min(24, Math.round(fontSize * 1.28)));
    const defaultH = Math.max(16, Math.min(28, lineH));
    const estEmptyTopOffset = padT + Math.max(0, Math.round((defaultH - estGlyphH) / 2));

    const checkScrollBounds = (box) => {
      if (!box || !box.collapsed) return box;
      if ((ed.scrollHeight || 0) > (ed.clientHeight || 0) + 2 && edRect.height > 0) {
        if (box.top < edRect.top - 4 || box.top + box.height > edRect.bottom + 6) {
          return { collapsed: false };
        }
      }
      return box;
    };

    const cacheEmptyProbe = (boxRect) => {
      if (boxRect && boxRect.height > 0 && boxRect.height < 36 && edRect.height > 0) {
        emptyCaretProbeCache.set(ed, {
          dx: boxRect.left - edRect.left,
          dy: boxRect.top - edRect.top,
          height: boxRect.height,
        });
      }
    };

    if (typeof document.getSelection === 'function') {
      const sel = document.getSelection();
      if (sel && sel.rangeCount > 0) {
        if (!sel.isCollapsed) return { collapsed: false };
        const range = sel.getRangeAt(0);
        if (ed.contains && ed.contains(range.startContainer)) {
          const rects = typeof range.getClientRects === 'function' ? range.getClientRects() : [];
          const r0 = rects && rects.length > 0 ? rects[rects.length - 1] : typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null;
          if (r0 && r0.height > 0 && (r0.left > 0 || r0.top > 0)) {
            return checkScrollBounds({ collapsed: true, left: r0.left, top: r0.top, height: r0.height });
          }

          // Measure empty line / <br> at the exact selection container & offset (never ed.querySelector('br'))
          const sc = range.startContainer;
          const so = range.startOffset;
          if (sc?.nodeName === 'BR' && typeof sc.getBoundingClientRect === 'function') {
            const brRect = sc.getBoundingClientRect();
            if (brRect && brRect.height > 0 && (brRect.left > 0 || brRect.top > 0)) {
              if (!ed.textContent) cacheEmptyProbe(brRect);
              return checkScrollBounds({ collapsed: true, left: brRect.left, top: brRect.top, height: brRect.height });
            }
          }
          if (sc && sc.nodeType === 1) {
            const childAt = sc.childNodes?.[so];
            if (childAt?.nodeName === 'BR' && typeof childAt.getBoundingClientRect === 'function') {
              const brRect = childAt.getBoundingClientRect();
              if (brRect && brRect.height > 0 && (brRect.left > 0 || brRect.top > 0)) {
                if (sc.childNodes.length <= 1 && !ed.textContent) cacheEmptyProbe(brRect);
                return checkScrollBounds({ collapsed: true, left: brRect.left, top: brRect.top, height: brRect.height });
              }
            }
            const childPrev = so > 0 ? sc.childNodes?.[so - 1] : null;
            if (childPrev?.nodeName === 'BR' && typeof childPrev.getBoundingClientRect === 'function') {
              const brRect = childPrev.getBoundingClientRect();
              if (brRect && brRect.height > 0 && (brRect.left > 0 || brRect.top > 0)) {
                const isManagedEmptyLine =
                  (typeof childPrev.hasAttribute === 'function' && childPrev.hasAttribute('data-lexical-managed-linebreak')) ||
                  sc.childNodes.length === 1;
                const scRect = typeof sc.getBoundingClientRect === 'function' ? sc.getBoundingClientRect() : null;
                const lineLeft = scRect && scRect.left > 0 ? scRect.left : brRect.left;
                const lineTop = isManagedEmptyLine ? brRect.top : brRect.bottom;
                const box = { collapsed: true, left: lineLeft, top: lineTop, height: brRect.height };
                if (isManagedEmptyLine && sc.childNodes.length <= 1 && !ed.textContent) cacheEmptyProbe(box);
                return checkScrollBounds(box);
              }
            }
            if (typeof sc.getBoundingClientRect === 'function' && sc !== ed) {
              const scRect = sc.getBoundingClientRect();
              if (scRect && (scRect.left > 0 || scRect.top > 0)) {
                return checkScrollBounds({
                  collapsed: true,
                  left: scRect.left,
                  top: scRect.top,
                  height: Math.min(estGlyphH, scRect.height || estGlyphH),
                });
              }
            }
          }
        }
      }
    }

    const cached = emptyCaretProbeCache.get(ed);
    if (cached) {
      return checkScrollBounds({
        collapsed: true,
        left: edRect.left + cached.dx,
        top: edRect.top + cached.dy,
        height: cached.height,
      });
    }

    return checkScrollBounds({
      collapsed: true,
      left: edRect.left + padL,
      top: edRect.top + estEmptyTopOffset,
      height: estGlyphH,
    });
  }

  function syncSmoothCaret(isTypingEvent = false) {
    if (destroyed || cfg.smoothCaret === false) {
      teardownSmoothCarets();
      return;
    }

    const editors = Array.from(document.querySelectorAll('[data-testid="agent-input-box"] [contenteditable="true"]'));
    const activeEl = document.activeElement;

    for (const ed of editors) {
      const host = ed.parentElement;
      if (!host) continue;
      host.setAttribute('data-ag-cs-caret-host', '1');
      let caret = host.querySelector('.ag-cs-smooth-caret');
      if (!caret) {
        caret = document.createElement('div');
        caret.className = 'ag-cs-smooth-caret';
        caret.setAttribute('aria-hidden', 'true');
        caret.setAttribute('data-ag-no-i18n', '');
        host.appendChild(caret);
      }

      const isFocused = activeEl === ed || (activeEl && ed.contains && ed.contains(activeEl));
      const measured = measureEditorCaretBox(ed);
      if (!measured || !measured.collapsed) {
        caret.removeAttribute('data-ag-cs-caret-visible');
        ed.removeAttribute('data-ag-cs-smooth-caret');
        continue;
      }

      const hostRect = host.getBoundingClientRect();
      const x = Math.round(measured.left - hostRect.left - (host.clientLeft || 0) + (host.scrollLeft || 0));
      const y = Math.round(measured.top - hostRect.top - (host.clientTop || 0) + (host.scrollTop || 0));
      const h = Math.max(15, Math.round(measured.height || 18));
      const wasVisible = caret.getAttribute('data-ag-cs-caret-visible') === '1';
      const cleanText = (ed.textContent || '').replace(/\u200b/g, '');
      const isNowEmpty = cleanText.length === 0 && ed.querySelectorAll('p, div').length <= 1;
      const prev = caretPrevState.get(caret);
      const clearedToEmpty = Boolean(prev && prev.empty === false && isNowEmpty);

      if ((isFocused && !wasVisible) || clearedToEmpty) {
        caret.style.transition = 'none';
        caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        caret.style.height = `${h}px`;
        void caret.offsetWidth;
        caret.style.transition = '';
      } else {
        caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        caret.style.height = `${h}px`;
      }
      caretPrevState.set(caret, { x, y, h, empty: isNowEmpty });

      if (isFocused) {
        caret.setAttribute('data-ag-cs-caret-visible', '1');
        ed.setAttribute('data-ag-cs-smooth-caret', '1');
        if (isTypingEvent) {
          caret.setAttribute('data-ag-cs-caret-typing', '1');
          if (caretTypingTimer) clearTimeout(caretTypingTimer);
          caretTypingTimer = setTimeout(() => {
            caretTypingTimer = null;
            if (caret.isConnected) caret.removeAttribute('data-ag-cs-caret-typing');
          }, 420);
        } else if (prev && (prev.x !== x || prev.y !== y) && typeof caret.getAnimations === 'function') {
          for (const anim of caret.getAnimations()) {
            if (anim && anim.animationName === 'ag-cs-caret-blink') anim.currentTime = 0;
          }
        }
      } else {
        caret.removeAttribute('data-ag-cs-caret-visible');
        ed.removeAttribute('data-ag-cs-smooth-caret');
      }
    }
  }

  function queueSmoothCaret(isTyping = false, immediate = false) {
    if (destroyed || cfg.smoothCaret === false) return;
    if (isTyping) pendingCaretTyping = true;
    if (immediate) {
      const typingNow = pendingCaretTyping || isTyping;
      pendingCaretTyping = false;
      syncSmoothCaret(typingNow);
    }
    if (caretRaf) cancelAnimationFrame(caretRaf);
    if (typeof requestAnimationFrame === 'function') {
      caretRaf = requestAnimationFrame(() => {
        caretRaf = 0;
        const typingNow = pendingCaretTyping;
        pendingCaretTyping = false;
        syncSmoothCaret(typingNow);
      });
    }
  }

  // ── Composer Footer Widgets (Placeholder, Effort Tag, Inline Stats, Ring, Crab Clearance) ──
  function setCrabClearanceAttr(el, attrName, active) {
    if (!el) return;
    if (active) {
      if (el.getAttribute(attrName) !== '1') el.setAttribute(attrName, '1');
      if (el.style.getPropertyValue('margin-bottom') !== '46px') {
        el.style.setProperty('margin-bottom', '46px', 'important');
      }
    } else if (el.hasAttribute(attrName)) {
      el.removeAttribute(attrName);
      el.style.removeProperty('margin-bottom');
    }
  }

  function syncCrabClearance(card, inputBox, active) {
    if (!inputBox) return;
    const composerShell = card.closest('#antigravity\\.agentSidePanelInputBox') || card.parentElement;
    let hasLowerClearance = false;

    // 0a. Active running-items-panel directly above composer card inside composerShell
    if (composerShell) {
      for (const ch of Array.from(composerShell.children)) {
        if (ch === card) break;
        const panel =
          ch.getAttribute?.('data-testid') === 'running-items-panel'
            ? ch
            : ch.querySelector?.('[data-testid="running-items-panel"]');
        const isActivePanel = Boolean(panel && String(panel.className || '').includes('grid-rows-[1fr]'));
        const shouldClear = active && isActivePanel && !hasLowerClearance;
        setCrabClearanceAttr(ch, 'data-ag-cs-queued', shouldClear);
        if (shouldClear) hasLowerClearance = true;
      }
    }

    // 0b. Queued-Message ("待发消息 / 排队中的消息") & floating banners inside [data-testid="agent-input-box"]
    const ibChildren = Array.from(inputBox.children);
    const shellIdx = ibChildren.indexOf(composerShell);
    const beforeShell = shellIdx >= 0 ? ibChildren.slice(0, shellIdx) : ibChildren;
    for (let i = beforeShell.length - 1; i >= 0; i--) {
      const ch = beforeShell[i];
      if (ch.classList && (ch.classList.contains('ag-cs-hud-top-bar') || ch.classList.contains('ag-cs-hud-bottom-bar'))) {
        continue;
      }
      const hasQueued = ch.childElementCount > 0 || (ch.textContent || '').trim().length > 0;
      const shouldClear = active && hasQueued && !hasLowerClearance;
      setCrabClearanceAttr(ch, 'data-ag-cs-queued', shouldClear);
      if (shouldClear) hasLowerClearance = true;
    }

    // 0c. Takeover Q&A / Permission Card & Side-Question Panel rendered above agent-input-box
    const inputSlot =
      inputBox.parentElement &&
      inputBox.parentElement.classList &&
      inputBox.parentElement.classList.contains('contents')
        ? inputBox.parentElement
        : inputBox;
    const hostWrap = inputSlot.parentElement;
    if (hostWrap) {
      const siblings = Array.from(hostWrap.children);
      const slotIdx = siblings.indexOf(inputSlot);
      for (let i = slotIdx - 1; i >= 0; i--) {
        const sib = siblings[i];
        const isTakeoverOrSideQ =
          sib.getAttribute?.('data-testid') === 'interaction-takeover-card' ||
          sib.getAttribute?.('data-testid') === 'side-question-panel' ||
          Boolean(sib.querySelector?.('[data-testid="interaction-takeover-card"], [data-testid="side-question-panel"]'));
        if (!isTakeoverOrSideQ) {
          if (sib.hasAttribute?.('data-ag-cs-takeover')) {
            setCrabClearanceAttr(sib, 'data-ag-cs-takeover', false);
          }
          continue;
        }
        const shouldClear = active && !hasLowerClearance;
        setCrabClearanceAttr(sib, 'data-ag-cs-takeover', shouldClear);
        if (shouldClear) hasLowerClearance = true;
      }
    }
  }

  function syncComposers() {
    const cards = Array.from(document.querySelectorAll('[data-testid="agent-input-box"] .surface-composer-card'));
    const lang = getLang();
    const ui = uiText(lang);

    // Pick primary card (home card or main conversation card, skipping subagent side panel if main exists)
    let primaryCard = null;
    for (const c of cards) {
      if (!c.closest('[data-testid="subagent-tab-conversation"]')) {
        primaryCard = c;
        break;
      }
    }
    if (!primaryCard && cards.length > 0) primaryCard = cards[0];

    let activeInfoForCrab = null;

    for (const card of cards) {
      const inputBox = card.closest('[data-testid="agent-input-box"]');

      // 0. Fix Queued-Message, Takeover Q&A Card, Side-Question, and Running-Tasks overlap with Clawd Mascot
      syncCrabClearance(card, inputBox, cfg.mascot === 'crab' && card === primaryCard);

      // 1. Studio placeholder override via attribute + ::before
      const p = card.querySelector('div.relative.w-full p.pointer-events-none');
      if (p) {
        if (cfg.composerRestyle !== false && cfg.placeholderStyle === 'studio') {
          const text = ui.studioPlaceholder || 'How can I help you today?';
          if (p.getAttribute('data-ag-cs-placeholder') !== text) {
            p.setAttribute('data-ag-cs-placeholder', text);
          }
        } else {
          p.removeAttribute('data-ag-cs-placeholder');
        }
      }

      // 2. Effort level accent badge inside [data-testid="model-selector-trigger"]
      const modelBtn = card.querySelector('[data-testid="model-selector-trigger"]');
      if (modelBtn) {
        const spans = modelBtn.querySelectorAll('span');
        const sub = spans.length >= 2 ? spans[spans.length - 1] : null;
        if (sub && sub.childElementCount === 0) {
          let level = effortCore.normalizeEffortBadgeText(sub.textContent);
          if (!level) {
            const aria = modelBtn.getAttribute('aria-label') || '';
            level = effortCore.parseModelLabelEffort(aria).effort || '';
          }
          if (level) {
            if (sub.getAttribute('data-ag-cs-effort') !== level) sub.setAttribute('data-ag-cs-effort', level);
            sub.classList.add('ag-cs-effort-badge');
          } else {
            if (sub.hasAttribute('data-ag-cs-effort')) sub.removeAttribute('data-ag-cs-effort');
            sub.classList.remove('ag-cs-effort-badge');
          }
        }
      }

      // 3. Inline stats, remaining-usage ring, turn badges & surround HUD (both new conversations & active chats)
      const footer = card.querySelector('.agy-composer-footer');
      const isHomeCard = Boolean(card.closest('.agy-home') && !card.closest('[data-testid="conversation-view"]'));
      const cascadeId = isHomeCard ? '' : resolveCascadeId(inputBox);
      const inConvo = Boolean(cascadeId || card.closest('[data-testid="conversation-view"]'));

      if (!footer || cfg.inlineStats === false || cfg.composerRestyle === false) {
        card
          .querySelectorAll('.ag-cs-inline-stats, .ag-cs-context-ring, .ag-cs-quota-ring, .ag-cs-hud-top-bar, .ag-cs-hud-bottom-bar, .ag-cs-hud-rim-progress, .ag-cs-hud-footer-chip')
          .forEach((n) => n.remove());
        continue;
      }

      const cached = inConvo && cascadeId ? activeTrajCache.get(cascadeId)?.data || null : null;
      const baseData = cached || createEmptyConvoData(cascadeId, getKnownMaxContextForCard(card, null));
      if (card === primaryCard) activeInfoForCrab = cached;

      if (inConvo && cascadeId) {
        fetchActiveConvo(cascadeId, false, card).then((fresh) => {
          if (!destroyed && fresh && card.isConnected) {
            updateFooterWidgets(card, footer, fresh);
            syncSurroundHud(card, footer, fresh);
            if (card === primaryCard) {
              const stillHome = Boolean(card.closest('.agy-home') && !card.closest('[data-testid="conversation-view"]'));
              const curCardCid = stillHome ? '' : resolveCascadeId(inputBox);
              if (!stillHome && (!curCardCid || curCardCid === cascadeId)) {
                syncCrab(primaryCard, fresh);
                syncTurnBadges(fresh);
              }
            }
            if (
              openPopover &&
              openPopover.isConnected &&
              openPopoverCascadeId === cascadeId &&
              openPopover._agCsRenderedData !== fresh
            ) {
              renderContextPopoverContent(openPopover, fresh, cascadeId);
              if (openPopoverAnchor && openPopoverAnchor.isConnected) {
                positionPopoverAboveAnchor(openPopover, openPopoverAnchor);
              }
            }
          }
        });
      }
      {
        const needQuotaRefresh = !cachedQuotaData || Date.now() - lastQuotaFetchAt >= 25000;
        const qProm = fetchQuotaData(false);
        if (needQuotaRefresh && qProm && typeof qProm.then === 'function') {
          qProm.then((q) => {
            if (!destroyed && q && card.isConnected) {
              const latest = resolveCardConvoData(card, baseData);
              updateFooterWidgets(card, footer, latest);
              syncSurroundHud(card, footer, latest);
            }
          });
        }
      }
      updateFooterWidgets(card, footer, baseData);
      syncSurroundHud(card, footer, baseData);
      if (card === primaryCard) syncTurnBadges(cached);
    }

    syncCrab(primaryCard, activeInfoForCrab);
    syncSmoothCaret(false);
  }

  function updateFooterWidgets(card, footer, data) {
    const lang = getLang();
    const ui = uiText(lang);
    const d = data || createEmptyConvoData('', getKnownMaxContextForCard(card, data));
    card._agCsLastData = d;
    let statsBtn = footer.querySelector('.ag-cs-inline-stats');
    let ringBtn = footer.querySelector('.ag-cs-context-ring');
    let quotaRingBtn = footer.querySelector('.ag-cs-quota-ring');

    // Bottom-right context ring (0% -> 100% used, fixed neutral gray) + dual concentric quota ring (outer=5h, inner=weekly)
    const { ring, draftEst, activeQuota } = getRingTelemetryForCard(card, d);

    const turnsTxt = `${d.calls} ${ui.callsShortUnit || 'calls'} ${d.steps} ${ui.stepsUnit || 'steps'}`;
    const speedVal = Number(d.displaySpeed || d.lastSpeed || 0);
    const speedTxt = speedVal > 0 ? ` · ${speedVal} tok/s` : '';
    const totalTxt =
      d.totalTokens > 0
        ? ` · ${usageCore.formatCompactTokens(d.totalTokens)} tok`
        : d.liveTokens > 0
        ? ` · ~${usageCore.formatCompactTokens(d.liveTokens)} tok`
        : draftEst.tokens > 0
        ? ` · ~${usageCore.formatCompactTokens(draftEst.tokens)} tok`
        : ' · 0 tok';
    const cacheTxt = ` · ${Math.round(d.cacheHitPct || 0)}% ${ui.cacheShort || 'Cache'}`;
    const statsKey = `${turnsTxt}|${speedTxt}|${totalTxt}|${cacheTxt}|${lang}`;

    if (!statsBtn) {
      statsBtn = document.createElement('button');
      statsBtn.type = 'button';
      statsBtn.className = 'ag-cs-inline-stats';
      statsBtn.setAttribute('data-ag-no-i18n', '');
      for (const cls of ['ag-cs-stat-turns', 'ag-cs-stat-speed', 'ag-cs-stat-total', 'ag-cs-stat-cache']) {
        const sp = document.createElement('span');
        sp.className = cls;
        statsBtn.appendChild(sp);
      }
      statsBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openContextPopover(statsBtn, resolveCardConvoData(card, d), 'breakdown');
      });
      footer.appendChild(statsBtn);
    }

    if (statsBtn.getAttribute('data-ag-cs-stats-key') !== statsKey) {
      statsBtn.setAttribute('data-ag-cs-stats-key', statsKey);
      const turnsEl = statsBtn.querySelector('.ag-cs-stat-turns');
      const speedEl = statsBtn.querySelector('.ag-cs-stat-speed');
      const totalEl = statsBtn.querySelector('.ag-cs-stat-total');
      const cacheEl = statsBtn.querySelector('.ag-cs-stat-cache');
      if (turnsEl) turnsEl.textContent = turnsTxt;
      if (speedEl) {
        speedEl.textContent = speedTxt;
        speedEl.style.display = speedTxt ? '' : 'none';
      }
      if (totalEl) totalEl.textContent = totalTxt;
      if (cacheEl) cacheEl.textContent = cacheTxt;
    }

    const pct = Math.max(0, Math.min(100, ring.contextUsedPct));
    const r = 5.5;
    const circ = 2 * Math.PI * r;
    const dash = ((pct / 100) * circ).toFixed(2);
    const color = ring.contextColor || '#71717a';
    const pctRound = Math.round(pct);
    const remStr = formatCompactK(ring.remainingTokens);
    const maxStr = formatCompactK(ring.maxTokens);
    const usedStr = formatCompactK(ring.usedTokens);
    const ringTitle =
      typeof ui.ringTooltip === 'function'
        ? ui.ringTooltip(remStr, maxStr, ring.contextRemainingPct.toFixed(1), usedStr, ring.contextUsedPct.toFixed(1), ring.quotaRemainingPct)
        : `Used ${usedStr} / ${maxStr} (${ring.contextUsedPct.toFixed(1)}%) · Remaining ${remStr} (${ring.contextRemainingPct.toFixed(1)}%)`;
    const lowCtxRingAttr =
      (d.calls > 0 || ring.usedTokens > 0) && ring.contextRemainingPct <= 20
        ? ring.contextRemainingPct <= 10
          ? 'danger'
          : 'warn'
        : '';
    const ringKey = `context-used|${lowCtxRingAttr}|${pctRound}|${dash}|${color}|${ringTitle}`;

    if (!ringBtn) {
      ringBtn = document.createElement('button');
      ringBtn.type = 'button';
      ringBtn.className = 'ag-cs-context-ring';
      ringBtn.setAttribute('data-ag-no-i18n', '');
      ringBtn.setAttribute('data-ring-mode', 'context');
      if (lowCtxRingAttr) ringBtn.setAttribute('data-ctx-low', lowCtxRingAttr);
      ringBtn.setAttribute('title', ringTitle);
      ringBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="${r}" fill="none" stroke="rgba(128, 128, 128, 0.22)" stroke-width="2.2"/><circle class="ag-cs-ring-fill" cx="8" cy="8" r="${r}" fill="none" stroke="${color}" stroke-width="2.2" stroke-dasharray="${dash} ${circ.toFixed(2)}" stroke-linecap="round"/></svg>`;
      ringBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openContextPopover(ringBtn, resolveCardConvoData(card, d), 'breakdown');
      });
      footer.appendChild(ringBtn);
      ringBtn.setAttribute('data-ag-cs-ring-key', ringKey);
    } else if (ringBtn.getAttribute('data-ag-cs-ring-key') !== ringKey) {
      ringBtn.setAttribute('data-ag-cs-ring-key', ringKey);
      ringBtn.setAttribute('data-ring-mode', 'context');
      if (lowCtxRingAttr) ringBtn.setAttribute('data-ctx-low', lowCtxRingAttr);
      else ringBtn.removeAttribute('data-ctx-low');
      ringBtn.setAttribute('title', ringTitle);
      const fillCircle = ringBtn.querySelector('.ag-cs-ring-fill');
      if (fillCircle) {
        fillCircle.setAttribute('stroke', color);
        fillCircle.setAttribute('stroke-dasharray', `${dash} ${circ.toFixed(2)}`);
      }
    }

    // Single quota ring: 5h remaining % with dynamic color + side percentage label
    const has5h = typeof activeQuota?.b5h?.remainingPct === 'number';
    const hasWeek = typeof activeQuota?.bWeek?.remainingPct === 'number';
    const hasAnyQuota = has5h || hasWeek || typeof activeQuota?.effectiveRemainingPct === 'number';
    const pct5h = has5h
      ? Math.max(0, Math.min(100, activeQuota.b5h.remainingPct))
      : typeof activeQuota?.effectiveRemainingPct === 'number'
      ? Math.max(0, Math.min(100, activeQuota.effectiveRemainingPct))
      : 0;
    const pctWeek = hasWeek
      ? Math.max(0, Math.min(100, activeQuota.bWeek.remainingPct))
      : typeof activeQuota?.effectiveRemainingPct === 'number'
      ? Math.max(0, Math.min(100, activeQuota.effectiveRemainingPct))
      : 0;
    const quotaDash = hasAnyQuota ? ((pct5h / 100) * circ).toFixed(2) : '0.00';
    const quotaColor = !hasAnyQuota ? '#71717a' : pct5h <= 10 ? '#dc3c3d' : pct5h <= 30 ? '#fbb315' : '#257de0';
    const quotaLabel = hasAnyQuota ? `${Math.round(pct5h)}%` : '--';
    const reset5hStr = fmtBucketReset(activeQuota?.b5h, lang);
    const resetWeekStr = fmtBucketReset(activeQuota?.bWeek, lang);
    const quotaTitle = hasAnyQuota
      ? `${activeQuota?.groupName ? activeQuota.groupName + ' · ' : ''}${isZh() ? '5h 剩余' : '5h rem'}: ${Math.round(pct5h)}%${reset5hStr ? ` (${reset5hStr})` : ''} · ${isZh() ? '周剩余' : 'Weekly rem'}: ${Math.round(pctWeek)}%${resetWeekStr ? ` (${resetWeekStr})` : ''}`
      : isZh()
      ? '5h 配额剩余（加载中）'
      : '5h quota remaining (loading)';
    const quotaKey = `${quotaLabel}|${quotaDash}|${quotaColor}|${quotaTitle}`;

    if (!quotaRingBtn) {
      quotaRingBtn = document.createElement('button');
      quotaRingBtn.type = 'button';
      quotaRingBtn.className = 'ag-cs-quota-ring';
      quotaRingBtn.setAttribute('data-ag-no-i18n', '');
      quotaRingBtn.setAttribute('title', quotaTitle);
      quotaRingBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="${r}" fill="none" stroke="rgba(128, 128, 128, 0.22)" stroke-width="2.2"/><circle class="ag-cs-quota-fill" cx="8" cy="8" r="${r}" fill="none" stroke="${quotaColor}" stroke-width="2.2" stroke-dasharray="${quotaDash} ${circ.toFixed(2)}" stroke-linecap="round"/></svg><span>${quotaLabel}</span>`;
      quotaRingBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openContextPopover(quotaRingBtn, resolveCardConvoData(card, d), 'quotas');
      });
      footer.appendChild(quotaRingBtn);
      quotaRingBtn.setAttribute('data-ag-cs-quota-key', quotaKey);
    } else if (quotaRingBtn.getAttribute('data-ag-cs-quota-key') !== quotaKey) {
      quotaRingBtn.setAttribute('data-ag-cs-quota-key', quotaKey);
      quotaRingBtn.setAttribute('title', quotaTitle);
      const fillEl = quotaRingBtn.querySelector('.ag-cs-quota-fill');
      const labelEl = quotaRingBtn.querySelector('span');
      if (fillEl) {
        fillEl.setAttribute('stroke', quotaColor);
        fillEl.setAttribute('stroke-dasharray', `${quotaDash} ${circ.toFixed(2)}`);
      }
      if (labelEl) labelEl.textContent = quotaLabel;
    }
  }

  async function writeTextToClipboard(text) {
    if (!navigator?.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      return false;
    }
    try {
      await navigator.clipboard.writeText(String(text || ''));
      return true;
    } catch {
      return false;
    }
  }

  function diagnoseHostCompat() {
    const has = (sel) => {
      try {
        return Boolean(document.querySelector(sel));
      } catch {
        return false;
      }
    };
    let hooks = null;
    try {
      hooks = ensureHooks(true);
    } catch {}
    const i18nStats = domTranslator && typeof domTranslator.stats === 'function' ? domTranslator.stats() : null;
    return {
      pluginVersion: VERSION,
      codeHash: CODE_HASH || '',
      language: getLang(),
      path: typeof location !== 'undefined' ? String(location.pathname || '') : '',
      anchors: {
        home: has('.agy-home, [data-testid="home-greeting"]'),
        composer: has('[data-testid="agent-input-box"], .surface-composer-card'),
        modelSelector: has('[data-testid="model-selector-trigger"]'),
        sidebar: has('[data-testid="conversation-list-sidebar"], [data-testid="sidebar-navigation-items"]'),
        conversationView: has('[data-testid="conversation-view"]'),
        settingsSection: Boolean(document.getElementById(SETTINGS_SEC_ID)),
      },
      runtime: {
        fiberBridge: Boolean(hooks && (hooks.svc || hooks.store || hooks.trajCtx)),
        i18nActive: Boolean(domTranslator),
        i18nTexts: i18nStats ? i18nStats.texts : 0,
        i18nAttrs: i18nStats ? i18nStats.attrs : 0,
        hasExtraI18n: Boolean(runtimeInitConfig && runtimeInitConfig.i18nExtra),
        hasPanel: Boolean(panelEl && panelEl.isConnected),
        hasCrab: Boolean(crabState.root && crabState.root.isConnected),
      },
    };
  }

  function scanMissingI18n() {
    const compat = diagnoseHostCompat();
    const items = domTranslator && typeof domTranslator.missing === 'function' ? domTranslator.missing(document) : [];
    return {
      version: VERSION,
      language: compat.language,
      missingCount: items.length,
      missing: items,
      compat,
    };
  }

  function buildCompatReport(scan = scanMissingI18n()) {
    const extraTemplate = {};
    if (scan.language && scan.language !== 'en' && scan.missing.length) {
      const dictSample = {};
      for (const item of scan.missing) {
        const cleanKey = item.startsWith('@') ? item.replace(/^@[^:]+:\s*/, '') : item;
        if (cleanKey && !Object.prototype.hasOwnProperty.call(dictSample, cleanKey)) {
          dictSample[cleanKey] = '';
        }
      }
      extraTemplate[scan.language] = { dict: dictSample };
    }
    return JSON.stringify(
      {
        compat: scan.compat,
        missingCount: scan.missingCount,
        missing: scan.missing,
        i18nExtraTemplate: extraTemplate,
      },
      null,
      2
    );
  }

  // ── Settings Panel Integration ─────────────────────────────────────────
  const SETTINGS_SEC_ID = 'ag-cs-settings-sec';

  function ensureSettingsSection() {
    const lang = getLang();
    const ui = uiText(lang);
    const targetTitles = ['Appearance', '外观', '外觀', '外観'];
    let panel = null;
    for (const h2 of document.querySelectorAll('[role="dialog"] h2')) {
      if (targetTitles.includes((h2.textContent || '').trim())) {
        panel = h2.closest('div.p-6') || h2.parentElement?.parentElement;
        if (panel) break;
      }
    }
    if (!panel) return;
    const syncCondDims = (root) => {
      const curStyle = effortCore.normalizeEffortStyle(cfg.effortSliderStyle);
      root.querySelectorAll('[data-ag-cs-cond]').forEach((row) => {
        const req = row.getAttribute('data-ag-cs-cond');
        if (req && req !== curStyle) row.setAttribute('data-ag-cs-dim', '1');
        else row.removeAttribute('data-ag-cs-dim');
      });
    };
    let wasHudOpen = false;
    const existing = document.getElementById(SETTINGS_SEC_ID);
    if (existing) {
      if (panel.querySelector('#' + SETTINGS_SEC_ID) === existing && existing.getAttribute('data-ag-cs-lang') === lang) {
        existing.querySelectorAll('button[data-ag-cs-key]').forEach((btn) => {
          const k = btn.getAttribute('data-ag-cs-key');
          const v = btn.getAttribute('data-ag-cs-val');
          const curVal = k === 'language' ? lang : cfg[k];
          const on = JSON.stringify(curVal) === v;
          if (btn.getAttribute('aria-pressed') !== String(on)) {
            btn.setAttribute('aria-pressed', String(on));
            btn.toggleAttribute('data-pressed', on);
          }
        });
        syncCondDims(existing);
        return;
      }
      const prevDetails = existing.querySelector('.ag-cs-settings-details');
      wasHudOpen = Boolean(prevDetails && (prevDetails.open || prevDetails.hasAttribute('open')));
      existing.remove();
    }
    const sections = Array.from(panel.querySelectorAll('div.space-y-2')).filter(
      (s) => !s.id.startsWith('ag-cs-') && !(s.parentElement && s.parentElement.closest('div.space-y-2'))
    );
    const anchor = sections[sections.length - 1];
    if (!anchor || !anchor.parentElement) return;

    const BTN =
      'inline-flex items-center justify-center transition-colors text-secondary-foreground outline-none cursor-pointer border-none shrink-0 select-none h-full hover:text-foreground data-[pressed]:bg-secondary data-[pressed]:text-foreground text-sm px-2 rounded-md gap-1.5';

    const sec = document.createElement('div');
    sec.id = SETTINGS_SEC_ID;
    sec.className = 'space-y-2';
    sec.setAttribute('data-ag-no-i18n', '');
    sec.setAttribute('data-ag-cs-lang', lang);

    const langOpts = (
      i18nCore?.LANG_OPTIONS || [
        { id: 'zh-CN', label: '简体中文' },
        { id: 'zh-TW', label: '繁體中文' },
        { id: 'yue', label: '粵語' },
        { id: 'en', label: 'English' },
        { id: 'ja', label: '日本語' },
      ]
    ).map((o) => [o.id, o.label]);

    const rowDefs = {
      language: {
        key: 'language',
        title: ui.setLanguageTitle || 'Interface Language',
        desc: ui.setLanguageDesc || 'Switch display language for the entire Antigravity UI and plugin panels.',
        opts: langOpts,
      },
      homeLayout: {
        key: 'homeLayout',
        title: ui.setHomeLayoutTitle || 'Home Layout',
        desc: ui.setHomeLayoutDesc || 'Switch new-conversation home layout.',
        opts: [
          ['studio', ui.optStudio || 'Studio'],
          ['classic', ui.optClassic || 'Classic'],
          ['off', ui.optNativeOff || 'Off'],
        ],
      },
      palette: {
        key: 'palette',
        title: ui.setPaletteTitle || 'Color Palette',
        desc: ui.setPaletteDesc || 'Pick Studio palette or follow host.',
        opts: [
          ['obsidian', ui.optObsidian || 'Obsidian'],
          ['claude', 'Claude'],
          ['host', ui.optHost || 'Host'],
        ],
      },
      logoInk: {
        key: 'logoInk',
        title: ui.setLogoInkTitle || 'Logo Color',
        desc: ui.setLogoInkDesc || 'Tint of the Antigravity greeting mark.',
        opts: [
          ['accent', ui.optAccent || 'Accent'],
          ['foreground', ui.optForeground || 'Ink'],
        ],
      },
      sidebarRestyle: {
        key: 'sidebarRestyle',
        title: ui.setSidebarTitle || 'Sidebar Restyle',
        desc: ui.setSidebarDesc || 'Apply Claude-style row height and hover plates to sidebar.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      composerRestyle: {
        key: 'composerRestyle',
        title: ui.setComposerTitle || 'Composer Restyle',
        desc: ui.setComposerDesc || 'Minimalist rounded input box + canvas footer.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      effortSliderStyle: {
        key: 'effortSliderStyle',
        title: ui.setEffortStyleTitle || 'Thinking Effort Slider Style',
        desc: ui.setEffortStyleDesc || 'Style of the interactive effort slider popover (Claude Code, ChatGPT Codex, or Liang Wufeng portrait).',
        opts: [
          ['claude', 'Claude Code'],
          ['chatgpt', 'ChatGPT Codex'],
          ['liangwufeng', ui.optLiangWufeng || 'Liang Wufeng'],
        ],
      },
      effortAccent: {
        key: 'effortAccent',
        subRow: true,
        condStyle: 'claude',
        badge: ui.badgeClaude || 'Claude Code',
        title: ui.setEffortAccentTitle || 'Claude Effort Color Accent',
        desc: ui.setEffortAccentDesc || 'Use blue-violet effort tint ramp on Claude slider & pixel matrix.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      performanceBackdrop: {
        key: 'performanceBackdrop',
        subRow: true,
        condStyle: 'liangwufeng',
        badge: ui.badgeLwf || 'Liang Wufeng',
        title: ui.setPerfBackdropTitle || 'Liang Wufeng Portrait Backdrop',
        desc: ui.setPerfBackdropDesc || 'Where the 31-frame cutout portrait renders in Liang Wufeng mode.',
        opts: [
          ['card', ui.optBackdropCard || 'Card'],
          ['page', ui.optBackdropPage || 'Window'],
          ['off', ui.offLabel || 'Off'],
        ],
      },
      smoothCaret: {
        key: 'smoothCaret',
        title: ui.setSmoothCaretTitle || 'Smooth Typing Caret',
        desc: ui.setSmoothCaretDesc || 'Enable smooth gliding caret interpolation in composer input.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      mascot: {
        key: 'mascot',
        title: ui.setMascotTitle || 'Pixel Crab Mascot',
        desc: ui.setMascotDesc || 'Show interactive Clawd pixel crab on composer.',
        opts: [
          ['crab', ui.onLabel || 'On'],
          ['off', ui.offLabel || 'Off'],
        ],
      },
      homeRipple: {
        key: 'homeRipple',
        title: ui.setRippleTitle || 'Home Matrix Ripple',
        desc: ui.setRippleDesc || 'Interactive character matrix ripple field on home view.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      inlineStats: {
        key: 'inlineStats',
        title: ui.setInlineStatsTitle || 'Inline Stats & Remaining Ring',
        desc: ui.setInlineStatsDesc || 'Show inline session stats & remaining capacity ring.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      ringMode: {
        key: 'ringMode',
        title: ui.setRingModeTitle || 'Bottom-Right Ring Mode',
        desc: ui.setRingModeDesc || 'Display Context Remaining % or Model Quota Remaining %.',
        opts: [
          ['context', ui.optRingContext || 'Context Rem %'],
          ['quota', ui.optRingQuota || 'Quota Rem %'],
        ],
      },
      turnBadges: {
        key: 'turnBadges',
        title: ui.setTurnBadgesTitle || 'Per-Turn Token Badges',
        desc: ui.setTurnBadgesDesc || 'Render per-turn token telemetry badges in conversation.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      hudTopBar: {
        key: 'hudTopBar',
        title: ui.setHudTopBarTitle || 'Composer Top HUD Bar',
        desc: ui.setHudTopBarDesc || 'Show context progress bar above composer.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      hudBottomBar: {
        key: 'hudBottomBar',
        title: ui.setHudBottomBarTitle || 'Composer Bottom HUD Bar',
        desc: ui.setHudBottomBarDesc || 'Show detailed HUD telemetry bar below composer.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      hudRimProgress: {
        key: 'hudRimProgress',
        title: ui.setHudRimTitle || 'Composer Rim Progress',
        desc: ui.setHudRimDesc || 'Render context usage rim progress around composer.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      hudFooterChip: {
        key: 'hudFooterChip',
        title: ui.setHudChipTitle || 'Footer Remaining Chip',
        desc: ui.setHudChipDesc || 'Show remaining context/quota chip in composer footer.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
      hudCompact: {
        key: 'hudCompact',
        title: ui.setHudCompactTitle || 'Compact HUD Mode',
        desc: ui.setHudCompactDesc || 'Use compact padding and condensed typography for Token HUD.',
        opts: [
          [true, ui.onLabel || 'On'],
          [false, ui.offLabel || 'Off'],
        ],
      },
    };

    const groups = [
      {
        id: 'appearance',
        title: ui.grpAppearance || 'Appearance & Layout',
        keys: ['language', 'homeLayout', 'palette', 'logoInk', 'sidebarRestyle', 'composerRestyle'],
      },
      {
        id: 'interaction',
        title: ui.grpInteraction || 'Slider, Caret & Mascot',
        keys: ['effortSliderStyle', 'effortAccent', 'performanceBackdrop', 'smoothCaret', 'mascot', 'homeRipple'],
      },
      {
        id: 'telemetry',
        title: ui.grpTelemetry || 'Usage Ring & HUD',
        keys: ['inlineStats', 'ringMode', 'turnBadges'],
        hudKeys: ['hudTopBar', 'hudBottomBar', 'hudRimProgress', 'hudFooterChip', 'hudCompact'],
      },
    ];

    const mkEl = (tag, cls) => {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      return el;
    };

    const buildRow = (r) => {
      const row = mkEl('div', 'w-full');
      row.setAttribute('data-ag-cs-row', r.key);
      if (r.subRow) row.setAttribute('data-ag-cs-subrow', '1');
      if (r.condStyle) {
        row.setAttribute('data-ag-cs-cond', r.condStyle);
        const curStyle = effortCore.normalizeEffortStyle(cfg.effortSliderStyle);
        if (curStyle !== r.condStyle) row.setAttribute('data-ag-cs-dim', '1');
      }
      const inner = mkEl('div', 'py-2 px-3 w-full bg-transparent flex justify-between gap-4 items-center');
      const textCol = mkEl('div', 'flex-1 flex flex-col gap-0.5');
      const titleLine = mkEl('div', 'ag-cs-settings-title-line');
      const tSpan = mkEl('span', 'text-sm');
      tSpan.setAttribute('data-k', 't');
      tSpan.textContent = r.title;
      titleLine.appendChild(tSpan);
      if (r.badge) {
        const badgeSpan = mkEl('span', 'ag-cs-settings-hint-pill');
        badgeSpan.textContent = r.badge;
        titleLine.appendChild(badgeSpan);
      }
      const dSpan = mkEl('span', 'text-xs text-muted-foreground whitespace-pre-wrap');
      dSpan.setAttribute('data-k', 'd');
      dSpan.textContent = r.desc;
      textCol.appendChild(titleLine);
      textCol.appendChild(dSpan);

      const ctlWrap = mkEl('div', 'shrink-0');
      const group = mkEl('div', 'inline-flex items-center rounded-lg border border-border bg-secondary/20 p-0.5 gap-0.5 select-none min-h-8');
      group.setAttribute('role', 'group');
      const curVal = r.key === 'language' ? lang : cfg[r.key];
      for (const [val, lbl] of r.opts) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = BTN;
        b.textContent = lbl;
        b.setAttribute('data-ag-cs-key', r.key);
        b.setAttribute('data-ag-cs-val', JSON.stringify(val));
        const on = curVal === val;
        b.setAttribute('aria-pressed', String(on));
        if (on) b.setAttribute('data-pressed', '');
        b.addEventListener('click', () => {
          for (const sib of group.children) {
            sib.setAttribute('aria-pressed', String(sib === b));
            sib.toggleAttribute('data-pressed', sib === b);
          }
          saveSetting(r.key, val);
          syncCondDims(sec);
          if (r.key === 'effortSliderStyle' || r.key === 'effortAccent' || r.key === 'performanceBackdrop') {
            refreshOpenEffortPopover();
          }
        });
        group.appendChild(b);
      }
      ctlWrap.appendChild(group);
      inner.appendChild(textCol);
      inner.appendChild(ctlWrap);
      row.appendChild(inner);
      return row;
    };

    const headWrap = mkEl('div', 'flex flex-col gap-1');
    const headRow = mkEl('div', 'flex items-center justify-between gap-2');
    const headTitleWrap = mkEl('div', 'flex items-center gap-1.5');
    const h3 = mkEl('h3', 'm-0 text-sm font-medium');
    h3.textContent = 'AGY Pet (agy-pet)';
    headTitleWrap.appendChild(h3);
    headRow.appendChild(headTitleWrap);

    const diagBtn = mkEl('span', 'ag-cs-settings-diag-btn');
    diagBtn.setAttribute('role', 'button');
    diagBtn.setAttribute('tabindex', '0');
    diagBtn.setAttribute('data-ag-cs-diag', 'scan');
    diagBtn.textContent = ui.compatScanBtn || 'Scan & Copy Diag';
    diagBtn.title = ui.compatScanTitle || 'Scan untranslated UI strings & host hook health, then copy report';
    const runDiagCopy = () => {
      const scan = scanMissingI18n();
      const reportText = buildCompatReport(scan);
      const curUi = uiText(getLang());
      writeTextToClipboard(reportText).then((clipOk) => {
        if (!diagBtn.isConnected) return;
        clearTimeout(diagBtn._agCsFeedbackTimer);
        diagBtn.setAttribute('data-action-state', clipOk ? 'ok' : 'error');
        diagBtn.textContent = clipOk
          ? `${curUi.copiedBtnLabel || '✓ Copied'} (${scan.missingCount} ${curUi.compatMissingWord || 'missing'})`
          : curUi.actionFailedLabel || '✕ Failed';
        diagBtn._agCsFeedbackTimer = setTimeout(() => {
          if (!diagBtn.isConnected) return;
          const resetUi = uiText(getLang());
          diagBtn.removeAttribute('data-action-state');
          diagBtn.textContent = resetUi.compatScanBtn || 'Scan & Copy Diag';
        }, 2000);
      });
    };
    diagBtn.addEventListener('click', runDiagCopy);
    diagBtn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        runDiagCopy();
      }
    });
    headRow.appendChild(diagBtn);

    headWrap.appendChild(headRow);
    sec.appendChild(headWrap);

    const groupsWrap = mkEl('div', 'ag-cs-settings-groups');
    for (const grp of groups) {
      const grpEl = mkEl('div', 'ag-cs-settings-group');
      grpEl.setAttribute('data-ag-cs-group', grp.id);
      const subHead = mkEl('div', 'ag-cs-settings-subhead');
      subHead.textContent = grp.title;
      grpEl.appendChild(subHead);

      const list = mkEl('div', 'bg-transparent rounded-xl border border-border overflow-hidden divide-y divide-border');
      for (const k of grp.keys) {
        if (rowDefs[k]) list.appendChild(buildRow(rowDefs[k]));
      }
      if (Array.isArray(grp.hudKeys) && grp.hudKeys.length > 0) {
        const details = mkEl('details', 'ag-cs-settings-details');
        const anyHudActive = grp.hudKeys.some((hk) => cfg[hk] === true);
        if (wasHudOpen || anyHudActive) {
          details.open = true;
          details.setAttribute('open', '');
        }
        const summary = mkEl('summary', 'ag-cs-settings-summary');
        const sumLabel = mkEl('span', 'ag-cs-settings-summary-label');
        sumLabel.textContent = ui.hudSummaryLabel || 'Composer Surround HUD (Optional)';
        const sumMeta = mkEl('span', 'ag-cs-settings-summary-meta');
        sumMeta.textContent = typeof ui.hudSummaryMeta === 'function' ? ui.hudSummaryMeta(grp.hudKeys.length) : `${grp.hudKeys.length} options`;
        summary.appendChild(sumLabel);
        summary.appendChild(sumMeta);
        details.appendChild(summary);

        const bodyWrap = mkEl('div', 'ag-cs-settings-details-body divide-y divide-border');
        for (const hk of grp.hudKeys) {
          if (rowDefs[hk]) bodyWrap.appendChild(buildRow(rowDefs[hk]));
        }
        details.appendChild(bodyWrap);
        list.appendChild(details);
      }
      grpEl.appendChild(list);
      groupsWrap.appendChild(grpEl);
    }
    sec.appendChild(groupsWrap);
    anchor.parentElement.appendChild(sec);
  }

  // ── Main Synchronization Loop & Global Event Handlers ──────────────────
  let syncQueued = false;
  let syncTimer = null;
  let syncIsRaf = false;

  function cancelScheduledSync() {
    if (syncTimer === null) return;
    try {
      if (syncIsRaf && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(syncTimer);
      } else {
        clearTimeout(syncTimer);
      }
    } catch {}
    syncTimer = null;
    syncQueued = false;
  }

  function isOwnPluginNode(target) {
    const el = target && target.closest ? target : target?.parentElement;
    if (!el || !el.closest) return false;
    return Boolean(
      el.closest(
        '.ag-cs-home-panel-seat, .ag-cs-ripple-host, .ag-cs-crab, .ag-cs-neko-menu, .ag-cs-inline-stats, .ag-cs-context-ring, .ag-cs-quota-ring, .ag-cs-ctx-popover, .ag-cs-effort-popover, .ag-cs-perf-backdrop, .ag-cs-smooth-caret, .ag-cs-turn-bar, .ag-cs-hud-top-bar, .ag-cs-hud-bottom-bar, .ag-cs-hud-footer-chip, #' +
          SETTINGS_SEC_ID +
          ', #ag-claude-style-css'
      )
    );
  }

  function runSync() {
    if (destroyed) return;
    if (openPopover && (!openPopover.isConnected || !openPopoverAnchor || !openPopoverAnchor.isConnected)) {
      closeContextPopover();
    }
    if (openEffortPop && (!openEffortPop.isConnected || !openEffortAnchor || !openEffortAnchor.isConnected)) {
      closeEffortPopover();
    }
    applyRootAttrs();
    const inHero = Boolean(document.querySelector('.agy-home [data-testid="home-greeting"]'));
    syncGreeting(inHero);
    if (inHero && cfg.homeLayout === 'studio') {
      renderHomePanel();
    } else {
      unmountPanelSeat();
    }
    syncRipple();
    syncComposers();
    ensureSettingsSection();
  }

  function scheduleSync() {
    if (destroyed || syncQueued) return;
    syncQueued = true;
    if (!document.hidden && typeof requestAnimationFrame === 'function') {
      syncIsRaf = true;
      syncTimer = requestAnimationFrame(() => {
        syncTimer = null;
        syncQueued = false;
        runSync();
      });
    } else {
      syncIsRaf = false;
      syncTimer = setTimeout(() => {
        syncTimer = null;
        syncQueued = false;
        runSync();
      }, 50);
    }
  }

  function onStoreChanged() {
    const inHero = Boolean(document.querySelector('.agy-home'));
    if (inHero && cfg.homeLayout === 'studio') {
      refreshUsageRollup(false);
    }
    scheduleSync();
  }

  function findClickedEffortBadge(ev) {
    const t = ev?.target;
    if (!t || !t.closest) return null;
    return t.closest('[data-testid="model-selector-trigger"] .ag-cs-effort-badge, [data-testid="model-selector-trigger"] [data-ag-cs-effort]');
  }

  function onDocPointerDown(ev) {
    const effortBadge = findClickedEffortBadge(ev);
    if (effortBadge) {
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      ev.preventDefault();
      return;
    }
    if (openPopover && !openPopover.contains(ev.target) && (!openPopoverAnchor || !openPopoverAnchor.contains(ev.target))) {
      closeContextPopover();
    }
    if (openEffortPop && !openEffortPop.contains(ev.target) && (!openEffortAnchor || !openEffortAnchor.contains(ev.target))) {
      closeEffortPopover();
    }
    if (crabState.root) {
      crabState.stage.quietSince = Date.now();
      if (crabState.stage.asleep) {
        crabState.stage.asleep = false;
        crabState.stage.waking = !motionReduced();
        stepCrab();
      }
    }
    queueSmoothCaret(false);
  }

  function onDocMouseDown(ev) {
    const effortBadge = findClickedEffortBadge(ev);
    if (effortBadge) {
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      ev.preventDefault();
    }
  }

  const submitSyncTimers = new Set();

  function markUserSubmitted() {
    lastUserSubmitAt = Date.now();
    scheduleSync();
    for (const delay of [350, 1100]) {
      const id = setTimeout(() => {
        submitSyncTimers.delete(id);
        if (!destroyed) scheduleSync();
      }, delay);
      submitSyncTimers.add(id);
    }
  }

  function onDocClick(ev) {
    if (crabState.menuEl && (!ev?.target?.closest || !ev.target.closest('.ag-cs-neko-menu'))) {
      closeNekoMenu();
    }
    const effortBadge = findClickedEffortBadge(ev);
    if (effortBadge) {
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      ev.preventDefault();
      const modelBtn = effortBadge.closest('[data-testid="model-selector-trigger"]');
      openEffortPopover(effortBadge, modelBtn);
      return;
    }
    const modelBtn = ev?.target?.closest ? ev.target.closest('[data-testid="model-selector-trigger"]') : null;
    if (modelBtn && openEffortPop) {
      closeEffortPopover();
    }
    const submitBtn = ev?.target?.closest ? ev.target.closest('button') : null;
    if (submitBtn && submitBtn.closest && submitBtn.closest('[data-testid="agent-input-box"]')) {
      const tid = String(submitBtn.getAttribute('data-testid') || '');
      const bType = String(submitBtn.getAttribute('type') || '');
      const aria = String(submitBtn.getAttribute('aria-label') || '');
      if (bType === 'submit' || /send|submit/i.test(tid) || /send|submit|发送|傳送|送信/i.test(aria)) {
        markUserSubmitted();
      }
    }
  }

  function onDocKeyDown(ev) {
    if (ev.key === 'Escape') {
      closeNekoMenu();
      if (openPopover) closeContextPopover();
      if (openEffortPop) closeEffortPopover();
      return;
    }
    if (
      ev.key === 'Enter' &&
      !ev.shiftKey &&
      !ev.isComposing &&
      ev.target?.closest &&
      ev.target.closest('[data-testid="agent-input-box"]')
    ) {
      markUserSubmitted();
    }
  }

  let popoverDraftRaf = 0;
  let popoverDraftTimer = 0;

  function flushLiveDraftPopoverUpdate() {
    popoverDraftRaf = 0;
    popoverDraftTimer = 0;
    if (destroyed || !openPopover || !openPopover.isConnected) return;
    const latest =
      activeTrajCache.get(openPopoverCascadeId)?.data ||
      openPopoverAnchor?.closest?.('.surface-composer-card')?._agCsLastData ||
      null;
    const card =
      openPopoverAnchor?.closest?.('.surface-composer-card') ||
      document.querySelector('[data-testid="agent-input-box"] .surface-composer-card');
    const { ring, draftEst } = getRingTelemetryForCard(card, latest);
    const draft = Number(draftEst.tokens || 0);
    const hasDraft = draft > 0;
    const isLowCtx = Boolean((latest?.calls > 0 || ring.usedTokens > 0) && ring.contextRemainingPct <= 20);
    const curLowCtxAttr = isLowCtx ? (ring.contextRemainingPct <= 10 ? 'danger' : 'warn') : '';
    const usedHero = openPopover.querySelector('[data-ag-live-used]');
    if (
      activeHudTab === 'breakdown' &&
      usedHero &&
      Boolean(openPopover._agCsHadDraft) === hasDraft &&
      (openPopover._agCsLowCtxAttr || '') === curLowCtxAttr
    ) {
      const lang = getLang();
      const ui = uiText(lang);
      const totalW = ring.maxTokens || 256000;
      const pctOf = (v) => Math.max(0, Math.min(100, (v / totalW) * 100)).toFixed(2);
      const remStr = `${formatCompactK(ring.remainingTokens)} / ${formatCompactK(totalW)} (${ring.contextRemainingPct.toFixed(1)}%)`;
      const usedStr = `${formatCompactK(ring.usedTokens)} (${ring.contextUsedPct.toFixed(1)}%)`;
      const remHero = openPopover.querySelector('[data-ag-live-rem-hero]');
      const draftSeg = openPopover.querySelector('[data-ag-live-draft-seg]');
      const kpiRemV = openPopover.querySelector('[data-ag-live-kpi-rem-v]');
      const kpiRemSub = openPopover.querySelector('[data-ag-live-kpi-rem-sub]');
      const draftLabel = openPopover.querySelector('[data-ag-live-draft-label]');
      const draftVal = openPopover.querySelector('[data-ag-live-draft-val]');
      const remVal = openPopover.querySelector('[data-ag-live-rem-val]');

      if (remHero) {
        remHero.style.color = ring.color;
        remHero.textContent = `${ui.remAvailLabel || 'Remaining'} ${remStr}`;
      }
      usedHero.textContent = `${ui.usedWord || 'Used'} ${usedStr}${hasDraft ? ` · ${ui.draftWord || 'Draft'} +${formatCompactK(draft)}` : ''}`;
      if (draftSeg) draftSeg.style.width = `${pctOf(draft)}%`;
      if (kpiRemV) {
        kpiRemV.style.color = ring.color;
        kpiRemV.innerHTML = `${formatCompactK(ring.remainingTokens)} <small>(${ring.contextRemainingPct.toFixed(1)}%)</small>`;
      }
      if (kpiRemSub) {
        kpiRemSub.textContent = `${ui.usedWord || 'Used'} ${formatCompactK(ring.usedTokens)} / ${formatCompactK(totalW)}`;
      }
      if (draftLabel) {
        draftLabel.textContent =
          typeof ui.liveDraftN === 'function' ? ui.liveDraftN(draftEst.chars) : `Live Draft (${draftEst.chars} chars)`;
      }
      if (draftVal) {
        draftVal.innerHTML = `${formatCompactK(draft)} <small>(${((draft / totalW) * 100).toFixed(1)}%)</small>`;
      }
      if (remVal) {
        remVal.innerHTML = `${formatCompactK(ring.remainingTokens)} <small>(${((ring.remainingTokens / totalW) * 100).toFixed(1)}%)</small>`;
      }
      return;
    }
    renderContextPopoverContent(openPopover, latest, openPopoverCascadeId);
    if (openPopoverAnchor) positionPopoverAboveAnchor(openPopover, openPopoverAnchor);
  }

  function scheduleLiveDraftPopoverUpdate() {
    if (popoverDraftRaf || popoverDraftTimer || destroyed) return;
    if (typeof requestAnimationFrame === 'function') {
      popoverDraftRaf = requestAnimationFrame(flushLiveDraftPopoverUpdate);
    } else {
      popoverDraftTimer = setTimeout(flushLiveDraftPopoverUpdate, 16);
    }
  }

  function onDocCaretEvent(ev) {
    const type = ev?.type || '';
    const isTyping = type === 'input' || type === 'keyup' || type === 'compositionupdate' || type === 'compositionend';
    const immediate = type === 'focusin' || type === 'mouseup' || type === 'transitionend';
    queueSmoothCaret(isTyping, immediate);
    if (type === 'input') {
      if (ev?.target?.closest && ev.target.closest('[data-testid="agent-input-box"]')) {
        if (crabState.root) {
          const now = Date.now();
          crabState.userTypingUntil = now + 1100;
          crabState.stage.quietSince = now;
          if (crabState.stage.asleep) {
            crabState.stage.asleep = false;
            stepCrab();
          } else if ((crabState.root.getAttribute('data-ag-cs-mood') || 'idle') === 'idle' && crabState.stage.current) {
            showCrabSheet(crabState.stage.current, now);
          }
          crabState.root.setAttribute('data-ag-cs-user-typing', '1');
          if (crabState.userTypingTimer) clearTimeout(crabState.userTypingTimer);
          crabState.userTypingTimer = setTimeout(() => {
            crabState.userTypingTimer = null;
            crabState.userTypingUntil = 0;
            if (crabState.root) {
              crabState.root.removeAttribute('data-ag-cs-user-typing');
              if ((crabState.root.getAttribute('data-ag-cs-mood') || 'idle') === 'idle' && crabState.stage.current) {
                showCrabSheet(crabState.stage.current, Date.now());
              }
            }
          }, 1150);
        }
        scheduleSync();
      }
      if (openPopover && openPopover.isConnected) {
        scheduleLiveDraftPopoverUpdate();
      }
    }
  }

  function onDocTransitionEnd(ev) {
    if (ev?.target?.closest && ev.target.closest('[data-testid="agent-input-box"]')) {
      queueSmoothCaret(false, true);
    }
  }

  function onWindowResize() {
    if (destroyed) return;
    if (openPopover && openPopover.isConnected && openPopoverAnchor && openPopoverAnchor.isConnected) {
      positionPopoverAboveAnchor(openPopover, openPopoverAnchor);
    }
    if (openEffortPop && openEffortPop.isConnected) {
      positionEffortPopover(openEffortPop, openEffortAnchor || openEffortModelBtn);
      if (typeof openEffortPop._syncEffortKnob === 'function') {
        openEffortPop._syncEffortKnob(true);
      }
    }
  }

  function isIgnorableMutation(m) {
    if (isOwnPluginNode(m.target)) return true;
    if (m.type === 'attributes' && m.target !== document.body && m.target !== document.documentElement) {
      return true;
    }
    const targetEl = m.target && typeof m.target.closest === 'function' ? m.target : m.target?.parentElement;
    if (m.type === 'characterData') {
      if (!targetEl || typeof targetEl.closest !== 'function') return true;
      return !targetEl.closest('[data-testid="conversation-view"], [data-testid="agent-input-box"]');
    }
    if (
      m.type === 'childList' &&
      targetEl &&
      typeof targetEl.closest === 'function' &&
      targetEl.closest('.monaco-editor, .xterm') &&
      !targetEl.closest('[data-testid="agent-input-box"]')
    ) {
      return true;
    }
    return false;
  }

  let charDataThrottleTimer = null;
  const observer = new MutationObserver((mutations) => {
    if (mutations.length === 0 || mutations.every(isIgnorableMutation)) return;
    const onlyCharData = mutations.every((m) => isIgnorableMutation(m) || m.type === 'characterData');
    if (onlyCharData) {
      if (!charDataThrottleTimer) {
        charDataThrottleTimer = setTimeout(() => {
          charDataThrottleTimer = null;
          if (!destroyed) scheduleSync();
        }, 250);
      }
      return;
    }
    scheduleSync();
  });

  const DOC_LISTENERS = [
    ['pointerdown', onDocPointerDown],
    ['mousedown', onDocMouseDown],
    ['click', onDocClick],
    ['keydown', onDocKeyDown],
    ['keyup', onDocCaretEvent],
    ['mouseup', onDocCaretEvent],
    ['input', onDocCaretEvent],
    ['selectionchange', onDocCaretEvent],
    ['focusin', onDocCaretEvent],
    ['focusout', onDocCaretEvent],
    ['scroll', onDocCaretEvent],
    ['compositionupdate', onDocCaretEvent],
    ['compositionend', onDocCaretEvent],
    ['transitionend', onDocTransitionEnd],
  ];

  let pollTimer = null;
  let coreTornDown = false;
  function teardownCore() {
    if (coreTornDown) return;
    coreTornDown = true;
    destroyed = true;
    cancelScheduledSync();
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (charDataThrottleTimer) {
      clearTimeout(charDataThrottleTimer);
      charDataThrottleTimer = null;
    }
    if (storeDebounce) {
      clearTimeout(storeDebounce);
      storeDebounce = null;
    }
    for (const id of submitSyncTimers) clearTimeout(id);
    submitSyncTimers.clear();
    if (caretRaf) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(caretRaf);
      caretRaf = 0;
    }
    if (popoverDraftRaf) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(popoverDraftRaf);
      popoverDraftRaf = 0;
    }
    if (popoverDraftTimer) {
      clearTimeout(popoverDraftTimer);
      popoverDraftTimer = 0;
    }
    if (storeUnsub) {
      try {
        storeUnsub();
      } catch {}
      storeUnsub = null;
    }
    unwatchAllAgentStateProviders();
    try {
      observer.disconnect();
    } catch {}
    for (const [evName, handler] of DOC_LISTENERS) {
      try {
        document.removeEventListener(evName, handler, true);
      } catch {}
    }
    if (typeof window.removeEventListener === 'function') {
      try {
        window.removeEventListener('resize', onWindowResize);
      } catch {}
    }
    if (Array.isArray(globalThis.__agCsCleanups)) {
      const idx = globalThis.__agCsCleanups.indexOf(teardownCore);
      if (idx >= 0) globalThis.__agCsCleanups.splice(idx, 1);
    }
  }

  globalThis.__agCsCleanups = Array.isArray(globalThis.__agCsCleanups) ? globalThis.__agCsCleanups : [];
  globalThis.__agCsCleanups.push(teardownCore);

  let lifecycleStarted = false;
  function startLifecycle() {
    if (destroyed || lifecycleStarted || !document.documentElement) return;
    lifecycleStarted = true;
    observer.observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    for (const [evName, handler] of DOC_LISTENERS) {
      document.addEventListener(evName, handler, true);
    }
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('resize', onWindowResize);
    }

    pollTimer = setInterval(() => {
      if (destroyed) return;
      applyRootAttrs();
      if (document.querySelector('.agy-home') && cfg.homeLayout === 'studio') {
        refreshUsageRollup(false);
      }
      if (document.querySelector('[data-testid="conversation-view"], [data-testid="agent-input-box"]')) {
        scheduleSync();
      } else if (cfg.desktopPet !== false && typeof window.__agCsNekoBinding === 'function') {
        syncNekoToDesktop(crabState.lastInfo, false);
      }
    }, Math.max(1000, Number(cfg.pollIntervalMs) || 2500));

    ensureHooks(true);
    applyRootAttrs();
    runSync();
    if (document.querySelector('.agy-home') && cfg.homeLayout === 'studio') {
      refreshUsageRollup(false);
    }
  }

  window.__agClaudeStyle = {
    version: VERSION,
    codeHash: CODE_HASH,
    refreshConfig(next) {
      if (next && typeof next === 'object') {
        runtimeInitConfig = { ...runtimeInitConfig, ...next };
        cfg = loadSettings(runtimeInitConfig);
      } else {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY) || '{}');
          cfg = { ...runtimeInitConfig, ...cfg, ...saved };
        } catch {}
      }
      applyRootAttrs();
      refreshOpenEffortPopover();
      runSync();
      scheduleSync();
    },
    openEffortPopover(badgeEl, modelBtn) {
      const b = badgeEl || document.querySelector('[data-testid="model-selector-trigger"] .ag-cs-effort-badge, [data-testid="model-selector-trigger"] [data-ag-cs-effort]');
      const m = modelBtn || b?.closest?.('[data-testid="model-selector-trigger"]') || document.querySelector('[data-testid="model-selector-trigger"]');
      openEffortPopover(b, m);
    },
    openContextPopover(anchorEl, tab) {
      const cands = Array.from(document.querySelectorAll('.ag-cs-context-ring, .ag-cs-inline-stats'));
      const a =
        anchorEl ||
        cands.find((el) => {
          const r = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
          return r && r.width > 0 && r.height > 0;
        }) ||
        cands[0];
      const card = a?.closest?.('.surface-composer-card');
      const ib = a?.closest?.('[data-testid="agent-input-box"]') || document.querySelector('[data-testid="agent-input-box"]');
      const cid = resolveCascadeId(ib);
      const data = (cid && activeTrajCache.get(cid)?.data) || card?._agCsLastData || null;
      if (a) openContextPopover(a, data, tab || 'breakdown');
    },
    activateConversation(targetCid, targetTitle, opts) {
      try {
        const allowRouterFallback = !opts || opts.allowRouterFallback !== false;
        const cleanCid = String(targetCid || '').trim();
        const cleanTitle = String(targetTitle || '').replace(/…$/, '').trim();
        const targetPath = cleanCid ? `/c/${cleanCid}` : '';
        const hash = String(location.hash || '');
        // Never navigate while a freshly opened window is still bootstrapping its one-time #t= auth token
        if (/(?:^|[#&])t=/.test(hash)) {
          return { matched: false, pending: 'auth-bootstrap' };
        }
        if (typeof document !== 'undefined' && document.readyState === 'loading') {
          return { matched: false, pending: 'doc-loading' };
        }
        if (targetPath && (location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`))) {
          return { matched: true, alreadyActive: true };
        }
        // 1. Direct SPA <a href="/c/<cid>"> link click (instant zero-reload navigation preserving ?project=...)
        const links = Array.from(document.querySelectorAll('a[href*="/c/"]'));
        if (cleanCid) {
          for (const a of links) {
            const href = String(a.getAttribute('href') || '');
            if (
              href === targetPath ||
              href.startsWith(`${targetPath}?`) ||
              href.startsWith(`${targetPath}#`) ||
              href.endsWith(targetPath) ||
              href.includes(`${targetPath}?`) ||
              href.includes(`${targetPath}#`)
            ) {
              a.click();
              return { matched: true, by: 'href' };
            }
          }
          const byCascadeRow = document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${cleanCid}"]`);
          if (byCascadeRow) {
            const innerLink = byCascadeRow.querySelector('a[href]');
            if (innerLink) innerLink.click();
            else byCascadeRow.click();
            return { matched: true, by: 'href' };
          }
        }
        // 2. Match sidebar row by title and click its inner <a href>
        const rows = Array.from(document.querySelectorAll('[data-testid="conversation-row-sidebar"]'));
        if (cleanTitle) {
          for (const row of rows) {
            const txt = String(row.textContent || '').replace(/\s+/g, ' ').trim();
            if (txt && (txt.includes(cleanTitle) || (cleanTitle.length >= 6 && txt.includes(cleanTitle.slice(0, 10))))) {
              const innerLink = row.querySelector('a[href]');
              if (innerLink) innerLink.click();
              else row.click();
              return { matched: true, by: 'title-link' };
            }
          }
        }
        // 3. TanStack Router SPA navigation via React Fiber context (only after app shell & sidebar are truly ready)
        const readyAnchors = Array.from(
          document.querySelectorAll(
            '[data-testid="conversation-view"], [data-testid="agent-input-box"], [data-testid="conversation-row-sidebar"], [data-testid="home-greeting"]'
          )
        );
        if (readyAnchors.length === 0) {
          return { matched: false, pending: 'bootstrapping' };
        }
        if (!allowRouterFallback) {
          return { matched: false, pending: 'waiting-sidebar' };
        }
        if (links.length === 0 && rows.length === 0 && !document.querySelector('[data-testid="agent-input-box"], [data-testid="conversation-view"]')) {
          return { matched: false, pending: 'waiting-sidebar' };
        }
        if (cleanCid && cleanCid.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(cleanCid)) {
          const candidates = readyAnchors.slice();
          const rootChild = document.querySelector('#root *');
          if (rootChild && !candidates.includes(rootChild)) candidates.push(rootChild);
          for (const el of candidates) {
            const fk = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
            for (let f = fk && el[fk], d = 0; f && d < 120; f = f.return, d++) {
              for (let c = f.dependencies && f.dependencies.firstContext; c; c = c.next) {
                const v = c.memoizedValue;
                if (v && typeof v === 'object' && typeof v.navigate === 'function' && v.latestLocation) {
                  if (v.state && v.state.status === 'pending') {
                    return { matched: false, pending: 'router-pending' };
                  }
                  const navOpts = { to: '/c/$cascadeId', params: { cascadeId: cleanCid } };
                  try {
                    const curSearch = typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search) : null;
                    const curProj = curSearch ? curSearch.get('project') : '';
                    if (curProj) navOpts.search = { project: curProj };
                  } catch {}
                  v.navigate(navOpts);
                  return { matched: true, by: 'router' };
                }
              }
            }
          }
        }
        return { matched: false, pending: 'not-found' };
      } catch {}
      return { matched: false };
    },
    diagnoseHostCompat,
    scanMissingI18n,
    buildCompatReport,
    getState() {
      return {
        cfg: { ...cfg },
        usageRecordsCount: usageRecords.size,
        hasPanel: Boolean(panelEl && panelEl.isConnected),
        hasRipple: Boolean(rippleMount && rippleMount.canvas.isConnected),
        hasCrab: Boolean(crabState.root && crabState.root.isConnected),
        hasSmoothCaret: Boolean(document.querySelector('.ag-cs-smooth-caret')),
        hasEffortPopover: Boolean(openEffortPop && openEffortPop.isConnected),
        hasContextPopover: Boolean(openPopover && openPopover.isConnected),
      };
    },
    destroy() {
      teardownCore();
      for (const fn of [
        closeContextPopover,
        closeEffortPopover,
        teardownSmoothCarets,
        clearTurnBadges,
        unmountRipple,
        unmountPanelSeat,
        unmountCrab,
        restoreGreetings,
        () => domTranslator && typeof domTranslator.destroy === 'function' && domTranslator.destroy(),
      ]) {
        try {
          fn();
        } catch {}
      }
      document.querySelectorAll('[data-ag-cs-placeholder]').forEach((el) => el.removeAttribute('data-ag-cs-placeholder'));
      document.querySelectorAll('[data-ag-cs-effort]').forEach((el) => {
        el.removeAttribute('data-ag-cs-effort');
        el.classList.remove('ag-cs-effort-badge');
      });
      document.querySelectorAll('[data-ag-cs-queued], [data-ag-cs-takeover]').forEach((el) => {
        el.removeAttribute('data-ag-cs-queued');
        el.removeAttribute('data-ag-cs-takeover');
        el.style.removeProperty('margin-bottom');
      });
      document.querySelectorAll('[data-ag-cs-rim]').forEach((el) => {
        el.removeAttribute('data-ag-cs-rim');
        el.style.removeProperty('--ag-cs-rim-color');
      });
      document
        .querySelectorAll(
          '.ag-cs-inline-stats, .ag-cs-context-ring, .ag-cs-quota-ring, .ag-cs-hud-top-bar, .ag-cs-hud-bottom-bar, .ag-cs-hud-rim-progress, .ag-cs-hud-footer-chip, .ag-cs-perf-backdrop, #' + SETTINGS_SEC_ID
        )
        .forEach((el) => el.remove());
      const html = document.documentElement;
      if (html) {
        for (const attr of [
          'data-ag-cs-style',
          'data-ag-cs-palette',
          'data-ag-cs-home',
          'data-ag-cs-composer',
          'data-ag-cs-logo-ink',
          'data-ag-cs-sidebar',
          'data-ag-cs-sidebar-compact',
          'data-ag-cs-hud-compact',
          'data-ag-cs-effort-accent',
          'data-ag-cs-perf-backdrop',
          'data-ag-cs-lang',
          'data-ag-cs-cjk',
        ]) {
          html.removeAttribute(attr);
        }
      }
    },
  };

  if (document.documentElement) {
    startLifecycle();
  } else if (typeof document.addEventListener === 'function') {
    const onReady = () => {
      if (document.documentElement) {
        document.removeEventListener('readystatechange', onReady);
        document.removeEventListener('DOMContentLoaded', onReady);
        startLifecycle();
      }
    };
    document.addEventListener('readystatechange', onReady);
    document.addEventListener('DOMContentLoaded', onReady);
  }
});
