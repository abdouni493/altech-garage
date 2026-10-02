import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Camera, CameraOff, Keyboard, Check } from "lucide-react";
import { useApp } from "../context";
import { Btn, IconBtn, Modal, Input, Select } from "./ui";

// Short confirmation beep — scanners at a counter are used without looking.
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square"; o.frequency.value = 1450; g.gain.value = 0.06;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.09);
    o.onended = () => ctx.close();
  } catch { /* no audio */ }
  navigator.vibrate?.(60);
}

const SAME_CODE_DELAY = 1500; // ms before the same code counts as a new scan

/**
 * Camera barcode scanner (EAN-13, EAN-8, UPC, Code 128, QR…) with a manual /
 * USB-scanner field as fallback. `continuous` keeps the camera open so several
 * items can be scanned in a row; otherwise it closes after the first code.
 * `onDetected(code)` may return a short message (e.g. "introuvable") to show.
 */
export function BarcodeScanner({ open, onClose, onDetected, continuous = false, title }) {
  const { t } = useApp();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const lastRef = useRef({ code: "", at: 0 });
  const handlerRef = useRef(onDetected);
  handlerRef.current = onDetected;

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState("starting"); // starting | running | error
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [feed, setFeed] = useState([]); // last scans: [{ code, msg }]

  const handle = (raw) => {
    const code = String(raw || "").trim();
    if (!code) return;
    const now = Date.now();
    if (lastRef.current.code === code && now - lastRef.current.at < SAME_CODE_DELAY) return;
    lastRef.current = { code, at: now };
    beep();
    const msg = handlerRef.current?.(code);
    if (!continuous) { onClose(); return; }
    setFeed((f) => [{ code, msg: typeof msg === "string" ? msg : "", id: now }, ...f].slice(0, 4));
  };

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setStatus("starting"); setError("");

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setError(t("La caméra n'est pas disponible ici (HTTPS requis). Utilisez la saisie manuelle ou un lecteur USB."));
        return;
      }
      try {
        // Loaded on demand: the decoder is large and only needed when scanning.
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120 });
        const cb = (result) => { if (result) handle(result.getText()); };
        const controls = deviceId
          ? await reader.decodeFromVideoDevice(deviceId, videoRef.current, cb)
          : await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoRef.current, cb);
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
        setStatus("running");
        const cams = await BrowserMultiFormatReader.listVideoInputDevices().catch(() => []);
        if (!cancelled) setDevices(cams);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err?.name === "NotAllowedError"
          ? t("Accès à la caméra refusé. Autorisez la caméra dans le navigateur, ou saisissez le code.")
          : err?.name === "NotFoundError"
            ? t("Aucune caméra détectée. Utilisez un lecteur USB ou la saisie manuelle.")
            : `${t("Impossible de démarrer la caméra")} (${err?.message || err})`);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, deviceId]);

  useEffect(() => { if (!open) { setFeed([]); setManual(""); lastRef.current = { code: "", at: 0 }; } }, [open]);

  const submitManual = () => {
    const code = manual.trim();
    if (!code) return;
    lastRef.current = { code: "", at: 0 }; // typed codes always count
    setManual("");
    handle(code);
  };

  // Portalled: opened from inside another modal, a fixed overlay under a
  // transformed parent would be positioned against that parent instead.
  return createPortal(
    <Modal open={open} onClose={onClose} title={title || t("Scanner un code-barres")} width="max-w-lg"
      footer={<Btn variant={continuous ? "primary" : "ghost"} icon={continuous ? Check : undefined} onClick={onClose}>
        {continuous ? t("Terminer") : t("Fermer")}
      </Btn>}>
      <div className="space-y-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {status === "running" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[42%] w-[78%] rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,10,40,0.45)]">
                <motion.div className="absolute inset-x-2 h-0.5 rounded bg-accent-400 shadow-[0_0_12px_rgba(251,146,60,0.9)]"
                  animate={{ top: ["8%", "92%", "8%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
              </div>
            </div>
          )}
          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
              {status === "error" ? <CameraOff size={34} /> : <Camera size={34} className="animate-pulse" />}
              <p className="text-sm">{status === "error" ? error : t("Démarrage de la caméra...")}</p>
            </div>
          )}
        </div>

        {devices.length > 1 && (
          <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">{t("Caméra par défaut")}</option>
            {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `${t("Caméra")} ${i + 1}`}</option>)}
          </Select>
        )}

        <div>
          <p className="label flex items-center gap-1.5"><Keyboard size={13} /> {t("Saisie manuelle ou lecteur USB")}</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input value={manual} autoFocus={status === "error"} inputMode="numeric" className="input font-mono"
                placeholder={t("Code-barres puis Entrée")}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitManual(); } }} />
            </div>
            <Btn variant="soft" onClick={submitManual}>{t("Valider")}</Btn>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {feed.map((f) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-xs ${
                f.msg ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
              <span className="font-mono font-semibold">{f.code}</span>
              <span>{f.msg || t("Ajouté")}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Modal>,
    document.body
  );
}

/** Icon button that opens the scanner. */
export function ScanButton({ onDetected, continuous, title, label, variant = "soft" }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      {label
        ? <Btn variant={variant} icon={ScanLine} onClick={() => setOpen(true)}>{label}</Btn>
        : <IconBtn icon={ScanLine} variant={variant} title={title || t("Scanner un code-barres")} onClick={() => setOpen(true)} className="!h-[42px] !w-[42px] shrink-0" />}
      <BarcodeScanner open={open} onClose={() => setOpen(false)} onDetected={onDetected}
        continuous={continuous} title={title} />
    </>
  );
}
