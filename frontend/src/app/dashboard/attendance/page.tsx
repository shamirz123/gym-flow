"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FaCamera, FaCameraRotate, FaKeyboard, FaMagnifyingGlass, FaQrcode, FaStop, FaTrash } from "react-icons/fa6";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { api, ApiError, fmtDate, fmtTime, rs, toInputDate } from "@/lib/dashboardApi";
import type { Attendance, Member } from "@/lib/types";
import { NoAccess, useDashboard } from "@/components/dashboard/ui";

// The camera scanner only runs in the browser (not on the server)
const Scanner = dynamic(() => import("@yudiel/react-qr-scanner").then((m) => m.Scanner), { ssr: false, loading: () => <div className="scan-off">Loading camera...</div> });

type CheckinMember = { id: string; name: string; plan: string; expiryDate: string; monthlyFee: number; status: string };
type Result =
  | { kind: "ok"; member: CheckinMember; already: boolean; visits: number; at: string }
  | { kind: "blocked"; member?: CheckinMember; message: string; code?: string }
  | { kind: "error"; message: string };

type DayData = { date: string; total: number; records: Attendance[]; last7: { label: string; count: number }[]; hours: { hour: number; count: number }[] };

export default function AttendancePage() {
  const { toast, can } = useDashboard();
  const [camera, setCamera] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [day, setDay] = useState(toInputDate(new Date()));
  const [data, setData] = useState<DayData | null>(null);
  const [manual, setManual] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isToday = day === toInputDate(new Date());

  const load = useCallback(() => {
    api<DayData>(`/gym/attendance?date=${day}`).then(setData).catch((e) => toast(e.message, "err"));
  }, [day, toast]);

  useEffect(() => { if (can("attendance:view")) load(); }, [load, can]);
  useEffect(() => { if (can("members:view")) api<Member[]>("/gym/members").then(setMembers).catch(() => {}); }, [can]);
  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const matches = useMemo(() => {
    const n = search.trim().toLowerCase();
    if (n.length < 2) return [];
    return members.filter((m) => m.active && (m.name.toLowerCase().includes(n) || m.phone.includes(n))).slice(0, 6);
  }, [search, members]);

  const checkin = useCallback(async (body: { scan: string } | { memberId: string }) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ alreadyCheckedIn: boolean; checkedInAt: string; visitsThisMonth: number; member: CheckinMember }>("/gym/attendance/checkin", { method: "POST", body });
      setResult({ kind: "ok", member: r.member, already: r.alreadyCheckedIn, visits: r.visitsThisMonth, at: r.checkedInAt });
      if (isToday) load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setResult({ kind: "blocked", member: e.data.member, message: e.message, code: e.data.code });
      else setResult({ kind: "error", message: (e as Error).message });
    } finally {
      // Resume the scanner after 2.5 seconds for the next member
      clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => setBusy(false), 2500);
    }
  }, [busy, isToday, load]);

  if (!can("attendance:view")) return <NoAccess />;

  const onScan = (codes: IDetectedBarcode[]) => {
    const text = codes[0]?.rawValue;
    if (text) checkin({ scan: text });
  };

  const removeRecord = async (a: Attendance) => {
    if (!confirm("Delete this check-in?")) return;
    try {
      await api(`/gym/attendance/${a.id}`, { method: "DELETE" });
      load();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  const maxHour = Math.max(...(data?.hours ?? []).map((h) => h.count), 1);
  const maxDay = Math.max(...(data?.last7 ?? []).map((d) => d.count), 1);
  const box = result?.kind === "ok" ? "ok" : result ? "err" : "";

  return (
    <>
      {can("attendance:checkin") && (
        <div className="scan-grid">
          <div className="adm-card" style={{ display: "grid", gap: 14 }}>
            <h3>
              <span><FaQrcode /> QR Check-in</span>
              {camera ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="adm-btn sm" onClick={() => setFacing(facing === "environment" ? "user" : "environment")} title="Switch camera"><FaCameraRotate /></button>
                  <button className="adm-btn sm danger" onClick={() => setCamera(false)}><FaStop /> Stop</button>
                </span>
              ) : (
                <button className="adm-btn sm primary" onClick={() => { setCamera(true); setResult(null); }}><FaCamera /> Camera on</button>
              )}
            </h3>
            <div className={`scan-box ${box}`}>
              {camera ? (
                <Scanner
                  key={facing}
                  onScan={onScan}
                  onError={(err) => setResult({ kind: "error", message: `Could not open the camera: ${err?.message ?? "check camera permission"}` })}
                  paused={busy}
                  formats={["qr_code"]}
                  constraints={{ facingMode: facing }}
                  sound
                />
              ) : (
                <div className="scan-off"><FaQrcode /><span>Press <b>Camera on</b> to scan a member's digital card</span></div>
              )}
            </div>
            {/* USB / Bluetooth barcode scanners type the code and press Enter */}
            <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { checkin({ scan: manual.trim() }); setManual(""); } }} className="adm-toolbar">
              <div className="search" style={{ maxWidth: "none" }}>
                <FaKeyboard />
                <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="USB scanner / paste card link + Enter" />
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {result && <ResultPanel r={result} canPay={can("payments:write")} />}
            <div className="adm-card" style={{ display: "grid", gap: 10 }}>
              <h3>No card? Check in by name</h3>
              <div className="search" style={{ position: "relative" }}>
                <FaMagnifyingGlass style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Member name or phone..." />
              </div>
              <div className="adm-list">
                {matches.map((m) => (
                  <div key={m.id}>
                    <div className="grow"><b>{m.name}</b><small>{m.phone} · {m.plan} · {m.status}</small></div>
                    <button className="adm-btn sm primary" disabled={busy} onClick={() => { checkin({ memberId: m.id }); setSearch(""); }}>Check-in</button>
                  </div>
                ))}
                {search.trim().length >= 2 && matches.length === 0 && <div className="adm-empty">No member found</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="adm-grid-2">
        <div className="adm-card">
          <h3>
            {isToday ? "Today" : fmtDate(day)} — {data?.total ?? 0} check-ins
            <input type="date" style={{ width: "auto" }} value={day} max={toInputDate(new Date())} onChange={(e) => setDay(e.target.value)} />
          </h3>
          <div className="adm-list" style={{ maxHeight: 420, overflowY: "auto" }}>
            {data?.records.length === 0 && <div className="adm-empty">No check-ins on this day</div>}
            {data?.records.map((a) => (
              <div key={a.id}>
                <div className="grow"><b>{a.member?.name}</b><small>{a.member?.plan} · {a.method === "QR" ? "QR scan" : "Manual"}</small></div>
                <span style={{ color: "var(--muted)" }}>{fmtTime(a.checkedInAt)}</span>
                {can("members:write") && <button className="adm-btn icon danger" onClick={() => removeRecord(a)} title="Delete"><FaTrash /></button>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          <div className="adm-card">
            <h3>Last 7 days</h3>
            <div className="adm-chart" style={{ height: 150 }}>
              {data?.last7.map((d, i) => (
                <div className="bar" key={i}><div style={{ height: `${(d.count / maxDay) * 100}%` }} data-v={`${d.count} check-ins`} /><span>{d.label}</span></div>
              ))}
            </div>
          </div>
          <div className="adm-card">
            <h3>Rush hours ({isToday ? "today" : fmtDate(day)})</h3>
            <div className="hours">{data?.hours.map((h) => <div key={h.hour} style={{ height: `${(h.count / maxHour) * 100}%` }} title={`${h.hour}:00 — ${h.count}`} />)}</div>
            <div className="hours-labels"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function ResultPanel({ r, canPay }: { r: Result; canPay: boolean }) {
  if (r.kind === "ok") {
    return (
      <div className={`scan-result ${r.already ? "warn" : "ok"}`}>
        <span className="big">{r.already ? "↻ Already checked in" : "✅ Welcome!"}</span>
        <b style={{ fontSize: 18 }}>{r.member.name}</b>
        <small>{r.member.plan} · fee valid till {fmtDate(r.member.expiryDate)} · {r.visits} visits this month</small>
        {r.member.status === "expiring" && <small style={{ color: "#facc15" }}>⚠️ Fee due soon ({rs(r.member.monthlyFee)})</small>}
      </div>
    );
  }
  if (r.kind === "blocked") {
    return (
      <div className="scan-result err">
        <span className="big">⛔ Check-in refused</span>
        <b>{r.message}</b>
        {r.member && <small>{r.member.plan} · expiry {fmtDate(r.member.expiryDate)} · fee {rs(r.member.monthlyFee)}</small>}
        {r.code === "FEE_PENDING" && canPay && <Link href="/dashboard/members?status=expired" className="adm-btn sm primary" style={{ justifySelf: "start" }}>Collect fee</Link>}
      </div>
    );
  }
  return <div className="scan-result err"><span className="big">⚠️</span><b>{r.message}</b></div>;
}
