// ===== Demo dataset =====
//
// A fixed, self-consistent garage used for tests and for the public demo: every
// page has something to show. Dates are relative to today so the dashboard,
// reports and "last 30 days" filters always have recent activity. Every id is
// prefixed with `demo-` so the set can be merged into an existing database
// without colliding with real records.

import { emptyDB, dayOffset, todayISO } from "./store";
import { normalizeEan13 } from "./barcode";

export const DEMO_USER = {
  id: "demo-admin", name: "Admin Démo", username: "demo", email: "demo@altech-garage.dz",
  password: "demo123", role: "admin",
};

const ean = (n) => normalizeEan13(`613${String(n).padStart(9, "0")}`);
const at = (offset, time = "09:00") => `${dayOffset(offset)}T${time}`;

const SERVICES = [
  ["svc-vidange", "Vidange moteur", "Huile + contrôle des niveaux", 1500],
  ["svc-diag", "Diagnostic électronique", "Lecture des codes défaut (valise)", 2000],
  ["svc-freins", "Remplacement plaquettes", "Essieu avant ou arrière", 2500],
  ["svc-equil", "Équilibrage 4 roues", "", 1200],
  ["svc-parallel", "Parallélisme", "Réglage de la géométrie", 1800],
  ["svc-clim", "Recharge climatisation", "Gaz R134a + contrôle d'étanchéité", 4500],
  ["svc-distrib", "Kit distribution", "Courroie + galets + pompe à eau", 12000],
  ["svc-batterie", "Test et pose batterie", "", 800],
].map(([id, name, description, price]) => ({ id: `demo-${id}`, name, description, price }));

const CATEGORIES = [
  ["cat-huiles", "Huiles & lubrifiants"], ["cat-filtres", "Filtres"], ["cat-freinage", "Freinage"],
  ["cat-pneus", "Pneumatiques"], ["cat-batteries", "Batteries"], ["cat-elec", "Électricité"],
].map(([id, name]) => ({ id: `demo-${id}`, name }));

// [key, name, brand, category, buy, sell, qty, min, expiration offset (days) | null]
const PRODUCTS = [
  ["oil-0w20", "OILFINO 0W20 (5L)", "Oilfino", "huiles", 3200, 4500, 18, 5, 540],
  ["oil-5w30", "Total Quartz 5W30 (5L)", "Total", "huiles", 3800, 5200, 12, 5, 600],
  ["oil-10w40", "Naftal Chellia 10W40 (5L)", "Naftal", "huiles", 2200, 3100, 4, 6, 25],
  ["f-huile", "Filtre à huile", "Purflux", "filtres", 450, 800, 30, 8, null],
  ["f-air", "Filtre à air", "Mann", "filtres", 650, 1100, 22, 6, null],
  ["f-gazoil", "Filtre à gasoil", "Bosch", "filtres", 900, 1500, 9, 4, null],
  ["f-clim", "Filtre à clim (habitacle)", "Valeo", "filtres", 700, 1200, 3, 5, null],
  ["plaq-av", "Plaquettes de frein AV", "Brembo", "freinage", 2800, 4200, 10, 4, null],
  ["disque-av", "Disque de frein AV (paire)", "Brembo", "freinage", 5500, 7800, 6, 2, null],
  ["liq-frein", "Liquide de frein DOT4 (1L)", "Bosch", "freinage", 600, 950, 14, 4, 365],
  ["pneu-195", "Pneu 195/65 R15", "Michelin", "pneus", 9500, 12500, 16, 4, null],
  ["pneu-205", "Pneu 205/55 R16", "Continental", "pneus", 11500, 14800, 8, 4, null],
  ["batt-70", "Batterie 70Ah", "Varta", "batteries", 14000, 18500, 5, 2, null],
  ["ampoule-h7", "Ampoule H7", "Philips", "elec", 350, 700, 40, 10, null],
];

const SUPPLIERS = [
  ["sup-sonelub", "Sonelub Distribution", "0550 12 34 56", "Zone industrielle, Sétif"],
  ["sup-pieces", "Pièces Auto El Baraka", "0661 45 78 90", "Cité 1000 logements, Constantine"],
  ["sup-pneus", "Pneus Service Est", "0770 98 76 54", "Route de Batna, Aïn M'lila"],
].map(([id, name, phone, address]) => ({ id: `demo-${id}`, name, phone, address }));

const car = (id, brand, name, year, plate, color, km, nextOilKm) => ({
  id: `demo-car-${id}`, brand, name, year, plate, color, description: "", km,
  ...(nextOilKm ? { nextOilKm } : {}),
});

const CLIENTS = [
  {
    id: "demo-cl-karim", type: "person", name: "Karim Benali", phone: "0555 11 22 33",
    address: "Cité El Wiam, Aïn M'lila", createdAt: dayOffset(-120),
    cars: [car("clio", "Renault", "Clio 4", "2018", "12345-118-04", "Gris", 98500, 108500)],
  },
  {
    id: "demo-cl-samira", type: "person", name: "Samira Haddad", phone: "0661 23 45 67",
    address: "", createdAt: dayOffset(-90),
    cars: [car("208", "Peugeot", "208", "2020", "23456-120-25", "Blanc", 41200)],
  },
  {
    id: "demo-cl-yacine", type: "person", name: "Yacine Mansouri", phone: "0770 34 56 78",
    address: "Rue Larbi Ben M'hidi, Constantine", createdAt: dayOffset(-60),
    cars: [
      car("golf", "Volkswagen", "Golf 7", "2016", "34567-116-25", "Noir", 152300),
      car("i10", "Hyundai", "i10", "2021", "45678-121-25", "Rouge", 23900),
    ],
  },
  {
    id: "demo-cl-nadia", type: "person", name: "Nadia Cherif", phone: "0552 45 67 89",
    address: "", createdAt: dayOffset(-30),
    cars: [car("logan", "Dacia", "Logan", "2019", "56789-119-04", "Bleu", 76000)],
  },
  {
    id: "demo-cl-transatlas", type: "company", name: "SARL TransAtlas Logistique", phone: "031 92 10 20",
    address: "Zone industrielle, Lot 14, Sétif", nif: "000419012345678", nis: "001419020123456",
    rc: "19/00-0123456B21", article: "19012345678", createdAt: dayOffset(-150),
    cars: [
      car("h100", "Hyundai", "H100", "2019", "00111-119-19", "Blanc", 186000, 196000),
      car("hilux", "Toyota", "Hilux", "2021", "00222-121-19", "Gris", 80400, 90000),
      car("master", "Renault", "Master", "2017", "00333-117-19", "Blanc", 231500),
    ],
  },
  {
    id: "demo-cl-batiplus", type: "company", name: "EURL Bati Plus", phone: "0661 77 88 99",
    address: "Route de Batna, Aïn M'lila", nif: "000504098765432", nis: "", rc: "04/00-0987654B18",
    article: "", createdAt: dayOffset(-45),
    cars: [car("partner", "Peugeot", "Partner", "2018", "00444-118-04", "Blanc", 134700)],
  },
];

const ROLES = [["role-meca", "Mécanicien"], ["role-elec", "Électricien auto"], ["role-recep", "Réceptionniste"]]
  .map(([id, name]) => ({ id: `demo-${id}`, name }));

const allow = (pages) => Object.fromEntries(pages.map(([page, actions]) => [page, actions]));

const WORKERS = [
  {
    id: "demo-w-mourad", fullName: "Mourad Saidi", birthday: "1990-04-12", idCard: "109900123", phone: "0555 66 77 88",
    roleId: "demo-role-meca", startDate: dayOffset(-400),
    pay: { enabled: true, mode: "month", amount: 45000, percent: 10 },
    account: { enabled: true, email: "mourad@altech-garage.dz", username: "mourad", password: "demo123" },
    permissions: allow([
      ["dashboard", ["view"]], ["repairs", ["view", "create", "edit", "finalize"]],
      ["services", ["view"]], ["stock", ["view"]], ["pos", ["view", "create"]], ["clients", ["view", "create", "history"]],
    ]),
    advances: [{ id: "demo-adv-1", date: dayOffset(-8), description: "Avance sur salaire", amount: 5000, settled: false }],
    absences: [{ id: "demo-abs-1", date: dayOffset(-12), description: "Absence non justifiée", cost: 1500, settled: false }],
    payments: [{
      id: "demo-pay-1", date: dayOffset(-33), description: "Salaire du mois", amount: 47800,
      details: { base: 45000, commissions: 2800, advances: 0, absences: 0 },
    }],
    settledRepairIds: [],
  },
  {
    id: "demo-w-sofiane", fullName: "Sofiane Brahimi", birthday: "1995-09-03", idCard: "", phone: "0661 99 00 11",
    roleId: "demo-role-elec", startDate: dayOffset(-200),
    pay: { enabled: true, mode: "day", amount: 2000, percent: 5 },
    account: { enabled: false, email: "", username: "", password: "" },
    permissions: {}, advances: [], absences: [], payments: [], settledRepairIds: [],
  },
  {
    id: "demo-w-amina", fullName: "Amina Kaci", birthday: "1998-01-20", idCard: "", phone: "0770 22 33 44",
    roleId: "demo-role-recep", startDate: dayOffset(-90),
    pay: { enabled: true, mode: "month", amount: 35000, percent: 0 },
    account: { enabled: false, email: "", username: "", password: "" },
    permissions: {}, advances: [], absences: [], payments: [], settledRepairIds: [],
  },
];

export function buildDemoDB() {
  const db = emptyDB();
  const pid = (k) => `demo-p-${k}`;

  db.users = [{ ...DEMO_USER }];
  db.settings = {
    ...db.settings,
    name: "Altech Garage Démo", description: "Mécanique · Vidange · Pneumatique",
    email: "contact@altech-garage.dz", phone: "0551 64 80 17", address: "Route poids lourd, Aïn M'lila",
    nif: "000304011223344", nis: "001304055667788", rc: "04/00-0112233A20", article: "04011223344",
  };
  db.services = SERVICES.map((s) => ({ ...s }));
  db.categories = CATEGORIES.map((c) => ({ ...c }));
  db.products = PRODUCTS.map(([k, name, brand, cat, buy, sell, qty, min, exp], i) => ({
    id: pid(k), name, description: "", brand, categoryId: `demo-cat-${cat}`, barcode: ean(100001 + i),
    purchasePrice: buy, salePrice: sell, qtyPrincipal: qty + 6, qtyCurrent: qty, minQty: min,
    trackExpiration: exp !== null, expiration: exp !== null ? dayOffset(exp) : "", createdAt: dayOffset(-180),
  }));
  db.suppliers = SUPPLIERS.map((s) => ({ ...s }));
  db.clients = CLIENTS.map((c) => structuredClone(c));
  db.roles = ROLES.map((r) => ({ ...r }));
  db.workers = WORKERS.map((w) => structuredClone(w));

  const price = (k) => db.products.find((p) => p.id === pid(k));
  const svcPrice = (id) => db.services.find((s) => s.id === `demo-svc-${id}`).price;

  // ---- purchases ----
  const purchase = (n, supplier, offset, lines, paidRatio) => {
    const items = lines.map(([k, qty]) => {
      const p = price(k);
      return { productId: p.id, qty, price: p.purchasePrice, salePrice: p.salePrice, minQty: p.minQty, expiration: p.expiration };
    });
    const total = items.reduce((s, it) => s + it.qty * it.price, 0);
    const paid = Math.round(total * paidRatio);
    return {
      id: `demo-ach-${n}`, ref: `ACH-${String(n).padStart(4, "0")}`, supplierId: `demo-sup-${supplier}`,
      date: dayOffset(offset), items, total,
      payments: paid ? [{ id: `demo-ach-pay-${n}`, amount: paid, date: dayOffset(offset) }] : [],
      createdAt: dayOffset(offset),
    };
  };
  db.purchases = [
    purchase(3, "pneus", -6, [["pneu-195", 8], ["pneu-205", 4]], 0.5),
    purchase(2, "pieces", -18, [["plaq-av", 6], ["disque-av", 2], ["f-huile", 20], ["f-air", 12]], 1),
    purchase(1, "sonelub", -40, [["oil-0w20", 12], ["oil-5w30", 10], ["oil-10w40", 6]], 1),
  ];

  // ---- repairs & appointments ----
  const vehicle = (carKey, km, services, products, oilChange) => {
    const owner = db.clients.find((c) => c.cars.some((x) => x.id === `demo-car-${carKey}`));
    const c = owner.cars.find((x) => x.id === `demo-car-${carKey}`);
    return {
      carId: c.id,
      car: { name: c.name, brand: c.brand, color: c.color, year: c.year, plate: c.plate, description: "" },
      km,
      services: services.map((s) => ({ serviceId: `demo-svc-${s}` })),
      products: products.map(([k, qty]) => ({ productId: pid(k), qty })),
      ...(oilChange ? { oilChange } : {}),
    };
  };
  const repair = ({ n, type = "repair", status = "finalized", client, offset, time = "09:00", vehicles, problem = "", paid = "all", tva = false, workers = [] }) => {
    const subtotal = vehicles.reduce((s, v) =>
      s + v.services.reduce((a, it) => a + svcPrice(it.serviceId.replace("demo-svc-", "")), 0)
        + v.products.reduce((a, it) => a + db.products.find((p) => p.id === it.productId).salePrice * it.qty, 0), 0);
    const tvaAmount = tva ? Math.round(subtotal * 0.19) : 0;
    const total = subtotal + tvaAmount;
    const amount = paid === "all" ? total : paid;
    return {
      id: `demo-rep-${n}`, type, status,
      dateIn: at(offset, time), dateOut: at(offset, type === "appointment" ? "12:00" : "17:00"),
      clientId: client ? `demo-cl-${client}` : "", problem,
      vehicles, car: vehicles[0].car,
      services: vehicles.flatMap((v) => v.services), products: vehicles.flatMap((v) => v.products),
      subtotal, tva: { enabled: tva, rate: 19, amount: tvaAmount }, total,
      payments: amount > 0 ? [{ id: `demo-rep-pay-${n}`, amount, date: dayOffset(Math.min(offset, 0)) }] : [],
      workers, createdAt: dayOffset(Math.min(offset, 0)),
    };
  };
  const filters = (oil, air, fuel = false, ac = false) => ({ oil, air, fuel, ac });

  db.repairs = [
    repair({ n: 12, type: "appointment", status: "pending", client: "samira", offset: 2, time: "10:30",
      vehicles: [vehicle("208", 41200, ["clim"], [])], problem: "La climatisation souffle de l'air chaud." }),
    repair({ n: 11, type: "appointment", status: "pending", client: "transatlas", offset: 1, time: "08:30",
      vehicles: [vehicle("master", 231500, ["distrib"], []), vehicle("hilux", 80400, ["parallel"], [])],
      problem: "Kit distribution à remplacer (Master) + géométrie Hilux.", paid: 0 }),
    repair({ n: 10, status: "pending", client: "nadia", offset: 0, time: "11:00",
      vehicles: [vehicle("logan", 76000, ["diag"], [])], problem: "Voyant moteur allumé.", paid: 0,
      workers: ["demo-w-sofiane"] }),
    repair({ n: 9, client: "karim", offset: 0, time: "08:15",
      vehicles: [vehicle("clio", 98500, ["vidange"], [["oil-5w30", 1], ["f-huile", 1], ["f-air", 1]],
        { oil: "Total Quartz 5W30", km: 98500, nextKm: 108500, filters: filters(true, true), date: `${todayISO()}T08:40:12` })],
      workers: ["demo-w-mourad"] }),
    repair({ n: 8, client: "transatlas", offset: -3, time: "09:30", tva: true,
      vehicles: [
        vehicle("h100", 186000, ["vidange"], [["oil-0w20", 1], ["f-huile", 1], ["f-gazoil", 1]],
          { oil: "OILFINO 0W20", km: 186000, nextKm: 196000, filters: filters(true, false, true), date: `${dayOffset(-3)}T10:26:59` }),
        vehicle("hilux", 80400, ["vidange", "freins"], [["oil-0w20", 1], ["f-huile", 1], ["plaq-av", 1]],
          { oil: "OILFINO 0W20", km: 80400, nextKm: 90000, filters: filters(true, false), date: `${dayOffset(-3)}T11:02:10` }),
      ],
      problem: "Entretien périodique de la flotte.", paid: 20000, workers: ["demo-w-mourad"] }),
    repair({ n: 7, client: "yacine", offset: -5, time: "14:00",
      vehicles: [vehicle("golf", 152300, ["freins"], [["plaq-av", 1], ["disque-av", 1], ["liq-frein", 1]])],
      problem: "Bruit au freinage.", paid: 8000, workers: ["demo-w-mourad"] }),
    repair({ n: 6, client: "batiplus", offset: -9, time: "10:00", tva: true,
      vehicles: [vehicle("partner", 134700, ["equil", "parallel"], [["pneu-195", 2]])], workers: ["demo-w-mourad"] }),
    repair({ n: 5, client: "yacine", offset: -14, time: "16:00",
      vehicles: [vehicle("i10", 23900, ["batterie"], [["batt-70", 1]])], workers: ["demo-w-sofiane"] }),
    repair({ n: 4, client: "samira", offset: -21, time: "09:00",
      vehicles: [vehicle("208", 40100, ["vidange"], [["oil-5w30", 1], ["f-huile", 1], ["f-clim", 1]],
        { oil: "Total Quartz 5W30", km: 40100, nextKm: 50100, filters: filters(true, false, false, true), date: `${dayOffset(-21)}T09:45:00` })] }),
    repair({ n: 3, client: "", offset: -26, time: "15:30",
      vehicles: [vehicle("logan", 74800, ["equil"], [])], problem: "Client de passage." }),
    repair({ n: 2, client: "karim", offset: -35, time: "10:00",
      vehicles: [vehicle("clio", 96000, ["diag"], [["ampoule-h7", 2]])] }),
    repair({ n: 1, type: "appointment", status: "canceled", client: "nadia", offset: -40, time: "09:00",
      vehicles: [vehicle("logan", 72000, ["vidange"], [])], paid: 0 }),
  ];
  // The walk-in job above isn't tied to Nadia's file
  const walkIn = db.repairs.find((r) => r.id === "demo-rep-3");
  walkIn.vehicles[0].carId = "";

  // ---- point-of-sale ----
  const sale = (n, client, offset, lines, { discount = 0, paid = "all" } = {}) => {
    const items = lines.map(([k, qty]) => {
      const p = price(k);
      return { productId: p.id, name: p.name, qty, price: p.salePrice };
    });
    const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
    const total = subtotal - discount;
    const amount = paid === "all" ? total : paid;
    return {
      id: `demo-vnt-${n}`, ref: `VNT-${String(n).padStart(4, "0")}`, clientId: client ? `demo-cl-${client}` : "",
      date: dayOffset(offset), items, subtotal, discount: { enabled: discount > 0, amount: discount }, total,
      payments: amount > 0 ? [{ id: `demo-vnt-pay-${n}`, amount, date: dayOffset(offset) }] : [],
      note: "", createdAt: dayOffset(offset),
    };
  };
  db.sales = [
    sale(5, "", 0, [["ampoule-h7", 2]]),
    sale(4, "batiplus", -2, [["oil-10w40", 2], ["f-huile", 2]], { paid: 4000 }),
    sale(3, "", -7, [["liq-frein", 1], ["ampoule-h7", 1]]),
    sale(2, "karim", -15, [["pneu-195", 2]], { discount: 1000 }),
    sale(1, "", -28, [["batt-70", 1]]),
  ];

  // ---- expenses & cash register ----
  db.expenseCategories = [["exp-loyer", "Loyer"], ["exp-energie", "Électricité & eau"], ["exp-fourn", "Fournitures"]]
    .map(([id, name]) => ({ id: `demo-${id}`, name }));
  db.expenses = [
    ["e1", "Loyer du local", "", "loyer", 60000, -2],
    ["e2", "Facture Sonelgaz", "Bimestre", "energie", 14500, -10],
    ["e3", "Chiffons et dégraissant", "", "fourn", 3200, -4],
    ["e4", "Bouteille d'eau et café", "", "fourn", 1800, -1],
    ["e5", "Loyer du local", "", "loyer", 60000, -32],
  ].map(([id, name, description, cat, amount, offset]) => ({
    id: `demo-${id}`, name, description, categoryId: `demo-exp-${cat}`, amount, date: dayOffset(offset),
  }));

  db.caisseCategories = [["cs-apport", "Apport du gérant"], ["cs-banque", "Dépôt en banque"]]
    .map(([id, name]) => ({ id: `demo-${id}`, name }));
  db.caisse = [
    ["c1", "deposit", 300000, -45, "Fonds de caisse", "apport"],
    ["c2", "withdraw", 80000, -15, "Versement BNA", "banque"],
    ["c3", "deposit", 20000, -6, "Apport pour achat pneus", "apport"],
    ["c4", "withdraw", 10000, -1, "Monnaie", ""],
  ].map(([id, type, amount, offset, description, cat]) => ({
    id: `demo-${id}`, type, amount, date: dayOffset(offset), description, categoryId: cat ? `demo-${cat === "apport" ? "cs-apport" : "cs-banque"}` : "",
  }));

  // ---- barcode library ----
  db.barcodes = ["oil-0w20", "f-huile", "pneu-195"].map((k, i) => {
    const p = price(k);
    return { id: `demo-bc-${i + 1}`, name: p.name, code: p.barcode, price: p.salePrice, productId: p.id, createdAt: dayOffset(-20) };
  });

  db.counters = { purchase: 4, sale: 6 };
  return db;
}

/** True when a database holds no business data yet (only, at most, accounts and settings). */
export const isBlankDB = (db) =>
  ["clients", "products", "repairs", "sales", "purchases", "services"].every((k) => !(db?.[k] || []).length);

/** Adds the demo records missing from `db` (mutates it). Real records are never touched. */
export function mergeDemoInto(db) {
  const demo = buildDemoDB();
  for (const [key, list] of Object.entries(demo)) {
    if (!Array.isArray(list)) continue;
    if (!Array.isArray(db[key])) db[key] = [];
    const have = new Set(db[key].map((x) => x.id));
    list.forEach((rec) => { if (!have.has(rec.id)) db[key].push(rec); });
  }
  if (!db.settings?.name) db.settings = { ...demo.settings, ...Object.fromEntries(Object.entries(db.settings || {}).filter(([, v]) => v)) };
  return db;
}
