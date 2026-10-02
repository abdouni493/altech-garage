import { useApp } from "../context";
import { uid, todayISO, isCompany } from "../store";
import { Field, Input, Seg } from "./ui";

// Individual customers only need a name and a phone; a company can also carry
// its fiscal identifiers so they print on its invoices and history report.
export const emptyClientForm = () => ({
  type: "person", name: "", phone: "", address: "", nif: "", nis: "", rc: "", article: "",
});

export const clientFormOf = (c) => ({ ...emptyClientForm(), ...(c || {}) });

/** Record to store from the form — trimmed, with an empty fleet for a new client. */
export function buildClient(form, existing) {
  const clean = (v) => String(v ?? "").trim();
  const company = form.type === "company";
  return {
    ...(existing || { id: uid(), createdAt: todayISO(), cars: [] }),
    type: company ? "company" : "person",
    name: clean(form.name),
    phone: clean(form.phone),
    address: clean(form.address),
    nif: company ? clean(form.nif) : "",
    nis: company ? clean(form.nis) : "",
    rc: company ? clean(form.rc) : "",
    article: company ? clean(form.article) : "",
  };
}

export function ClientFields({ form, setForm }) {
  const { t } = useApp();
  const company = isCompany(form);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <Seg value={form.type || "person"} onChange={(type) => setForm({ ...form, type })} options={[
        { value: "person", label: t("Particulier") },
        { value: "company", label: t("Entreprise") },
      ]} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={company ? t("Nom de l'entreprise") : t("Nom complet")} required>
          <Input value={form.name} onChange={set("name")} autoFocus />
        </Field>
        <Field label={company ? `${t("Téléphone")} (${t("optionnel")})` : t("Téléphone")}>
          <Input type="tel" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label={`${t("Adresse")} (${t("optionnel")})`} className="sm:col-span-2">
          <Input value={form.address} onChange={set("address")} />
        </Field>
      </div>
      {company && (
        <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-3.5">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-primary-400">
            {t("Informations fiscales")} ({t("optionnel")})
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="NIF"><Input value={form.nif} onChange={set("nif")} /></Field>
            <Field label="NIS"><Input value={form.nis} onChange={set("nis")} /></Field>
            <Field label="RC"><Input value={form.rc} onChange={set("rc")} /></Field>
            <Field label={t("Article")}><Input value={form.article} onChange={set("article")} /></Field>
          </div>
        </div>
      )}
    </div>
  );
}
