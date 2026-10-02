import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarPlus, Wrench, Eye, Pencil, Trash2, Wallet, CheckCircle2, Ban,
  Plus, X, Car, User, Phone, Package, Minus, Printer, FileText, Building2, Check, Droplet,
} from "lucide-react";
import { useApp } from "../context";
import {
  uid, todayISO, fmtMoney, fmtDate, paidOf, presetRange, inRange,
  serviceNamesOf, restockRepair, consumeRepairStock,
  printHTML, esc, docHead, docStamp, repairAmounts, DEFAULT_TVA_RATE,
  isCompany, CAR_FIELDS, emptyCar, carLabel, carTitle, fmtKm, repairVehiclesOf, clientCarsOf,
  OIL_FILTERS, guessFilters, oilTicketHTML, printOilTicket, findByBarcode,
} from "../store";
import { ScanButton } from "../components/BarcodeScanner";
import {
  Btn, IconBtn, Modal, Confirm, Field, Input, Textarea, SearchBox,
  Badge, StatusBadge, Empty, PageHeader, Steps, StepPane, Seg, CardGrid,
  itemRise, InfoRow, MoneyLine,
} from "../components/ui";
import { ClientFields, emptyClientForm, buildClient } from "../components/ClientFields";

// ========== Reusable pickers ==========

/**
 * `optional` lets the step be left empty — the job is then recorded for a
 * walk-in customer. A balance left unpaid still needs a real client, which the
 * summary step enforces.
 */
export function ClientPicker({ value, onChange, optional }) {
  const { db, update, t } = useApp();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyClientForm);
  const selected = db.clients.find((c) => c.id === value);

  const results = q
    ? db.clients.filter(
        (c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      ).slice(0, 6)
    : [];

  const createClient = () => {
    if (!form.name.trim()) return;
    const c = buildClient(form);
    update((d) => d.clients.push(c));
    onChange(c.id);
    setCreating(false); setForm(emptyClientForm()); setQ("");
  };

  return (
    <div className="space-y-3">
      {selected ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full grad-primary text-sm font-bold text-white">
              {isCompany(selected) ? <Building2 size={16} /> : selected.name.slice(0, 1)}
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary-900">
                {selected.name}
                {isCompany(selected) && <Badge color="blue">{t("Entreprise")}</Badge>}
              </p>
              <p className="text-xs text-slate-500">{selected.phone || "—"}</p>
            </div>
          </div>
          <IconBtn icon={X} title={t("Annuler")} onClick={() => onChange("")} />
        </motion.div>
      ) : (
        <>
          <SearchBox value={q} onChange={setQ} placeholder={t("Rechercher client (nom ou téléphone)...")} />
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="overflow-hidden rounded-xl border border-primary-100">
                {results.map((c) => (
                  <button key={c.id} onClick={() => { onChange(c.id); setQ(""); }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-start transition-colors hover:bg-primary-50 cursor-pointer border-b border-primary-50 last:border-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-primary-900">
                      {isCompany(c) && <Building2 size={14} className="text-sky-600" />}{c.name}
                    </span>
                    <span className="text-xs text-slate-400">{c.phone}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {!creating ? (
            <Btn variant="soft" icon={Plus} onClick={() => setCreating(true)}>{t("Nouveau client")}</Btn>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 rounded-xl border border-dashed border-primary-300 bg-primary-50/40 p-4">
              <ClientFields form={form} setForm={setForm} />
              <div className="flex gap-2">
                <Btn onClick={createClient}>{t("Créer")}</Btn>
                <Btn variant="ghost" onClick={() => setCreating(false)}>{t("Annuler")}</Btn>
              </div>
            </motion.div>
          )}
          {optional && (
            <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs leading-snug text-slate-500">
              {t("Laissez vide pour enregistrer en client de passage. Un reste à payer exigera un client.")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function ServicePicker({ selected, onChange }) {
  const { db, update, t } = useApp();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const createService = () => {
    if (!form.name.trim()) return;
    const s = { id: uid(), name: form.name.trim(), description: form.description, price: Number(form.price) || 0 };
    update((d) => d.services.push(s));
    onChange([...selected, s.id]);
    setCreating(false); setForm({ name: "", description: "", price: "" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {db.services.map((s) => {
          const on = selected.includes(s.id);
          return (
            <motion.button key={s.id} whileTap={{ scale: 0.95 }} onClick={() => toggle(s.id)}
              className={`rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-all cursor-pointer ${
                on ? "grad-primary border-transparent text-white shadow-lift" : "border-primary-200 bg-white text-slate-600 hover:border-primary-400"
              }`}>
              {s.name} <span className={`ms-1 font-mono text-[11px] ${on ? "text-white/70" : "text-primary-500"}`}>{fmtMoney(s.price)}</span>
            </motion.button>
          );
        })}
      </div>
      {!creating ? (
        <Btn variant="soft" icon={Plus} onClick={() => setCreating(true)}>{t("Nouveau service")}</Btn>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="space-y-3 rounded-xl border border-dashed border-primary-300 bg-primary-50/40 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("Nom du service")} required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("Prix du service")} required>
              <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
          </div>
          <Field label={t("Description")}>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Btn onClick={createService}>{t("Ajouter le service")}</Btn>
            <Btn variant="ghost" onClick={() => setCreating(false)}>{t("Annuler")}</Btn>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function ProductPicker({ items, onChange }) {
  const { db, t } = useApp();
  const [q, setQ] = useState("");
  const [scanErr, setScanErr] = useState("");
  const results = q
    ? db.products.filter(
        (p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode || "").includes(q)
      ).slice(0, 6)
    : [];

  // Scans can arrive several per second, before the parent re-renders: work
  // from the latest list rather than the one this render was given.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const add = (p) => {
    if (!items.some((i) => i.productId === p.id)) onChange([...items, { productId: p.id, qty: 1 }]);
    setQ("");
  };
  const setQty = (id, qty) =>
    onChange(items.map((i) => (i.productId === id ? { ...i, qty: Math.max(1, qty) } : i)));

  // A scanned product is added, or its quantity goes up by one if already listed.
  const scan = (code) => {
    const p = findByBarcode(db, code);
    if (!p) { setScanErr(`${t("Aucun produit avec ce code-barres")} : ${code}`); return t("Introuvable"); }
    setScanErr("");
    const cur = itemsRef.current;
    const next = cur.some((i) => i.productId === p.id)
      ? cur.map((i) => (i.productId === p.id ? { ...i, qty: Number(i.qty) + 1 } : i))
      : [...cur, { productId: p.id, qty: 1 }];
    itemsRef.current = next;
    onChange(next);
    return "";
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchBox value={q} onChange={setQ} placeholder={t("Rechercher un produit ou scanner...")}
            onKeyDown={(e) => {
              // USB scanners type the code then Enter
              if (e.key === "Enter" && q.trim() && findByBarcode(db, q)) { e.preventDefault(); scan(q); setQ(""); }
            }} />
        </div>
        <ScanButton continuous onDetected={scan} title={t("Scanner des produits")} />
      </div>
      {scanErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{scanErr}</p>}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="overflow-hidden rounded-xl border border-primary-100">
            {results.map((p) => (
              <button key={p.id} onClick={() => add(p)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-start transition-colors hover:bg-primary-50 cursor-pointer border-b border-primary-50 last:border-0">
                <span className="text-sm font-medium text-primary-900">{p.name}</span>
                <span className="text-xs text-slate-400">
                  {p.qtyCurrent} {t("en stock")} · <span className="font-mono text-primary-600">{fmtMoney(p.salePrice || p.purchasePrice)}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it) => {
            const p = db.products.find((x) => x.id === it.productId);
            if (!p) return null;
            return (
              <motion.div key={it.productId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-primary-100 bg-white px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Package size={15} className="shrink-0 text-primary-400" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-primary-900">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{fmtMoney(p.salePrice || p.purchasePrice)} · {p.qtyCurrent} {t("en stock")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconBtn icon={Minus} title="-" onClick={() => setQty(it.productId, Number(it.qty) - 1)} />
                  <span className="w-8 text-center font-mono text-sm font-bold">{it.qty}</span>
                  <IconBtn icon={Plus} title="+" onClick={() => setQty(it.productId, Number(it.qty) + 1)} />
                  <IconBtn icon={X} title={t("Supprimer")} variant="danger"
                    onClick={() => onChange(items.filter((i) => i.productId !== it.productId))} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WorkerPicker({ selected, onChange }) {
  const { db } = useApp();
  return (
    <div className="flex flex-wrap gap-2">
      {db.workers.map((w) => {
        const on = selected.includes(w.id);
        return (
          <motion.button key={w.id} whileTap={{ scale: 0.95 }}
            onClick={() => onChange(on ? selected.filter((x) => x !== w.id) : [...selected, w.id])}
            className={`rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-all cursor-pointer ${
              on ? "grad-accent border-transparent text-white shadow-lift" : "border-primary-200 bg-white text-slate-600 hover:border-accent-400"
            }`}>
            {w.fullName}
          </motion.button>
        );
      })}
    </div>
  );
}

// ========== TVA ==========

// Optional VAT on top of the HT base — defaults to 19%, editable.
function TvaSection({ on, setOn, rate, setRate, base, tva, total }) {
  const { t } = useApp();
  return (
    <div className="space-y-3 rounded-xl border border-primary-200 bg-white/70 p-3.5">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={on}
          onChange={(e) => setOn(e.target.checked)} />
        <span className="text-sm font-semibold text-primary-900">{t("Appliquer la TVA")}</span>
        {!on && <span className="text-xs text-slate-400">({DEFAULT_TVA_RATE}% {t("par défaut")})</span>}
      </label>
      <AnimatePresence initial={false}>
        {on && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="space-y-2.5 overflow-hidden">
            <Field label={t("Taux de TVA (%)")}>
              <Input type="number" min="0" max="100" step="0.1" value={rate}
                onChange={(e) => setRate(e.target.value)} />
            </Field>
            <MoneyLine label={t("Total HT")} value={fmtMoney(base)} />
            <MoneyLine label={`${t("TVA")} (${Number(rate) || 0}%)`} value={fmtMoney(tva)} color="text-accent-600" />
          </motion.div>
        )}
      </AnimatePresence>
      <MoneyLine label={t(on ? "Total TTC" : "Total à payer")} value={fmtMoney(total)} big />
    </div>
  );
}

// ========== helpers ==========
const itemsTotal = (db, serviceIds, products) => {
  const s = serviceIds.reduce((sum, id) => sum + Number(db.services.find((x) => x.id === id)?.price || 0), 0);
  const p = products.reduce((sum, it) => {
    const pr = db.products.find((x) => x.id === it.productId);
    return sum + Number(pr?.salePrice || pr?.purchasePrice || 0) * Number(it.qty);
  }, 0);
  return s + p;
};

const serviceIdsOf = (v) => (v.services || []).map((s) => s.serviceId).filter(Boolean);
const pickCar = (c) => Object.fromEntries(CAR_FIELDS.map((k) => [k, c?.[k] ?? ""]));
const numOrEmpty = (v) => (v === "" || v === null || v === undefined ? "" : Number(v) || 0);

// Stand-in for "no vehicle picked": services are still recorded, just not on a car.
const NONE = "_none";

// ========== Vehicles ==========

function CarEditor({ car, setCar, onSave, onCancel, isEdit }) {
  const { t } = useApp();
  const set = (k) => (e) => setCar({ ...car, [k]: e.target.value });
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      className="space-y-3 rounded-xl border border-dashed border-primary-300 bg-primary-50/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-primary-400">
        {isEdit ? t("Modifier le véhicule") : t("Nouveau véhicule")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={t("Marque")}><Input value={car.brand} onChange={set("brand")} /></Field>
        <Field label={t("Nom du véhicule")}><Input value={car.name} onChange={set("name")} /></Field>
        <Field label={t("Année")}><Input value={car.year} onChange={set("year")} /></Field>
        <Field label={t("Immatriculation")}><Input value={car.plate} onChange={set("plate")} /></Field>
        <Field label={t("Couleur")}><Input value={car.color} onChange={set("color")} /></Field>
        <Field label={t("Kilométrage")}><Input type="number" min="0" value={car.km} onChange={set("km")} /></Field>
      </div>
      <Field label={t("Description")}><Input value={car.description} onChange={set("description")} /></Field>
      <div className="flex gap-2">
        <Btn icon={Check} onClick={onSave}>{isEdit ? t("Enregistrer") : t("Ajouter le véhicule")}</Btn>
        {onCancel && <Btn variant="ghost" onClick={onCancel}>{t("Annuler")}</Btn>}
      </div>
    </motion.div>
  );
}

/** Tabs across the vehicles of a repair — hidden when there is only one. */
function VehicleTabs({ items, current, onChange }) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <button key={i} onClick={() => onChange(i)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
            i === current ? "grad-primary border-transparent text-white shadow-lift" : "border-primary-200 bg-white text-slate-600 hover:border-primary-400"
          }`}>
          <Car size={14} /> <span className="max-w-[180px] truncate">{it.title}</span>
          <span className={`rounded-full px-1.5 text-[11px] ${i === current ? "bg-white/25" : "bg-primary-100 text-primary-700"}`}>{it.count}</span>
        </button>
      ))}
    </div>
  );
}

// ========== Wizard (create / edit appointment & repair) ==========

/**
 * Vehicle state of the wizard, rebuilt from a repair being edited:
 * `cars` — every car on offer (the client's fleet + cars added here),
 * `picked` — ids of the cars this job is for,
 * `work` — per car: new mileage, services and products.
 */
function initVehicles(db, editing) {
  const client = db.clients.find((c) => c.id === editing?.clientId);
  const cars = clientCarsOf(db, client).map((c) => ({ ...c }));
  const picked = [];
  const work = {};
  if (editing) {
    repairVehiclesOf(editing).forEach((v) => {
      const hasCar = v.carId || carLabel(v.car) || v.car?.plate;
      let id = NONE;
      if (hasCar) {
        id = v.carId || uid();
        if (!cars.some((c) => c.id === id)) cars.push({ ...emptyCar(), ...v.car, id, km: v.km ?? "", isNew: !client });
        picked.push(id);
      }
      work[id] = {
        km: v.km ?? "", serviceIds: serviceIdsOf(v),
        products: (v.products || []).map((p) => ({ ...p })), oilChange: v.oilChange,
      };
    });
  }
  return { cars, picked, work };
}

function RepairWizard({ mode, editing, onClose, onCreated }) {
  const { db, update, t, currentUser } = useApp();
  const isAppt = mode === "appointment";
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");

  const [dates, setDates] = useState(() => ({
    inDate: editing?.dateIn?.slice(0, 10) || todayISO(),
    inTime: editing?.dateIn?.slice(11, 16) || "09:00",
    outDate: editing?.dateOut?.slice(0, 10) || todayISO(),
    outTime: editing?.dateOut?.slice(11, 16) || "17:00",
  }));
  const [clientId, setClientId] = useState(editing?.clientId || "");
  const [init] = useState(() => initVehicles(db, editing));
  const [cars, setCars] = useState(init.cars);
  const [picked, setPicked] = useState(init.picked);
  const [work, setWorkMap] = useState(init.work);
  const [draft, setDraft] = useState(null); // car being added / edited
  const [tab, setTab] = useState(0);
  const [problem, setProblem] = useState(editing?.problem || "");
  const [workers, setWorkers] = useState(
    editing?.workers || (!isAppt && currentUser?.kind === "worker" ? [currentUser.id] : [])
  );
  const [totalEdited, setTotalEdited] = useState(!!editing);
  const [total, setTotal] = useState(editing?.subtotal ?? editing?.total ?? 0); // HT base
  const [tvaOn, setTvaOn] = useState(!!editing?.tva?.enabled);
  const [tvaRate, setTvaRate] = useState(editing?.tva?.rate ?? DEFAULT_TVA_RATE);
  const [paid, setPaid] = useState(editing ? paidOf(editing.payments) : null); // null => not yet initialized

  const w = (id) => work[id] || { km: "", serviceIds: [], products: [] };
  const setWork = (id, patch) => setWorkMap((m) => ({ ...m, [id]: { ...(m[id] || { km: "", serviceIds: [], products: [] }), ...patch } }));

  const active = picked.length
    ? picked.map((id) => cars.find((c) => c.id === id)).filter(Boolean)
    : [{ id: NONE, isNone: true }];
  const curTab = Math.min(tab, active.length - 1);

  const autoTotal = useMemo(
    () => active.reduce((s, c) => s + itemsTotal(db, w(c.id).serviceIds, w(c.id).products), 0),
    [db, active, work]
  );
  const baseHT = Number(totalEdited ? total : autoTotal) || 0;
  const tvaAmount = tvaOn ? Math.round((baseHT * (Number(tvaRate) || 0)) / 100) : 0;
  const grandTotal = baseHT + tvaAmount;
  const shownPaid = paid === null ? grandTotal : paid;
  const rest = Math.max(0, grandTotal - Number(shownPaid));

  const steps = isAppt
    ? [t("Date"), t("Client"), t("Véhicules"), t("Services"), t("Résumé")]
    : [t("Client"), t("Véhicules"), t("Services"), t("Résumé")];
  const last = steps.length - 1;
  const carStep = isAppt ? 2 : 1;
  const svcStep = isAppt ? 3 : 2;

  // Selecting a client brings up their fleet; cars added here for nobody are kept.
  const changeClient = (id) => {
    setClientId(id);
    const client = db.clients.find((c) => c.id === id);
    const fleet = clientCarsOf(db, client).map((c) => ({ ...c }));
    const extra = cars.filter((c) => c.isNew && !fleet.some((f) => f.id === c.id));
    const next = [...fleet, ...extra];
    const keep = picked.filter((pid) => next.some((c) => c.id === pid));
    setCars(next);
    setPicked(keep.length ? keep : fleet.length === 1 ? [fleet[0].id] : keep);
  };

  const togglePick = (id) => {
    if (picked.includes(id)) { setPicked(picked.filter((x) => x !== id)); return; }
    setPicked([...picked, id]);
    // A car picked for the first time starts from the mileage last recorded on it.
    if (!work[id]) setWork(id, { km: "" });
  };

  const draftHasContent = (d) => d && (CAR_FIELDS.some((k) => String(d[k] || "").trim()) || String(d.km || "").trim());

  const commitDraft = () => {
    if (!draft) return true;
    if (!draftHasContent(draft)) { setDraft(null); return true; }
    const exists = cars.some((c) => c.id === draft.id);
    const car = { ...draft, km: numOrEmpty(draft.km), isNew: exists ? draft.isNew : true };
    setCars(exists ? cars.map((c) => (c.id === car.id ? car : c)) : [...cars, car]);
    if (!exists) {
      setPicked([...picked, car.id]);
      setWork(car.id, { km: car.km });
    }
    setDraft(null);
    return true;
  };

  const removeCar = (id) => {
    setCars(cars.filter((c) => c.id !== id));
    setPicked(picked.filter((x) => x !== id));
  };

  const validate = (s) => {
    setErr("");
    if (s === carStep) commitDraft();
    if (s === svcStep && !active.some((c) => w(c.id).serviceIds.length || w(c.id).products.length)) {
      setErr(t("Sélectionnez au moins un service ou produit")); return false;
    }
    return true;
  };

  const save = () => {
    if (!validate(svcStep)) { setStep(svcStep); return; }
    // A balance carried over has to be attached to someone we can invoice later
    if (rest > 0 && !clientId) {
      setErr(t("Un reste à payer doit être rattaché à un client. Sélectionnez ou créez un client."));
      return;
    }
    const vehicles = active.map((c) => {
      const wk = w(c.id);
      return {
        carId: c.isNone ? "" : c.id,
        car: c.isNone ? pickCar({}) : pickCar(c),
        km: numOrEmpty(wk.km),
        services: wk.serviceIds.map((id) => ({ serviceId: id })),
        products: wk.products,
        ...(wk.oilChange ? { oilChange: wk.oilChange } : {}),
      };
    });
    const products = vehicles.flatMap((v) => v.products);
    const rec = {
      id: editing?.id || uid(),
      type: isAppt ? "appointment" : "repair",
      status: editing?.status || (isAppt ? "pending" : "finalized"),
      dateIn: `${dates.inDate}T${dates.inTime}`,
      dateOut: `${dates.outDate}T${dates.outTime}`,
      clientId, problem,
      vehicles,
      // flat copies kept for the pages that total services / products across repairs
      car: vehicles[0].car,
      services: vehicles.flatMap((v) => v.services),
      products,
      subtotal: baseHT,
      tva: { enabled: tvaOn, rate: Number(tvaRate) || 0, amount: tvaAmount },
      total: grandTotal,
      payments: editing ? editing.payments : shownPaid > 0 ? [{ id: uid(), amount: Number(shownPaid), date: todayISO() }] : [],
      workers,
      createdAt: editing?.createdAt || todayISO(),
    };
    update((d) => {
      if (editing) {
        const old = d.repairs.find((r) => r.id === editing.id);
        if (old) restockRepair(d, old); // give back previous product quantities
        consumeRepairStock(d, products);
        const i = d.repairs.findIndex((r) => r.id === editing.id);
        d.repairs[i] = rec;
      } else {
        consumeRepairStock(d, products);
        d.repairs.unshift(rec);
      }
      // Keep the client's fleet up to date: new cars join it, mileage moves forward.
      const cl = d.clients.find((c) => c.id === clientId);
      if (cl) {
        const fleet = clientCarsOf(d, cl).map((c) => ({ ...c }));
        cars.forEach(({ isNew, ...car }) => {
          const wk = picked.includes(car.id) ? w(car.id) : null;
          const km = wk && wk.km !== "" ? Number(wk.km) : car.km;
          const i = fleet.findIndex((f) => f.id === car.id);
          if (i >= 0) fleet[i] = { ...fleet[i], ...car, km };
          else fleet.push({ ...car, km });
        });
        cl.cars = fleet;
      }
    });
    if (!editing) onCreated?.(rec);
    onClose();
  };

  const client = db.clients.find((c) => c.id === clientId);
  const titleOf = (c) => (c.isNone ? t("Sans véhicule") : carTitle(c, t));

  const vehicleStep = () => (
    <div className="space-y-4">
      {client && (
        <p className="rounded-xl bg-sky-50 px-4 py-2.5 text-xs text-sky-700">
          {cars.length
            ? t("Véhicules de ce client : cochez ceux concernés par cette intervention.")
            : t("Aucun véhicule enregistré pour ce client. Ajoutez-en un, ou continuez sans véhicule.")}
        </p>
      )}
      {cars.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cars.map((c) => {
            const on = picked.includes(c.id);
            return (
              <motion.div key={c.id} layout
                className={`rounded-xl border-2 p-3.5 transition-colors ${on ? "border-primary-500 bg-primary-50/60" : "border-primary-100 bg-white"}`}>
                <div className="flex items-start gap-2">
                  <button onClick={() => togglePick(c.id)} className="flex min-w-0 flex-1 items-start gap-3 text-start cursor-pointer">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                      on ? "grad-primary border-transparent text-white" : "border-primary-300 bg-white"}`}>
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-primary-900">{carLabel(c) || t("Véhicule sans nom")}</span>
                      <span className="block text-xs text-slate-500">{[c.color, c.plate].filter(Boolean).join(" · ") || "—"}</span>
                      <span className="block text-[11px] text-slate-400">{t("Dernier kilométrage")} : {fmtKm(c.km)}</span>
                    </span>
                  </button>
                  {c.isNew && <Badge color="green">{t("Nouveau")}</Badge>}
                  <IconBtn icon={Pencil} title={t("Modifier")} onClick={() => setDraft({ ...c })} />
                  {c.isNew && <IconBtn icon={X} title={t("Supprimer")} variant="danger" onClick={() => removeCar(c.id)} />}
                </div>
                {on && (
                  <Field label={t("Nouveau kilométrage")} className="mt-3">
                    <Input type="number" min="0" value={w(c.id).km} placeholder={c.km !== "" ? String(c.km) : ""}
                      onChange={(e) => setWork(c.id, { km: e.target.value })} />
                  </Field>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      {draft ? (
        <CarEditor car={draft} setCar={setDraft} isEdit={cars.some((c) => c.id === draft.id)}
          onSave={commitDraft} onCancel={() => setDraft(null)} />
      ) : (
        <Btn variant="soft" icon={Plus} onClick={() => setDraft(emptyCar())}>{t("Ajouter un véhicule")}</Btn>
      )}
      {picked.length === 0 && (
        <p className="text-xs text-slate-400">{t("Aucun véhicule sélectionné : l'intervention sera enregistrée sans véhicule.")}</p>
      )}
    </div>
  );

  const servicesStep = () => {
    const cur = active[curTab];
    const wk = w(cur.id);
    return (
      <div className="space-y-5">
        <Field label={t("Description du problème")}>
          <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={t("Décrivez le problème du véhicule...")} />
        </Field>
        <VehicleTabs current={curTab} onChange={setTab}
          items={active.map((c) => ({ title: titleOf(c), count: w(c.id).serviceIds.length + w(c.id).products.length }))} />
        <div key={cur.id} className="space-y-4 rounded-xl border border-primary-100 bg-surface p-4">
          {!cur.isNone && (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold text-primary-900"><Car size={15} className="text-primary-400" /> {titleOf(cur)}</p>
              <span className="text-xs text-slate-400">{fmtKm(wk.km !== "" ? wk.km : cur.km)}</span>
            </div>
          )}
          <Field label={t("Services")}>
            <ServicePicker selected={wk.serviceIds} onChange={(ids) => setWork(cur.id, { serviceIds: ids })} />
          </Field>
          <Field label={t("Produits du stock")}>
            <ProductPicker items={wk.products} onChange={(items) => setWork(cur.id, { products: items })} />
          </Field>
        </div>
      </div>
    );
  };

  const summaryStep = () => (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary-100 bg-surface p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-400"><User size={13} /> {t("Client")}</p>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary-900">
          {client?.name || t("Client de passage")}
          {isCompany(client) && <Badge color="blue">{t("Entreprise")}</Badge>}
        </p>
        <p className="text-xs text-slate-500">{client?.phone || "—"}</p>
      </div>
      {problem && (
        <div className="rounded-xl border border-primary-100 bg-surface p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary-400">{t("Problème")}</p>
          <p className="text-sm text-slate-600">{problem}</p>
        </div>
      )}
      {active.map((c) => {
        const wk = w(c.id);
        return (
          <div key={c.id} className="rounded-xl border border-primary-100 bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-400">
                <Car size={13} /> {c.isNone ? t("Services & produits") : titleOf(c)}
              </p>
              {!c.isNone && <span className="text-xs font-semibold text-slate-500">{fmtKm(wk.km !== "" ? wk.km : c.km)}</span>}
            </div>
            <div className="space-y-1.5">
              {wk.serviceIds.map((id) => {
                const s = db.services.find((x) => x.id === id);
                return s && <MoneyLine key={id} label={s.name} value={fmtMoney(s.price)} />;
              })}
              {wk.products.map((it) => {
                const p = db.products.find((x) => x.id === it.productId);
                return p && <MoneyLine key={it.productId} label={`${p.name} × ${it.qty}`} value={fmtMoney((p.salePrice || p.purchasePrice) * it.qty)} />;
              })}
              {!wk.serviceIds.length && !wk.products.length && <p className="text-xs text-slate-400">{t("Aucun service")}</p>}
            </div>
          </div>
        );
      })}
      {!isAppt && (
        <Field label={t("Assigner des employés (optionnel)")}>
          <WorkerPicker selected={workers} onChange={setWorkers} />
        </Field>
      )}
      <div className="space-y-3 rounded-xl border-2 border-primary-200 bg-primary-50/50 p-4">
        <Field label={t("Total HT (modifiable)")}>
          <Input type="number" min="0" value={baseHT}
            onChange={(e) => { setTotalEdited(true); setTotal(Number(e.target.value)); }} />
        </Field>
        <TvaSection on={tvaOn} setOn={setTvaOn} rate={tvaRate} setRate={setTvaRate}
          base={baseHT} tva={tvaAmount} total={grandTotal} />
        <Field label={t("Le client paie")}>
          <Input type="number" min="0" value={shownPaid} onChange={(e) => setPaid(Number(e.target.value))} />
        </Field>
        <MoneyLine label={t("Reste")} value={fmtMoney(rest)} color={rest > 0 ? "text-red-500" : "text-emerald-600"} big />
        {rest > 0 && !clientId && (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
            <p className="text-xs font-semibold leading-snug text-red-600">
              {t("Un reste à payer doit être rattaché à un client. Sélectionnez ou créez un client.")}
            </p>
            <ClientPicker value={clientId} onChange={changeClient} />
          </div>
        )}
      </div>
    </div>
  );

  const stepContent = () => {
    const idx = isAppt ? step : step + 1; // align: 0=dates only for appt
    if (isAppt && step === 0)
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Date & heure d'arrivée")} required>
            <div className="flex gap-2">
              <Input type="date" value={dates.inDate} onChange={(e) => setDates({ ...dates, inDate: e.target.value })} />
              <Input type="time" value={dates.inTime} onChange={(e) => setDates({ ...dates, inTime: e.target.value })} className="input w-28" />
            </div>
          </Field>
          <Field label={t("Date & heure de sortie")} required>
            <div className="flex gap-2">
              <Input type="date" value={dates.outDate} onChange={(e) => setDates({ ...dates, outDate: e.target.value })} />
              <Input type="time" value={dates.outTime} onChange={(e) => setDates({ ...dates, outTime: e.target.value })} className="input w-28" />
            </div>
          </Field>
        </div>
      );
    if (idx === 1) return <ClientPicker value={clientId} onChange={changeClient} optional />;
    if (idx === 2) return vehicleStep();
    if (idx === 3) return servicesStep();
    return summaryStep();
  };

  return (
    <Modal open onClose={onClose} width="max-w-3xl"
      title={editing ? t("Modifier") : isAppt ? t("Nouveau RDV") : t("Nouvelle réparation")}
      footer={
        <>
          {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}>{t("Précédent")}</Btn>}
          {step < last
            ? <Btn onClick={() => validate(step) && setStep(step + 1)}>{t("Suivant")}</Btn>
            : <Btn variant="accent" onClick={save}>{editing ? t("Enregistrer") : isAppt ? t("Créer le RDV") : t("Créer la réparation")}</Btn>}
        </>
      }>
      <Steps labels={steps} current={step} />
      <StepPane step={step}>{stepContent()}</StepPane>
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">{err}</p>}
    </Modal>
  );
}

// ========== Pay debt modal ==========

function PayModal({ repair, onClose }) {
  const { db, update, t, lang } = useApp();
  const already = paidOf(repair.payments);
  const rest = Math.max(0, Number(repair.total) - already);
  const [amount, setAmount] = useState(rest);
  const newRest = Math.max(0, rest - Number(amount || 0));

  const save = () => {
    update((d) => {
      const r = d.repairs.find((x) => x.id === repair.id);
      if (r && Number(amount) > 0) r.payments.push({ id: uid(), amount: Number(amount), date: todayISO() });
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={t("Paiement de la dette")} width="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Annuler")}</Btn><Btn onClick={save}>{t("Enregistrer le paiement")}</Btn></>}>
      <div className="space-y-2 rounded-xl border border-primary-100 bg-surface p-4">
        {serviceNamesOf(repair, db).map((n, i) => <p key={i} className="text-[13px] text-slate-600">• {n}</p>)}
      </div>
      <div className="mt-4 space-y-2.5">
        <MoneyLine label={t("Total")} value={fmtMoney(repair.total)} />
        <MoneyLine label={t("Déjà payé")} value={fmtMoney(already)} color="text-emerald-600" />
        <MoneyLine label={t("Reste")} value={fmtMoney(rest)} color="text-red-500" />
      </div>
      <Field label={t("Payer maintenant")} className="mt-4">
        <Input type="number" min="0" max={rest} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="mt-3 rounded-xl bg-primary-50 p-3">
        <MoneyLine label={t("Reste")} value={fmtMoney(newRest)} color={newRest > 0 ? "text-red-500" : "text-emerald-600"} big />
      </div>
      {repair.payments.length > 0 && (
        <div className="mt-4">
          <p className="label">{t("Historique des paiements")}</p>
          {repair.payments.map((p) => (
            <MoneyLine key={p.id} label={fmtDate(p.date, lang)} value={fmtMoney(p.amount)} />
          ))}
        </div>
      )}
    </Modal>
  );
}

// ========== Finalize modal ==========

function FinalizeModal({ repair, onClose }) {
  const { db, update, t, currentUser } = useApp();
  const vehicles = repairVehiclesOf(repair);
  const [clientId, setClientId] = useState(repair.clientId || "");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState(0);
  const [svc, setSvc] = useState(() => vehicles.map(serviceIdsOf));
  const [added, setAdded] = useState(() => vehicles.map(() => [])); // products added at finalization
  const [workers, setWorkers] = useState(
    repair.workers?.length ? repair.workers : currentUser?.kind === "worker" ? [currentUser.id] : []
  );
  const already = paidOf(repair.payments);
  const autoNew = vehicles.reduce((s, v, i) => s + itemsTotal(db, svc[i], [...(v.products || []), ...added[i]]), 0);
  const [totalEdited, setTotalEdited] = useState(false);
  const [total, setTotal] = useState(repair.subtotal ?? repair.total); // HT base
  const [tvaOn, setTvaOn] = useState(!!repair.tva?.enabled);
  const [tvaRate, setTvaRate] = useState(repair.tva?.rate ?? DEFAULT_TVA_RATE);
  const baseHT = Number(totalEdited ? total : Math.max(autoNew, Number(repair.subtotal ?? repair.total) || 0)) || 0;
  const tvaAmount = tvaOn ? Math.round((baseHT * (Number(tvaRate) || 0)) / 100) : 0;
  const grandTotal = baseHT + tvaAmount;
  const rest = Math.max(0, grandTotal - already);
  const [amount, setAmount] = useState(rest);
  const newRest = Math.max(0, grandTotal - already - Number(amount || 0));

  const setAt = (arr, setArr, i, val) => setArr(arr.map((x, j) => (j === i ? val : x)));

  const save = () => {
    setErr("");
    if (newRest > 0 && !clientId) {
      setErr(t("Un reste à payer doit être rattaché à un client. Sélectionnez ou créez un client."));
      return;
    }
    update((d) => {
      const r = d.repairs.find((x) => x.id === repair.id);
      if (!r) return;
      consumeRepairStock(d, added.flat());
      r.vehicles = vehicles.map((v, i) => ({
        ...v,
        services: svc[i].map((id) => ({ serviceId: id })),
        products: [...(v.products || []), ...added[i]],
      }));
      r.car = r.vehicles[0].car;
      r.services = r.vehicles.flatMap((v) => v.services);
      r.products = r.vehicles.flatMap((v) => v.products);
      r.clientId = clientId;
      r.subtotal = baseHT;
      r.tva = { enabled: tvaOn, rate: Number(tvaRate) || 0, amount: tvaAmount };
      r.total = grandTotal;
      if (Number(amount) > 0) r.payments.push({ id: uid(), amount: Number(amount), date: todayISO() });
      r.workers = workers;
      r.status = "finalized";
    });
    onClose();
  };

  const cur = Math.min(tab, vehicles.length - 1);
  const v = vehicles[cur];

  return (
    <Modal open onClose={onClose} title={t("Finalisation")} width="max-w-3xl"
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Annuler")}</Btn><Btn variant="accent" icon={CheckCircle2} onClick={save}>{t("Finaliser")}</Btn></>}>
      <div className="space-y-5">
        <VehicleTabs current={cur} onChange={setTab}
          items={vehicles.map((x, i) => ({ title: carTitle(x.car, t), count: svc[i].length + (x.products || []).length + added[i].length }))} />
        <div key={cur} className="space-y-4 rounded-xl border border-primary-100 bg-surface p-4">
          {(carLabel(v.car) || v.car?.plate) && (
            <p className="flex items-center gap-2 text-sm font-bold text-primary-900"><Car size={15} className="text-primary-400" /> {carTitle(v.car, t)} <span className="text-xs font-normal text-slate-400">{fmtKm(v.km)}</span></p>
          )}
          <Field label={t("Services")}>
            <ServicePicker selected={svc[cur]} onChange={(ids) => setAt(svc, setSvc, cur, ids)} />
          </Field>
          <Field label={t("Produits du stock")}>
            <ProductPicker items={added[cur]} onChange={(items) => setAt(added, setAdded, cur, items)} />
          </Field>
        </div>
        <Field label={t("Assigner des employés (optionnel)")}>
          <WorkerPicker selected={workers} onChange={setWorkers} />
        </Field>
        <div className="space-y-3 rounded-xl border-2 border-primary-200 bg-primary-50/50 p-4">
          <Field label={t("Total HT (modifiable)")}>
            <Input type="number" min="0" value={baseHT}
              onChange={(e) => { setTotalEdited(true); setTotal(Number(e.target.value)); }} />
          </Field>
          <TvaSection on={tvaOn} setOn={setTvaOn} rate={tvaRate} setRate={setTvaRate}
            base={baseHT} tva={tvaAmount} total={grandTotal} />
          <Field label={t("Payer maintenant")}>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <MoneyLine label={t("Déjà payé")} value={fmtMoney(already)} color="text-emerald-600" />
          <MoneyLine label={t("Reste")} value={fmtMoney(newRest)} color={newRest > 0 ? "text-red-500" : "text-emerald-600"} big />
          {newRest > 0 && !clientId && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
              <p className="text-xs font-semibold leading-snug text-red-600">
                {t("Un reste à payer doit être rattaché à un client. Sélectionnez ou créez un client.")}
              </p>
              <ClientPicker value={clientId} onChange={setClientId} />
            </div>
          )}
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">{err}</p>}
      </div>
    </Modal>
  );
}

// ========== Vehicle items (view / history) ==========

export function VehicleItems({ vehicle }) {
  const { db, t } = useApp();
  const v = vehicle;
  const services = v.services || [];
  const products = v.products || [];
  return (
    <div className="space-y-1">
      {services.map((s, i) => {
        const sv = db.services.find((x) => x.id === s.serviceId);
        const name = sv?.name || s.name;
        return name && <MoneyLine key={i} label={name} value={fmtMoney(sv ? sv.price : s.price)} />;
      })}
      {products.map((it, i) => {
        const p = db.products.find((x) => x.id === it.productId);
        return p && <MoneyLine key={`p${i}`} label={`${p.name} × ${it.qty}`} value={fmtMoney((p.salePrice || p.purchasePrice) * it.qty)} />;
      })}
      {services.length === 0 && products.length === 0 && <p className="text-xs text-slate-400">{t("Aucun service")}</p>}
      {v.oilChange && (
        <p className="pt-1 text-[11px] font-medium text-amber-700">
          <Droplet size={11} className="me-1 inline" />
          {t("Vidange")} : {v.oilChange.oil || "—"} · {t("Prochain vidange à")} {fmtKm(v.oilChange.nextKm)}
        </p>
      )}
    </div>
  );
}

// ========== View modal ==========

function ViewModal({ repair, onClose, onTicket }) {
  const { db, t, lang } = useApp();
  const client = db.clients.find((c) => c.id === repair.clientId);
  const vehicles = repairVehiclesOf(repair);
  const { subtotal, tvaEnabled, tvaRate, tva, total, paid: already, rest } = repairAmounts(repair);
  return (
    <Modal open onClose={onClose} title={t("Détails")} width="max-w-xl"
      footer={
        <>
          <Btn variant="ghost" icon={Droplet} onClick={() => onTicket(repair)}>{t("Ticket de vidange")}</Btn>
          <Btn variant="soft" icon={FileText} onClick={() => printRepairDoc(repair, db, t, lang, "order")}>
            {t("Bon de réparation")}
          </Btn>
          <Btn icon={Printer} onClick={() => printRepairDoc(repair, db, t, lang, "invoice")}>
            {t("Facture")}
          </Btn>
        </>
      }>
      <div className="mb-3 flex items-center gap-2">
        <Badge color={repair.type === "appointment" ? "blue" : "violet"}>
          {t(repair.type === "appointment" ? "Rendez-vous" : "Réparation")}
        </Badge>
        <StatusBadge status={repair.status} />
      </div>
      <InfoRow label={t("Client")} value={client ? `${client.name}${client.phone ? ` · ${client.phone}` : ""}` : t("Client de passage")} />
      <InfoRow label={t("Arrivée")} value={`${fmtDate(repair.dateIn, lang)} ${repair.dateIn?.slice(11, 16) || ""}`} />
      <InfoRow label={t("Sortie")} value={`${fmtDate(repair.dateOut, lang)} ${repair.dateOut?.slice(11, 16) || ""}`} />
      <InfoRow label={t("Problème")} value={repair.problem || "—"} />
      <InfoRow label={t("Employés assignés")}
        value={(repair.workers || []).map((id) => db.workers.find((w) => w.id === id)?.fullName).filter(Boolean).join(", ") || "—"} />
      {vehicles.map((v, i) => (
        <div key={i} className="mt-4 rounded-xl border border-primary-100 bg-surface p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-400">
              <Car size={13} /> {carLabel(v.car) || v.car?.plate ? carTitle(v.car, t) : t("Services & produits")}
            </p>
            {v.km !== "" && v.km != null && <span className="text-xs font-semibold text-slate-500">{fmtKm(v.km)}</span>}
          </div>
          <VehicleItems vehicle={v} />
        </div>
      ))}
      <div className="mt-4 space-y-2 rounded-xl bg-primary-50 p-4">
        {tvaEnabled && (
          <>
            <MoneyLine label={t("Total HT")} value={fmtMoney(subtotal)} />
            <MoneyLine label={`${t("TVA")} (${tvaRate}%)`} value={fmtMoney(tva)} color="text-accent-600" />
          </>
        )}
        <MoneyLine label={t(tvaEnabled ? "Total TTC" : "Total")} value={fmtMoney(total)} big />
        <MoneyLine label={t("Payé")} value={fmtMoney(already)} color="text-emerald-600" />
        <MoneyLine label={t("Reste")} value={fmtMoney(rest)} color={rest > 0 ? "text-red-500" : "text-emerald-600"} />
      </div>
      {repair.payments.length > 0 && (
        <div className="mt-4">
          <p className="label">{t("Historique des paiements")}</p>
          {repair.payments.map((p) => <MoneyLine key={p.id} label={fmtDate(p.date, lang)} value={fmtMoney(p.amount)} />)}
        </div>
      )}
    </Modal>
  );
}

// ========== Oil-change ticket ==========

function AskTicketModal({ onYes, onClose }) {
  const { t } = useApp();
  return (
    <Modal open onClose={onClose} title={t("Ticket de vidange")} width="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Non")}</Btn><Btn icon={Printer} onClick={onYes}>{t("Oui, imprimer")}</Btn></>}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><Droplet size={22} /></div>
        <p className="pt-1.5 text-sm text-slate-600">{t("Voulez-vous imprimer un ticket de vidange pour cette intervention ?")}</p>
      </div>
    </Modal>
  );
}

const TICKET_WIDTH_KEY = "garage_ticket_width_v1";

function OilTicketModal({ repair, onClose }) {
  const { db, update, t } = useApp();
  const vehicles = repairVehiclesOf(repair);
  const [cur, setCur] = useState(0);
  const [width, setWidth] = useState(() => {
    try { return localStorage.getItem(TICKET_WIDTH_KEY) || "80"; } catch { return "80"; }
  });

  // One form per vehicle, pre-filled from a previous ticket or from the job itself.
  const [forms, setForms] = useState(() => vehicles.map((v) => {
    if (v.oilChange) return { ...v.oilChange, km: v.oilChange.km ?? v.km ?? "", filters: { ...v.oilChange.filters } };
    const names = (v.products || []).map((it) => db.products.find((p) => p.id === it.productId)?.name).filter(Boolean);
    const oil = names.find((n) => /huile|oil|\b\d{1,2}w-?\d{2}\b/i.test(n) && !/filtre|filter/i.test(n)) || "";
    const km = v.km ?? "";
    return { oil, km, nextKm: km !== "" ? Number(km) + 10000 : "", filters: guessFilters(names) };
  }));
  const f = forms[cur];
  const setF = (patch) => setForms(forms.map((x, i) => (i === cur ? { ...x, ...patch } : x)));

  const ticket = { ...f, date: f.date || new Date().toISOString() };
  const preview = useMemo(() => oilTicketHTML(db.settings, ticket, t, Number(width)), [db.settings, f, width, t]);

  const print = () => {
    try { localStorage.setItem(TICKET_WIDTH_KEY, width); } catch { /* ignore */ }
    const saved = { oil: f.oil, km: numOrEmpty(f.km), nextKm: numOrEmpty(f.nextKm), filters: f.filters, date: ticket.date };
    printOilTicket(db.settings, saved, t, Number(width));
    update((d) => {
      const r = d.repairs.find((x) => x.id === repair.id);
      if (!r) return;
      const vs = repairVehiclesOf(r).map((x) => ({ ...x }));
      vs[cur] = { ...vs[cur], oilChange: saved };
      r.vehicles = vs;
      // Remember the next change on the client's car so it shows in their fleet.
      const cl = d.clients.find((c) => c.id === r.clientId);
      const carId = vs[cur].carId;
      if (cl && carId) {
        const fleet = clientCarsOf(d, cl).map((c) => ({ ...c }));
        const car = fleet.find((c) => c.id === carId);
        if (car) { car.nextOilKm = saved.nextKm; if (saved.km !== "") car.km = Math.max(Number(car.km) || 0, saved.km); }
        cl.cars = fleet;
      }
    });
    setForms(forms.map((x, i) => (i === cur ? { ...x, date: ticket.date } : x)));
  };

  return (
    <Modal open onClose={onClose} title={t("Ticket de vidange")} width="max-w-3xl"
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Fermer")}</Btn><Btn icon={Printer} onClick={print}>{t("Imprimer le ticket")}</Btn></>}>
      <div className="space-y-4">
        <VehicleTabs current={cur} onChange={setCur}
          items={vehicles.map((v) => ({ title: carTitle(v.car, t), count: fmtKm(v.km) }))} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="label">{t("Filtres changés")}</p>
              <div className="grid grid-cols-2 gap-2">
                {OIL_FILTERS.map((x) => {
                  const on = !!f.filters?.[x.key];
                  return (
                    <button key={x.key} onClick={() => setF({ filters: { ...f.filters, [x.key]: !on } })}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-start text-[13px] font-semibold transition-colors cursor-pointer ${
                        on ? "border-primary-500 bg-primary-50 text-primary-900" : "border-primary-100 bg-white text-slate-500"}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                        on ? "grad-primary border-transparent text-white" : "border-primary-300"}`}>
                        {on && <Check size={13} strokeWidth={3} />}
                      </span>
                      {t(x.label)}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label={t("Huile")}>
              <Input value={f.oil} onChange={(e) => setF({ oil: e.target.value })} placeholder="OILFINO 0W20" list="oil-products" />
              <datalist id="oil-products">
                {db.products.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Kilométrage actuel")}>
                <Input type="number" min="0" value={f.km}
                  onChange={(e) => {
                    const km = e.target.value;
                    const auto = f.km !== "" && Number(f.nextKm) === Number(f.km) + 10000;
                    setF({ km, ...(f.nextKm === "" || auto ? { nextKm: km !== "" ? Number(km) + 10000 : "" } : {}) });
                  }} />
              </Field>
              <Field label={t("Prochaine vidange (km)")}>
                <Input type="number" min="0" value={f.nextKm} onChange={(e) => setF({ nextKm: e.target.value })} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[5000, 7500, 10000, 15000].map((step) => (
                <button key={step} disabled={f.km === ""} onClick={() => setF({ nextKm: Number(f.km) + step })}
                  className="rounded-lg border border-primary-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">
                  +{new Intl.NumberFormat("fr-FR").format(step)} km
                </button>
              ))}
            </div>
            <div>
              <p className="label">{t("Largeur du papier")}</p>
              <Seg value={width} onChange={setWidth} options={[
                { value: "80", label: "80 mm" },
                { value: "58", label: "58 mm" },
              ]} />
            </div>
          </div>
          <div>
            <p className="label">{t("Aperçu")}</p>
            <div className="flex justify-center rounded-xl border border-primary-100 bg-slate-100 p-4">
              <iframe title={t("Aperçu")} srcDoc={preview}
                className="rounded bg-white shadow-lift"
                style={{ width: `${Number(width) * 3.78}px`, height: `${Number(width) < 70 ? 200 : 250}px`, border: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ========== Printable documents (facture / bon de réparation) ==========

const STATUS_LABEL = { pending: "En attente", finalized: "Finalisé", canceled: "Annulé" };

// Table rows of a repair's items, grouped under a header line per vehicle when it has several.
export function repairItemRows(repair, db, t, { withType = true } = {}) {
  const vehicles = repairVehiclesOf(repair);
  const cols = withType ? 5 : 4;
  const line = (name, sub, type, qty, unit) => `<tr>
    <td><b>${esc(name)}</b>${sub ? `<div class="dim">${esc(sub)}</div>` : ""}</td>
    ${withType ? `<td>${esc(type)}</td>` : ""}
    <td class="num">${qty}</td>
    <td class="num">${fmtMoney(unit)}</td>
    <td class="num">${fmtMoney(unit * qty)}</td>
  </tr>`;
  const grouped = vehicles.length > 1 || carLabel(vehicles[0]?.car) || vehicles[0]?.car?.plate;
  return vehicles.map((v) => {
    const head = grouped
      ? `<tr class="grp"><td colspan="${cols}"><b>${esc(carTitle(v.car, t))}</b>${v.km !== "" && v.km != null ? ` <span class="dim">· ${fmtKm(v.km)}</span>` : ""}</td></tr>`
      : "";
    const rows = [
      ...(v.services || []).map((it) => {
        const sv = db.services.find((x) => x.id === it.serviceId);
        if (sv) return line(sv.name, sv.description, t("Service"), 1, Number(sv.price) || 0);
        return it.name ? line(it.name, "", t("Service"), 1, Number(it.price) || 0) : "";
      }),
      ...(v.products || []).map((it) => {
        const p = db.products.find((x) => x.id === it.productId);
        if (!p) return "";
        return line(p.name, p.brand, t("Pièce"), Number(it.qty) || 1, Number(p.salePrice || p.purchasePrice) || 0);
      }),
    ].filter(Boolean).join("");
    return head + rows;
  }).join("");
}

// Client identity block for printed documents — companies also show their fiscal ids.
export function clientBoxHTML(client, t, lang) {
  const kv = (k, v) => (v ? `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : "");
  if (!client) return `<div class="kv"><span>${t("Nom")}</span><b>${esc(t("Client de passage"))}</b></div>`;
  return [
    kv(isCompany(client) ? t("Entreprise") : t("Nom"), client.name),
    kv(t("Téléphone"), client.phone || "—"),
    kv(t("Adresse"), client.address),
    kv("NIF", client.nif), kv("NIS", client.nis), kv("RC", client.rc), kv(t("Article"), client.article),
    kv(t("Client depuis"), client.createdAt ? fmtDate(client.createdAt, lang) : ""),
  ].join("");
}

// kind: "invoice" -> FACTURE | "order" -> BON DE RÉPARATION (same layout, different title)
export function printRepairDoc(repair, db, t, lang, kind = "invoice") {
  const s = db.settings || {};
  const client = db.clients.find((c) => c.id === repair.clientId);
  const vehicles = repairVehiclesOf(repair);
  const car = vehicles[0]?.car || {};
  const isInvoice = kind === "invoice";
  const { subtotal, tvaEnabled, tvaRate, tva, total, paid, rest } = repairAmounts(repair);
  const docTitle = isInvoice ? t("FACTURE") : t("BON DE RÉPARATION");
  const ref = `${isInvoice ? "FAC" : "BR"}-${String(repair.id).slice(-6).toUpperCase()}`;
  const dt = (iso) => (iso ? `${fmtDate(iso, lang)}${iso.slice(11, 16) ? ` · ${iso.slice(11, 16)}` : ""}` : "—");

  const rows = repairItemRows(repair, db, t);

  const vehicleBox = vehicles.length > 1
    ? vehicles.map((v) => `<div class="kv"><span>${esc(carLabel(v.car) || "—")}</span><b>${esc([v.car?.plate, v.km !== "" && v.km != null ? fmtKm(v.km) : ""].filter(Boolean).join(" · ") || "—")}</b></div>`).join("")
    : `
        <div class="kv"><span>${t("Véhicule")}</span><b>${esc([car.brand, car.name].filter(Boolean).join(" ") || "—")}</b></div>
        <div class="kv"><span>${t("Immatriculation")}</span><b>${esc(car.plate || "—")}</b></div>
        <div class="kv"><span>${t("Couleur")} / ${t("Année")}</span><b>${esc([car.color, car.year].filter(Boolean).join(" · ") || "—")}</b></div>
        ${vehicles[0]?.km !== "" && vehicles[0]?.km != null ? `<div class="kv"><span>${t("Kilométrage")}</span><b>${fmtKm(vehicles[0].km)}</b></div>` : ""}`;

  const workerNames = (repair.workers || [])
    .map((id) => db.workers.find((w) => w.id === id)?.fullName)
    .filter(Boolean).join(", ");

  const payRows = (repair.payments || [])
    .map((p) => `<tr><td>${fmtDate(p.date, lang)}</td><td class="num">${fmtMoney(p.amount)}</td></tr>`)
    .join("");

  printHTML(`${docTitle} ${ref}`, `
    ${docHead(s, docTitle, ref, t)}

    <div class="doc-meta">
      <div><span>${t("Référence")}:</span> <b>${ref}</b></div>
      <div><span>${t("Date")}:</span> <b>${fmtDate(repair.createdAt || repair.dateIn, lang)}</b></div>
      <div><span>${t("Type")}:</span> <b>${t(repair.type === "appointment" ? "Rendez-vous" : "Réparation")}</b></div>
      <div><span>${t("Statut")}:</span> <b>${t(STATUS_LABEL[repair.status] || "En attente")}</b></div>
    </div>

    <div class="grid2">
      <div class="box">
        <h3>${t("Client")}</h3>
        ${clientBoxHTML(client, t, lang)}
      </div>
      <div class="box">
        <h3>${vehicles.length > 1 ? `${t("Véhicules")} (${vehicles.length})` : t("Véhicule")}</h3>
        ${vehicleBox}
      </div>
    </div>

    <div class="grid2">
      <div class="box">
        <h3>${t("Arrivée")} / ${t("Sortie")}</h3>
        <div class="kv"><span>${t("Arrivée")}</span><b>${dt(repair.dateIn)}</b></div>
        <div class="kv"><span>${t("Sortie")}</span><b>${dt(repair.dateOut)}</b></div>
        <div class="kv"><span>${t("Employés assignés")}</span><b>${esc(workerNames || "—")}</b></div>
      </div>
      <div class="box">
        <h3>${t("Problème")}</h3>
        <p class="note">${esc(repair.problem || "—")}</p>
        ${car.description && vehicles.length === 1 ? `<p class="note dim" style="margin-top:6px">${esc(car.description)}</p>` : ""}
      </div>
    </div>

    <h2>${t("Services & produits")}</h2>
    <table class="doc-table">
      <thead>
        <tr>
          <th>${t("Désignation")}</th><th>${t("Type")}</th>
          <th class="num">${t("Qté")}</th><th class="num">${t("Prix unitaire")}</th><th class="num">${t("Total")}</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" class="dim">${t("Aucun service")}</td></tr>`}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div>${docStamp(total, paid, t)}</div>
      <div class="totals">
        ${tvaEnabled ? `
          <div class="row"><span>${t("Total HT")}</span><b>${fmtMoney(subtotal)}</b></div>
          <div class="row"><span>${t("TVA")} (${tvaRate}%)</span><b>${fmtMoney(tva)}</b></div>` : ""}
        <div class="row grand"><span>${t(tvaEnabled ? "Total TTC" : "Total à payer")}</span><b>${fmtMoney(total)}</b></div>
        <div class="row"><span>${t("Payé")}</span><b>${fmtMoney(paid)}</b></div>
        <div class="row due"><span>${t("Reste")}</span><b>${fmtMoney(rest)}</b></div>
      </div>
    </div>

    ${payRows ? `
      <h2>${t("Historique des paiements")}</h2>
      <table class="doc-table">
        <thead><tr><th>${t("Date")}</th><th class="num">${t("Montant")}</th></tr></thead>
        <tbody>${payRows}</tbody>
      </table>` : ""}

    <div class="sig">
      <div>${t("Signature du magasin")}</div>
      <div>${t("Signature du client")}</div>
    </div>

    <div class="foot">
      ${esc(s.name || "")}${s.phone ? ` · ${esc(s.phone)}` : ""}${s.email ? ` · ${esc(s.email)}` : ""}
    </div>
  `, lang === "ar" ? "rtl" : "ltr");
}

// ========== Main page ==========

export default function Repairs() {
  const { db, update, t, lang, can } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [preset, setPreset] = useState("all");
  const [period, setPeriod] = useState({ from: "", to: "" });
  const [wizard, setWizard] = useState(null); // {mode, editing}
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [finalizing, setFinalizing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [askTicket, setAskTicket] = useState(null); // repair just created
  const [ticketFor, setTicketFor] = useState(null);

  const list = useMemo(() => {
    const range = preset === "period" ? period : presetRange(preset);
    return db.repairs.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (preset !== "all" && !inRange(r.dateIn, range.from, range.to)) return false;
      if (q) {
        const c = db.clients.find((x) => x.id === r.clientId);
        const needle = q.toLowerCase();
        const flat = needle.replace(/\s/g, "");
        const plates = repairVehiclesOf(r).map((v) => (v.car?.plate || "").toLowerCase().replace(/\s/g, ""));
        const byClient = c && (c.name.toLowerCase().includes(needle) || (c.phone || "").replace(/\s/g, "").includes(flat));
        if (!byClient && !(flat && plates.some((p) => p.includes(flat)))) return false;
      }
      return true;
    });
  }, [db, q, status, preset, period]);

  const remove = (r) => {
    update((d) => {
      const old = d.repairs.find((x) => x.id === r.id);
      if (old && old.status !== "canceled") restockRepair(d, old);
      d.repairs = d.repairs.filter((x) => x.id !== r.id);
    });
  };

  const cancel = (r) => {
    update((d) => {
      const old = d.repairs.find((x) => x.id === r.id);
      if (old) { restockRepair(d, old); old.status = "canceled"; }
    });
  };

  // Always open the ticket on the stored record so a reprint shows the saved values.
  const openTicket = (r) => setTicketFor(db.repairs.find((x) => x.id === r.id) || r);

  return (
    <div>
      <PageHeader
        title={t("Réparations et rendez-vous")}
        subtitle={t("Vue d'ensemble de votre activité")}
        actions={
          <>
            {can("repairs", "create") && (
              <>
                <Btn icon={CalendarPlus} onClick={() => setWizard({ mode: "appointment" })}>{t("Nouveau RDV")}</Btn>
                <Btn variant="accent" icon={Wrench} onClick={() => setWizard({ mode: "repair" })}>{t("Nouvelle réparation")}</Btn>
              </>
            )}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <SearchBox value={q} onChange={setQ} placeholder={t("Client, téléphone ou immatriculation...")} />
        </div>
        <Seg value={status} onChange={setStatus} options={[
          { value: "all", label: t("Tous") },
          { value: "pending", label: t("En attente") },
          { value: "finalized", label: t("Finalisé") },
          { value: "canceled", label: t("Annulé") },
        ]} />
        <Seg value={preset} onChange={setPreset} options={[
          { value: "all", label: t("Tous") },
          { value: "today", label: t("Aujourd'hui") },
          { value: "week", label: t("7 derniers jours") },
          { value: "month", label: t("30 derniers jours") },
          { value: "period", label: t("Période") },
        ]} />
        <AnimatePresence>
          {preset === "period" && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }} className="flex items-center gap-2 overflow-hidden">
              <Input type="date" value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} className="input w-40" />
              <span className="text-xs text-slate-400">→</span>
              <Input type="date" value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} className="input w-40" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {list.length === 0 ? (
        <Empty text={t("Aucun résultat")} />
      ) : (
        <CardGrid cols="md:grid-cols-2 2xl:grid-cols-3">
          {list.map((r) => {
            const client = db.clients.find((c) => c.id === r.clientId);
            const already = paidOf(r.payments);
            const rest = Math.max(0, r.total - already);
            const names = serviceNamesOf(r, db);
            const vehicles = repairVehiclesOf(r);
            const carText = vehicles.length > 1
              ? `${vehicles.length} ${t("véhicules")}`
              : [vehicles[0]?.car?.brand, vehicles[0]?.car?.name].filter(Boolean).join(" ") || vehicles[0]?.car?.plate || "—";
            return (
              <motion.div key={r.id} variants={itemRise} layout
                whileHover={{ y: -4, transition: { duration: 0.18 } }}
                className="card flex flex-col p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge color={r.type === "appointment" ? "blue" : "violet"}>
                    {t(r.type === "appointment" ? "Rendez-vous" : "Réparation")}
                  </Badge>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mb-1 flex items-center gap-2">
                  {isCompany(client) ? <Building2 size={14} className="text-sky-600" /> : <User size={14} className="text-primary-400" />}
                  <p className="text-sm font-bold text-primary-900">{client?.name || t("Client de passage")}</p>
                </div>
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <Phone size={12} /> {client?.phone || "—"}
                  <span className="mx-1">·</span>
                  <Car size={12} /> {carText}
                </div>
                <p className="mb-3 line-clamp-1 text-xs text-slate-500">
                  {names.join(", ") || r.problem || "—"}
                </p>
                <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl bg-primary-50/70 p-2.5 text-center">
                  <div><p className="text-[10px] text-slate-400">{t("Total")}</p><p className="font-mono text-[13px] font-bold text-primary-900">{fmtMoney(r.total)}</p></div>
                  <div><p className="text-[10px] text-slate-400">{t("Payé")}</p><p className="font-mono text-[13px] font-bold text-emerald-600">{fmtMoney(already)}</p></div>
                  <div><p className="text-[10px] text-slate-400">{t("Reste")}</p><p className={`font-mono text-[13px] font-bold ${rest > 0 ? "text-red-500" : "text-emerald-600"}`}>{fmtMoney(rest)}</p></div>
                </div>
                <p className="mb-3 text-[11px] text-slate-400">
                  {t("Arrivée")}: {fmtDate(r.dateIn, lang)} {r.dateIn?.slice(11, 16)}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-primary-50 pt-3">
                  <IconBtn icon={Eye} title={t("Voir")} onClick={() => setViewing(r)} />
                  <IconBtn icon={Printer} title={t("Imprimer la facture")}
                    onClick={() => printRepairDoc(r, db, t, lang, "invoice")} />
                  <IconBtn icon={FileText} title={t("Imprimer le bon de réparation")}
                    onClick={() => printRepairDoc(r, db, t, lang, "order")} />
                  <IconBtn icon={Droplet} title={t("Ticket de vidange")} onClick={() => openTicket(r)} />
                  {can("repairs", "edit") && <IconBtn icon={Pencil} title={t("Modifier")} onClick={() => setWizard({ mode: r.type, editing: r })} />}
                  {can("repairs", "pay") && rest > 0 && r.status !== "canceled" && (
                    <IconBtn icon={Wallet} title={t("Payer dette")} variant="soft" onClick={() => setPaying(r)} />
                  )}
                  {can("repairs", "finalize") && r.status === "pending" && (
                    <IconBtn icon={CheckCircle2} title={t("Finaliser")} variant="accent" className="grad-accent text-white" onClick={() => setFinalizing(r)} />
                  )}
                  {can("repairs", "cancel") && r.status === "pending" && (
                    <IconBtn icon={Ban} title={t("Annuler le RDV")} variant="danger" onClick={() => cancel(r)} />
                  )}
                  {can("repairs", "delete") && <IconBtn icon={Trash2} title={t("Supprimer")} variant="danger" onClick={() => setDeleting(r)} />}
                </div>
              </motion.div>
            );
          })}
        </CardGrid>
      )}

      {wizard && <RepairWizard mode={wizard.mode} editing={wizard.editing}
        onCreated={setAskTicket} onClose={() => setWizard(null)} />}
      {viewing && <ViewModal repair={viewing} onClose={() => setViewing(null)}
        onTicket={(r) => { setViewing(null); openTicket(r); }} />}
      {paying && <PayModal repair={paying} onClose={() => setPaying(null)} />}
      {finalizing && <FinalizeModal repair={finalizing} onClose={() => setFinalizing(null)} />}
      {askTicket && <AskTicketModal onClose={() => setAskTicket(null)}
        onYes={() => { setTicketFor(askTicket); setAskTicket(null); }} />}
      {ticketFor && <OilTicketModal repair={ticketFor} onClose={() => setTicketFor(null)} />}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => remove(deleting)} />
    </div>
  );
}
