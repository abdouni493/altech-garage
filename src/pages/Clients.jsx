import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, History, Phone, Building2, Car, MapPin, Printer, Droplet } from "lucide-react";
import { useApp } from "../context";
import {
  fmtMoney, fmtDate, paidOf, presetRange, inRange, isCompany, clientCarsOf, repairVehiclesOf,
  carLabel, carTitle, fmtKm, printHTML, esc, docHead, repairAmounts,
} from "../store";
import {
  Btn, IconBtn, Modal, Confirm, Input, SearchBox, Empty, PageHeader,
  CardGrid, itemRise, Badge, StatusBadge, MoneyLine, Seg,
} from "../components/ui";
import { ClientFields, clientFormOf, emptyClientForm, buildClient } from "../components/ClientFields";
import { VehicleItems, repairItemRows, clientBoxHTML } from "./Repairs";

function ClientForm({ editing, onClose }) {
  const { update, t } = useApp();
  const [form, setForm] = useState(() => (editing ? clientFormOf(editing) : emptyClientForm()));
  const save = () => {
    if (!form.name.trim()) return;
    update((d) => {
      if (editing) {
        const i = d.clients.findIndex((c) => c.id === editing.id);
        d.clients[i] = buildClient(form, d.clients[i]);
      } else {
        d.clients.push(buildClient(form));
      }
    });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={editing ? t("Modifier") : t("Nouveau client")} width="max-w-lg"
      footer={<><Btn variant="ghost" onClick={onClose}>{t("Annuler")}</Btn><Btn onClick={save}>{t("Enregistrer")}</Btn></>}>
      <ClientFields form={form} setForm={setForm} />
    </Modal>
  );
}

// ---- printable history of a client over a period ----
function printClientHistory(db, client, visits, range, t, lang) {
  const s = db.settings || {};
  const cars = clientCarsOf(db, client);
  const sum = visits.reduce((acc, r) => {
    const a = repairAmounts(r);
    return { total: acc.total + a.total, paid: acc.paid + a.paid, rest: acc.rest + a.rest };
  }, { total: 0, paid: 0, rest: 0 });
  const periodLabel = range.from || range.to
    ? `${range.from ? fmtDate(range.from, lang) : "…"} → ${range.to ? fmtDate(range.to, lang) : "…"}`
    : t("Toute la période");

  const fleet = cars.length ? `
    <h2>${t("Véhicules")} (${cars.length})</h2>
    <table class="doc-table">
      <thead><tr><th>${t("Véhicule")}</th><th>${t("Immatriculation")}</th><th>${t("Couleur")}</th>
        <th class="num">${t("Dernier kilométrage")}</th><th class="num">${t("Prochaine vidange")}</th></tr></thead>
      <tbody>${cars.map((c) => `<tr>
        <td><b>${esc(carLabel(c) || "—")}</b></td><td>${esc(c.plate || "—")}</td><td>${esc(c.color || "—")}</td>
        <td class="num">${fmtKm(c.km)}</td><td class="num">${fmtKm(c.nextOilKm)}</td></tr>`).join("")}</tbody>
    </table>` : "";

  const blocks = visits.map((r) => {
    const a = repairAmounts(r);
    const ref = `${r.type === "appointment" ? "RDV" : "BR"}-${String(r.id).slice(-6).toUpperCase()}`;
    const rows = repairItemRows(r, db, t, { withType: false });
    return `
      <div class="visit">
        <div class="visit-head">
          <div><b>${fmtDate(r.dateIn, lang)}</b> · ${esc(t(r.type === "appointment" ? "Rendez-vous" : "Réparation"))} · <span class="dim">${ref}</span></div>
          <div class="dim">${esc(t({ pending: "En attente", finalized: "Finalisé", canceled: "Annulé" }[r.status] || ""))}</div>
        </div>
        ${r.problem ? `<p class="note" style="margin:4px 0 2px">${esc(r.problem)}</p>` : ""}
        <table class="doc-table">
          <thead><tr><th>${t("Désignation")}</th><th class="num">${t("Qté")}</th><th class="num">${t("Prix unitaire")}</th><th class="num">${t("Total")}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="4" class="dim">${t("Aucun service")}</td></tr>`}</tbody>
        </table>
        <div class="visit-tot">
          ${a.tvaEnabled ? `<span>${t("TVA")} (${a.tvaRate}%): <b>${fmtMoney(a.tva)}</b></span>` : ""}
          <span>${t("Total")}: <b>${fmtMoney(a.total)}</b></span>
          <span>${t("Payé")}: <b>${fmtMoney(a.paid)}</b></span>
          <span class="${a.rest > 0 ? "due" : ""}">${t("Reste")}: <b>${fmtMoney(a.rest)}</b></span>
        </div>
      </div>`;
  }).join("");

  printHTML(`${t("Historique du client")} — ${client.name}`, `
    <style>
      .visit { border: 1px solid #e9e4fb; border-radius: 8px; padding: 10px 12px; margin: 10px 0; break-inside: avoid; }
      .visit-head { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; }
      .visit-tot { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 18px; margin-top: 8px; font-size: 11.5px; color: #4b5563; }
      .visit-tot b { color: #1f2937; }
      .visit-tot .due b { color: #b91c1c; }
    </style>
    ${docHead(s, t("HISTORIQUE CLIENT"), periodLabel, t)}

    <div class="grid2" style="margin-top:16px">
      <div class="box">
        <h3>${isCompany(client) ? t("Entreprise") : t("Client")}</h3>
        ${clientBoxHTML(client, t, lang)}
      </div>
      <div class="box">
        <h3>${t("Résumé de la période")}</h3>
        <div class="kv"><span>${t("Période")}</span><b>${periodLabel}</b></div>
        <div class="kv"><span>${t("Nombre de visites")}</span><b>${visits.length}</b></div>
        <div class="kv"><span>${t("Total des visites")}</span><b>${fmtMoney(sum.total)}</b></div>
        <div class="kv"><span>${t("Total payé")}</span><b>${fmtMoney(sum.paid)}</b></div>
        <div class="kv"><span>${t("Total restant")}</span><b style="color:#b91c1c">${fmtMoney(sum.rest)}</b></div>
      </div>
    </div>

    ${fleet}

    <h2>${t("Interventions")}</h2>
    ${blocks || `<p class="dim">${t("Aucune visite")}</p>`}

    <div class="foot">
      ${t("Édité le")} ${fmtDate(new Date().toISOString(), lang)} · ${esc(s.name || "")}${s.phone ? ` · ${esc(s.phone)}` : ""}
    </div>
  `, lang === "ar" ? "rtl" : "ltr");
}

function HistoryModal({ client, onClose }) {
  const { db, t, lang } = useApp();
  const [preset, setPreset] = useState("all");
  const [period, setPeriod] = useState({ from: "", to: "" });
  const range = preset === "period" ? period : presetRange(preset);
  const cars = clientCarsOf(db, client);

  const visits = useMemo(() => db.repairs
    .filter((r) => r.clientId === client.id && r.status !== "canceled")
    .filter((r) => preset === "all" || inRange(r.dateIn, range.from, range.to))
    .sort((a, b) => String(b.dateIn).localeCompare(String(a.dateIn))),
  [db.repairs, client.id, preset, range.from, range.to]);

  const total = visits.reduce((s, r) => s + Number(r.total), 0);
  const paid = visits.reduce((s, r) => s + paidOf(r.payments), 0);

  return (
    <Modal open onClose={onClose} title={`${t("Historique du client")} — ${client.name}`} width="max-w-3xl"
      footer={<Btn icon={Printer} onClick={() => printClientHistory(db, client, visits, preset === "all" ? { from: "", to: "" } : range, t, lang)}>
        {t("Imprimer le rapport")}
      </Btn>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Seg value={preset} onChange={setPreset} options={[
          { value: "all", label: t("Tous") },
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

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          [t("Total des visites"), fmtMoney(total), "grad-primary"],
          [t("Total payé"), fmtMoney(paid), "bg-gradient-to-br from-emerald-500 to-teal-600"],
          [t("Total restant"), fmtMoney(total - paid), "bg-gradient-to-br from-rose-500 to-red-600"],
        ].map(([label, value, grad], i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-xl ${grad} p-3.5 text-white shadow-lift`}>
            <p className="text-[11px] opacity-75">{label}</p>
            <p className="font-mono text-[15px] font-bold">{value}</p>
          </motion.div>
        ))}
      </div>

      {(isCompany(client) || client.address) && (
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 rounded-xl border border-primary-100 bg-surface px-4 py-3 text-xs text-slate-500">
          {client.address && <span><MapPin size={11} className="me-1 inline" />{client.address}</span>}
          {["nif", "nis", "rc", "article"].filter((k) => client[k]).map((k) => (
            <span key={k}><b className="text-primary-900">{k === "article" ? t("Article") : k.toUpperCase()}</b> {client[k]}</span>
          ))}
        </div>
      )}

      {cars.length > 0 && (
        <div className="mb-5">
          <p className="label">{t("Véhicules")} ({cars.length})</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cars.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-primary-100 bg-white px-3.5 py-2.5">
                <Car size={16} className="shrink-0 text-primary-400" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-primary-900">{carTitle(c, t)}</p>
                  <p className="text-[11px] text-slate-400">
                    {fmtKm(c.km)}
                    {c.nextOilKm !== undefined && c.nextOilKm !== "" && (
                      <span className="ms-2 text-amber-700"><Droplet size={10} className="inline" /> {fmtKm(c.nextOilKm)}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {visits.length === 0 && <p className="py-6 text-center text-sm text-slate-400">{t("Aucune visite")}</p>}
        {visits.map((r) => {
          const rest = Math.max(0, r.total - paidOf(r.payments));
          const vehicles = repairVehiclesOf(r);
          return (
            <div key={r.id} className="rounded-xl border border-primary-100 bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color={r.type === "appointment" ? "blue" : "violet"}>
                    {t(r.type === "appointment" ? "Rendez-vous" : "Réparation")}
                  </Badge>
                  <StatusBadge status={r.status} />
                </div>
                <span className="text-xs text-slate-400">{fmtDate(r.dateIn, lang)}</span>
              </div>
              {r.problem && <p className="mb-2 text-[13px] text-slate-600">{r.problem}</p>}
              <div className="space-y-2">
                {vehicles.map((v, i) => (
                  <div key={i} className="rounded-lg border border-primary-50 bg-white px-3 py-2.5">
                    {(carLabel(v.car) || v.car?.plate) && (
                      <p className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-primary-700">
                        <span className="flex items-center gap-1.5"><Car size={12} /> {carTitle(v.car, t)}</span>
                        {v.km !== "" && v.km != null && <span className="font-semibold text-slate-400">{fmtKm(v.km)}</span>}
                      </p>
                    )}
                    <VehicleItems vehicle={v} />
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t border-primary-50 pt-2">
                <MoneyLine label={t("Total")} value={fmtMoney(r.total)} />
                <MoneyLine label={t("Payé")} value={fmtMoney(paidOf(r.payments))} color="text-emerald-600" />
                <MoneyLine label={t("Reste")} value={fmtMoney(rest)} color={rest > 0 ? "text-red-500" : "text-emerald-600"} />
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export default function Clients() {
  const { db, update, t, lang, can } = useApp();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [modal, setModal] = useState(null);
  const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const list = db.clients.filter((c) => {
    if (kind === "company" && !isCompany(c)) return false;
    if (kind === "person" && isCompany(c)) return false;
    return c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").replace(/\s/g, "").includes(q.replace(/\s/g, ""));
  });

  return (
    <div>
      <PageHeader title={t("Clients")} subtitle={t("Gérez vos clients et leur historique")}
        actions={can("clients", "create") && <Btn icon={Plus} onClick={() => setModal("new")}>{t("Nouveau client")}</Btn>} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <SearchBox value={q} onChange={setQ} placeholder={t("Rechercher client (nom ou téléphone)...")} />
        </div>
        <Seg value={kind} onChange={setKind} options={[
          { value: "all", label: t("Tous") },
          { value: "person", label: t("Particuliers") },
          { value: "company", label: t("Entreprises") },
        ]} />
      </div>

      {list.length === 0 ? (
        <Empty text={t("Aucun client")} />
      ) : (
        <CardGrid cols="sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((c) => {
            const visits = db.repairs.filter((r) => r.clientId === c.id && r.status !== "canceled");
            const debt = visits.reduce((s, r) => s + Math.max(0, r.total - paidOf(r.payments)), 0);
            const company = isCompany(c);
            const carCount = clientCarsOf(db, c).length;
            return (
              <motion.div key={c.id} variants={itemRise} layout whileHover={{ y: -4 }} className="card p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-lift ${
                    company ? "bg-gradient-to-br from-sky-500 to-indigo-600" : "grad-primary"}`}>
                    {company ? <Building2 size={19} /> : c.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-primary-900">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-400"><Phone size={11} /> {c.phone || "—"}</p>
                  </div>
                  {company && <Badge color="blue" className="ms-auto">{t("Entreprise")}</Badge>}
                </div>
                {(c.address || c.nif) && (
                  <p className="mb-2 truncate text-[11px] text-slate-400">
                    {[c.address, c.nif && `NIF ${c.nif}`].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t("Client depuis")} {fmtDate(c.createdAt, lang)}</span>
                  <div className="flex items-center gap-1.5">
                    {carCount > 0 && <Badge color="gray"><Car size={11} /> {carCount}</Badge>}
                    {debt > 0 ? <Badge color="red">-{fmtMoney(debt)}</Badge> : <Badge color="green">{visits.length} ✓</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 border-t border-primary-50 pt-3">
                  {can("clients", "history") && <IconBtn icon={History} title={t("Historique")} variant="soft" onClick={() => setHistory(c)} />}
                  {can("clients", "edit") && <IconBtn icon={Pencil} title={t("Modifier")} onClick={() => setModal({ editing: c })} />}
                  {can("clients", "delete") && <IconBtn icon={Trash2} title={t("Supprimer")} variant="danger" onClick={() => setDeleting(c)} />}
                </div>
              </motion.div>
            );
          })}
        </CardGrid>
      )}

      {modal && <ClientForm editing={modal.editing} onClose={() => setModal(null)} />}
      {history && <HistoryModal client={history} onClose={() => setHistory(null)} />}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => update((d) => { d.clients = d.clients.filter((x) => x.id !== deleting.id); })} />
    </div>
  );
}
