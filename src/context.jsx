import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchDB, pushDB, resetRemoteDB, emptyDB, uid, BROWSER_STORAGE, saveLocalDB,
  SESSION_KEY, LANG_KEY, PAGE_ACTIONS,
} from "./store";
import { makeT } from "./i18n";
import { DEMO_USER, isBlankDB, mergeDemoInto } from "./demo";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// Edits are coalesced for this long before hitting the database, so typing in a
// form doesn't produce one write per keystroke.
const SAVE_DELAY = 400;

export function AppProvider({ children }) {
  const [db, setDb] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error

  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  });
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || "fr");

  const pending = useRef(null);   // newest document waiting to be written
  const timer = useRef(null);
  const inFlight = useRef(false);

  // ---- load ----
  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setDb(await fetchDB());
      setStatus("ready");
      setLoadError("");
    } catch (err) {
      setLoadError(err.message || String(err));
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // ---- save ----
  const flush = useCallback(async () => {
    if (inFlight.current || !pending.current) return;
    const doc = pending.current;
    pending.current = null;
    inFlight.current = true;
    setSaveState("saving");
    try {
      await pushDB(doc);
      setSaveState(pending.current ? "saving" : "saved");
    } catch (err) {
      console.error("[garage] enregistrement", err);
      setSaveState("error");
    } finally {
      inFlight.current = false;
      if (pending.current) flush(); // changes that arrived mid-write
    }
  }, []);

  const queueSave = useCallback((doc) => {
    pending.current = doc;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }, [flush]);

  // Don't lose the last few hundred milliseconds of edits when the tab closes.
  useEffect(() => {
    const onHide = () => {
      if (!pending.current) return;
      if (BROWSER_STORAGE) {
        try { saveLocalDB(pending.current); pending.current = null; } catch { /* keep pending */ }
        return;
      }
      const blob = new Blob([JSON.stringify(pending.current)], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/db", blob)) pending.current = null;
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  // mutate a deep copy, persist, set state
  const update = useCallback((mutator) => {
    setDb((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      mutator(next);
      queueSave(next);
      return next;
    });
  }, [queueSave]);

  const replaceAll = useCallback((doc) => {
    setDb(doc);
    queueSave(doc);
  }, [queueSave]);

  // ---- session ----
  const persistSession = (s) => {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
    setSession(s);
  };

  const setLang = (l) => { localStorage.setItem(LANG_KEY, l); setLangState(l); };
  const t = useMemo(() => makeT(lang), [lang]);

  const login = (identifier, password) => {
    if (!db) return false;
    const idl = identifier.trim().toLowerCase();
    const admin = db.users.find(
      (u) => (u.username.toLowerCase() === idl || u.email.toLowerCase() === idl) && u.password === password
    );
    if (admin) { persistSession({ kind: "admin", id: admin.id }); return true; }
    const worker = db.workers.find(
      (w) => w.account?.enabled &&
        (w.account.username?.toLowerCase() === idl || w.account.email?.toLowerCase() === idl) &&
        w.account.password === password
    );
    if (worker) { persistSession({ kind: "worker", id: worker.id }); return true; }
    return false;
  };

  const register = ({ name, username, email, password }) => {
    const exists = db.users.some(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (exists) return { error: "Ce nom d'utilisateur existe déjà" };
    const user = { id: uid(), name, username: username.trim(), email, password, role: "admin" };
    update((d) => d.users.push(user));
    persistSession({ kind: "admin", id: user.id });
    return { ok: true };
  };

  /**
   * One-click access to the demo admin. A blank database is filled with the demo
   * set straight away; one holding real data only gets it after the user agrees
   * (`merge`), and the demo records are then added next to the real ones.
   */
  const loginDemo = ({ merge = false } = {}) => {
    if (!db) return { error: "Base de données indisponible" };
    if (db.users.some((u) => u.id === DEMO_USER.id)) {
      persistSession({ kind: "admin", id: DEMO_USER.id });
      return { ok: true };
    }
    if (!merge && !isBlankDB(db)) return { needsConfirm: true };
    update((d) => { mergeDemoInto(d); });
    persistSession({ kind: "admin", id: DEMO_USER.id });
    return { ok: true };
  };

  const logout = () => persistSession(null);

  const currentUser = useMemo(() => {
    if (!session || !db) return null;
    if (session.kind === "admin") {
      const u = db.users.find((x) => x.id === session.id);
      return u ? { ...u, kind: "admin" } : null;
    }
    const w = db.workers.find((x) => x.id === session.id);
    return w
      ? { id: w.id, name: w.fullName, username: w.account.username, email: w.account.email, kind: "worker", permissions: w.permissions }
      : null;
  }, [session, db]);

  const can = (page, action = "view") => {
    if (!currentUser) return false;
    if (currentUser.kind === "admin") return true;
    const acts = currentUser.permissions?.[page];
    if (!acts) return false;
    if (action === "view") return true;
    return acts.includes(action) || !PAGE_ACTIONS[page]?.includes(action);
  };

  const value = {
    db: db || emptyDB(),
    status, loadError, saveState, reload: load,
    update, session, currentUser, login, loginDemo, register, logout,
    lang, setLang, t, can,
    // No account exists yet on a fresh database — the login screen offers sign-up only.
    needsSetup: !!db && db.users.length === 0 && !db.workers.some((w) => w.account?.enabled),
    resetData: async () => {
      const fresh = await resetRemoteDB();
      pending.current = null;
      clearTimeout(timer.current);
      setDb(fresh);
      persistSession(null);
      setSaveState("saved");
    },
    restoreData: (data) => replaceAll(data),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
