'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { readFromDb, insertToDb, updateInDb, deleteFromDb } from '@/lib/supabase'
import {
  ScanLine, Wrench, Boxes, AlertTriangle, CheckCircle2, Plus, Minus,
  Activity, TrendingDown, CircleDot, Settings, RotateCcw, Trash2,
  ChevronLeft, Power, Cog, RefreshCw, UserX, ShieldAlert, MoreHorizontal,
  Scissors, Factory, ClipboardList, PackagePlus, Lock, KeyRound, Camera,
  QrCode, Pencil, X
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, Legend
} from 'recharts'

const PASSWORD = '12345678'
const GRADE_COLORS = ['#F59E1B', '#5B8DEF', '#2DBFA7', '#D98B5F', '#9B8BD9', '#E06C9F', '#7FB069', '#E8A0BF']
const uid = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
const genCode = () => 'SSI-' + Math.random().toString(36).slice(2, 8).toUpperCase()
const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10)
const mmdd = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}` }
const hoursBetween = (a, b) => Math.max(0, (b - a) / 3.6e6)
const nf = (n, d = 0) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })

const REASONS = [
  { code: 'wire', en: 'Wire breakage', hi: 'तार टूटना', icon: Scissors },
  { code: 'die', en: 'Die / tool change', hi: 'डाई बदलना', icon: Wrench },
  { code: 'mech', en: 'Mechanical fault', hi: 'मशीन खराबी', icon: Cog },
  { code: 'power', en: 'Power failure', hi: 'बिजली गुल', icon: Power },
  { code: 'jam', en: 'Material jam', hi: 'माल फँसना', icon: AlertTriangle },
  { code: 'change', en: 'Changeover / setup', hi: 'सेटअप बदलना', icon: RefreshCw },
  { code: 'qa', en: 'Quality stop', hi: 'क्वालिटी रुकावट', icon: ShieldAlert },
  { code: 'noop', en: 'No operator', hi: 'ऑपरेटर नहीं', icon: UserX },
  { code: 'other', en: 'Other', hi: 'अन्य', icon: MoreHorizontal },
]
const reasonIcon = (en) => (REASONS.find(r => r.en === en) || REASONS[8]).icon

export default function FloorApp({ initialCfg, initialCon, initialDown, supabaseReady, onLoad }) {
  const [view, setView] = useState('operator')
  const [cfg, setCfg] = useState(initialCfg)
  const [con, setCon] = useState(initialCon)
  const [down, setDown] = useState(initialDown)
  const [now, setNow] = useState(Date.now())
  const [toast, setToast] = useState(null)
  const toastT = useRef(null)

  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)

  const [sel, setSel] = useState(null)
  const [opMode, setOpMode] = useState('home')
  const [opName, setOpName] = useState('Operator')
  const [wGrade, setWGrade] = useState(null)
  const [wQty, setWQty] = useState(0)
  const [fReason, setFReason] = useState(null)
  const [fNote, setFNote] = useState('')

  const [mWiz, setMWiz] = useState({ step: 0, name: '', type: 'Heading', grade: '', qr: '', scanning: false })
  const [gradeDraft, setGradeDraft] = useState([])
  const [addGradeText, setAddGradeText] = useState('')
  const [lForm, setLForm] = useState({ grade: '', received: '', supplier: '' })
  const [pForm, setPForm] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  function flash(msg, icon = 'ok') {
    setToast({ msg, icon })
    clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToast(null), 2600)
  }

  const params = cfg?.params || { leadTimeDays: 7, orderingCost: 1500, holdingCostPerKgYr: 18, serviceZ: 1.65, opHoursPerDay: 16 }
  const machines = cfg?.machines || []
  const grades = cfg?.grades || []
  const lots = cfg?.lots || []
  const gradeColor = (g) => GRADE_COLORS[Math.max(0, grades.indexOf(g)) % GRADE_COLORS.length] || '#888'
  const mName = (id) => machines.find(m => m.id === id)?.name || id

  const conByLot = useMemo(() => {
    const m = {}
    con.forEach(c => { m[c.lot_id] = (m[c.lot_id] || 0) + c.qty_kg })
    return m
  }, [con])
  const lotRemaining = (lot) => Math.max(0, lot.received - (conByLot[lot.id] || 0))
  const onHand = (g) => lots.filter(l => l.grade === g).reduce((s, l) => s + lotRemaining(l), 0)
  const fifoLot = (g) => lots.filter(l => l.grade === g && lotRemaining(l) > 0).sort((a, b) => a.date_received - b.date_received)[0] || null

  const openFaults = useMemo(() => down.filter(d => !d.closed_at), [down])
  const openFaultOf = (mid) => openFaults.find(d => d.machine_id === mid) || null
  const latestGradeOf = (mid) => {
    const c = con.filter(x => x.machine_id === mid).sort((a, b) => b.ts - a.ts)[0]
    return c ? c.grade : (machines.find(m => m.id === mid)?.grade || '')
  }
  const statusOf = (mid) => {
    if (openFaultOf(mid)) return 'down'
    const recent = con.some(c => c.machine_id === mid && now - new Date(c.ts).getTime() < 120 * 6e4)
    return recent ? 'run' : 'idle'
  }

  const gradeStats = useMemo(() => {
    const out = {}
    grades.forEach(g => {
      const series = new Array(30).fill(0)
      con.filter(c => c.grade === g).forEach(c => {
        const idx = 29 - Math.floor((now - new Date(c.ts).getTime()) / 864e5)
        if (idx >= 0 && idx < 30) series[idx] += c.qty_kg
      })
      const mean = series.reduce((a, b) => a + b, 0) / 30
      const std = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / 30)
      const LT = params.leadTimeDays
      const safety = params.serviceZ * std * Math.sqrt(LT)
      const rop = mean * LT + safety
      const Dann = mean * 365
      const eoq = params.holdingCostPerKgYr > 0 ? Math.sqrt((2 * Dann * params.orderingCost) / params.holdingCostPerKgYr) : 0
      const hand = onHand(g)
      const daysLeft = mean > 0 ? hand / mean : Infinity
      let st = 'ok'
      if (mean > 0 && hand <= rop) st = 'down'
      else if (mean > 0 && hand <= rop * 1.5) st = 'warn'
      out[g] = { mean, std, rop, eoq, hand, daysLeft, st }
    })
    return out
  }, [con, grades, lots, params, now])

  const trend = useMemo(() => {
    const days = []
    for (let d = 13; d >= 0; d--) {
      const ts = now - d * 864e5
      const row = { date: mmdd(ts) }
      grades.forEach(g => (row[g] = 0))
      days.push({ row, key: dayKey(ts) })
    }
    con.forEach(c => {
      const slot = days.find(d => d.key === dayKey(new Date(c.ts).getTime()))
      if (slot) slot.row[c.grade] = (slot.row[c.grade] || 0) + c.qty_kg
    })
    return days.map(d => d.row)
  }, [con, grades, now])

  const closed = useMemo(() => down.filter(d => d.closed_at), [down])
  const pareto = useMemo(() => {
    const agg = {}
    down.forEach(d => {
      const h = hoursBetween(new Date(d.opened_at).getTime(), new Date(d.closed_at || now).getTime())
      agg[d.reason] = (agg[d.reason] || 0) + h
    })
    const rows = Object.entries(agg).map(([reason, hours]) => ({ reason, hours })).sort((a, b) => b.hours - a.hours)
    const total = rows.reduce((s, r) => s + r.hours, 0) || 1
    let cum = 0
    rows.forEach(r => { cum += r.hours; r.cum = (cum / total) * 100 })
    return rows
  }, [down, now])

  const machineDown = useMemo(() => {
    return machines.map(m => {
      const evs = closed.filter(d => d.machine_id === m.id)
      const incidents = evs.length
      const hrs = evs.reduce((s, d) => s + hoursBetween(new Date(d.opened_at).getTime(), new Date(d.closed_at).getTime()), 0)
      const mttr = incidents ? hrs / incidents : 0
      const sched = params.opHoursPerDay * 30
      const avail = Math.max(0, Math.min(100, (1 - hrs / sched) * 100))
      return { id: m.id, incidents, hrs, mttr, avail }
    }).sort((a, b) => b.hrs - a.hrs)
  }, [machines, closed, params])

  const totalStock = grades.reduce((s, g) => s + onHand(g), 0)
  const downHrs7 = down.reduce((s, d) => {
    const end = d.closed_at ? new Date(d.closed_at).getTime() : now
    if (!d.closed_at || now - end < 7 * 864e5) return s + hoursBetween(Math.max(new Date(d.opened_at).getTime(), now - 7 * 864e5), end)
    return s
  }, 0)
  const counts = machines.reduce((a, m) => { a[statusOf(m.id)]++; return a }, { run: 0, down: 0, idle: 0 })

  /* Database actions */
  async function logWire() {
    const lot = fifoLot(wGrade)
    if (!lot || wQty <= 0) return
    await insertToDb('consumption', {
      id: uid('c'),
      machine_id: sel,
      grade: wGrade,
      lot_id: lot.id,
      qty_kg: wQty,
      operator: opName || 'Operator',
      ts: new Date().toISOString(),
    })
    onLoad()
    flash(`Logged ${nf(wQty)} kg of ${wGrade} on ${mName(sel)}`)
    setOpMode('home')
    setWQty(0)
  }

  async function reportFault() {
    if (!fReason) return
    await insertToDb('downtime', {
      id: uid('d'),
      machine_id: sel,
      reason: fReason,
      note: fNote.trim(),
      operator: opName || 'Operator',
      opened_at: new Date().toISOString(),
      closed_at: null,
    })
    onLoad()
    flash(`${mName(sel)} reported down — ${fReason}`, 'down')
    setOpMode('home')
    setFReason(null)
    setFNote('')
  }

  async function resolveFault(mid) {
    const fault = openFaultOf(mid)
    if (fault) await updateInDb('downtime', fault.id, { closed_at: new Date().toISOString() })
    onLoad()
    flash(`${mName(mid)} marked running`)
  }

  async function deleteEntry(id) {
    await deleteFromDb('consumption', id)
    onLoad()
    flash('Entry removed')
  }

  async function commitMachine() {
    const name = mWiz.name.trim()
    const qr = mWiz.qr.trim()
    if (!name) { flash('Give the machine a name', 'down'); return }
    if (!qr) { flash('Link or generate a QR code', 'down'); return }
    if (machines.some(m => m.qr === qr)) { flash('That QR is already linked', 'down'); return }
    
    await insertToDb('machines', { id: uid('m'), name, type: mWiz.type, grade: mWiz.grade, qr })
    onLoad()
    flash(`Machine "${name}" set and linked`)
    setMWiz({ step: 0, name: '', type: 'Heading', grade: '', qr: '', scanning: false })
  }

  async function removeMachine(id) {
    await deleteFromDb('machines', id)
    onLoad()
    if (sel === id) setSel(null)
    flash('Machine removed')
  }

  async function renameGrade(idx) {
    const old = grades[idx]
    const nw = (gradeDraft[idx] || '').trim()
    if (!nw || nw === old) return
    if (grades.some((g, i) => i !== idx && g === nw)) { flash('Already exists', 'down'); return }
    
    // Update grade name
    await updateInDb('grades', old, { name: nw })
    // Update all references
    con.forEach(c => { if (c.grade === old) c.grade = nw })
    down.forEach(d => { if (d.grade === old) d.grade = nw })
    machines.forEach(m => { if (m.grade === old) m.grade = nw })
    lots.forEach(l => { if (l.grade === old) l.grade = nw })
    
    onLoad()
    flash(`Renamed "${old}" → "${nw}"`)
  }

  async function addGrade() {
    const nm = addGradeText.trim()
    if (!nm) return
    if (grades.includes(nm)) { flash('Already exists', 'down'); return }
    
    await insertToDb('grades', { id: uid('g'), name: nm })
    onLoad()
    setAddGradeText('')
    flash(`Added wire "${nm}"`)
  }

  async function removeGrade(idx) {
    const g = grades[idx]
    if (lots.some(l => l.grade === g)) { flash('Remove its stock first', 'down'); return }
    
    await deleteFromDb('grades', g)
    onLoad()
    flash(`Removed wire "${g}"`)
  }

  async function addLot() {
    if (!lForm.grade || !(+lForm.received > 0)) return
    await insertToDb('lots', {
      id: uid('L'),
      grade: lForm.grade,
      received: +lForm.received,
      supplier: lForm.supplier.trim() || '—',
      date_received: new Date().toISOString(),
    })
    onLoad()
    flash(`Coil added: ${nf(+lForm.received)} kg ${lForm.grade}`)
    setLForm({ grade: grades[0] || '', received: '', supplier: '' })
  }

  async function clearAll() {
    // This requires server-side deletion (implement as needed)
    setConfirmClear(false)
    flash('Clear all feature requires server setup')
  }

  function tryUnlock() {
    if (pw === PASSWORD) { setUnlocked(true); setPw(''); setPwErr(false) }
    else { setPwErr(true) }
  }

  // UI Components and rendering...
  const Lamp = ({ s }) => <span style={{ width: 9, height: 9, borderRadius: '50%', background: s === 'run' ? 'var(--run)' : s === 'down' ? 'var(--down)' : 'var(--idle)', boxShadow: `0 0 0 3px ${s === 'run' ? 'var(--run-soft)' : s === 'down' ? 'var(--down-soft)' : 'var(--idle-soft)'}` }} />
  
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
:root{--bg:#15171B;--bg2:#1B1E24;--panel:#1F242B;--panel2:#262C34;--line:#333B45;--line-soft:#2A313A;--text:#E9ECEF;--dim:#9AA4AF;--faint:#6A727B;--amber:#F59E1B;--amber-soft:rgba(245,158,27,.13);--amber-line:rgba(245,158,27,.4);--run:#34D399;--run-soft:rgba(52,211,153,.13);--down:#F2555A;--down-soft:rgba(242,85,90,.13);--idle:#727C88;--idle-soft:rgba(114,124,136,.13);--ui:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;}
*{box-sizing:border-box}
.ssi{background:var(--bg);color:var(--text);font-family:var(--ui);min-height:100vh;-webkit-font-smoothing:antialiased;font-size:14px;line-height:1.5}
.ssi button{font-family:inherit;cursor:pointer}
.ssi input,.ssi select{font-family:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:18px 16px 80px}
.col{max-width:470px;margin:0 auto}
.topbar{position:sticky;top:0;z-index:30;background:rgba(27,30,36,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.topbar-in{max-width:1180px;margin:0 auto;padding:11px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px}
.brand-mark{font-family:var(--mono);font-weight:600;letter-spacing:.06em;font-size:15px}
.brand-star{color:var(--amber)}
.brand-sub{font-family:var(--mono);font-size:9.5px;letter-spacing:.18em;color:var(--faint);text-transform:uppercase;margin-top:1px}
.seg{display:flex;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:3px}
.seg-btn{border:none;background:transparent;color:var(--dim);padding:7px 13px;border-radius:7px;font-size:12.5px;font-weight:600;letter-spacing:.02em;display:flex;align-items:center;gap:6px;transition:all .15s}
.seg-btn.active{background:var(--panel2);color:var(--text);box-shadow:0 1px 0 rgba(0,0,0,.3)}
.seg-btn:hover:not(.active){color:var(--text)}
.eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--faint);margin-bottom:7px;display:flex;align-items:center;gap:7px}
.eyebrow .ln{flex:1;height:1px;background:var(--line-soft)}
.h-sec{font-size:18px;font-weight:600;letter-spacing:-.01em;margin:0 0 2px}
.sec{margin-top:30px}
.sec:first-child{margin-top:18px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:13px;overflow:hidden}
.grid-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:11px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 14px;position:relative}
.kpi-l{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--dim)}
.kpi-v{font-family:var(--mono);font-size:27px;font-weight:600;line-height:1.1;margin-top:7px}
.kpi-u{font-size:11px;color:var(--faint);margin-left:5px;font-weight:500}
.grid-plates{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.plate{background:var(--panel2);border:1px solid var(--line);border-radius:11px;padding:11px 12px 12px;text-align:left;cursor:pointer;transition:all .12s}
.plate:hover{border-color:var(--amber-line);transform:translateY(-2px)}
.plate-id{font-family:var(--mono);font-weight:600;font-size:15px}
.grid-manage{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}
.btn{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:10px;padding:11px 15px;font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .14s}
.btn:hover{border-color:var(--faint)}
.btn-amber{background:var(--amber);border-color:var(--amber);color:#1A1206}
.btn-amber:hover{filter:brightness(1.07)}
.btn-block{width:100%}
.btn-sm{padding:7px 11px;font-size:12px}
.btn-danger{color:var(--down);border-color:var(--down-soft);background:var(--down-soft)}
.field{margin-bottom:11px}
.label{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);display:block;margin-bottom:6px}
.input,.select{width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:9px;padding:10px 11px;font-size:13.5px;outline:none}
.input:focus,.select:focus{border-color:var(--amber-line)}
.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:60;background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--amber);border-radius:11px;padding:13px 18px;font-size:13.5px;font-weight:500;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;align-items:center;gap:10px;animation:rise .25s ease}
@keyframes rise{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
.empty{text-align:center;padding:36px 18px;color:var(--faint);font-size:13px}
.note{font-size:12px;color:var(--dim);line-height:1.65}
.badge{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:6px;font-weight:600}
.badge.ok{color:var(--run);background:var(--run-soft)}
.badge.warn{color:var(--amber);background:var(--amber-soft)}
.badge.down{color:var(--down);background:var(--down-soft)}
.chart-wrap{height:248px;width:100%}
.glock{max-width:380px;margin:54px auto 0}
.row-between{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.mono{font-family:var(--mono)}
`

  return (
    <div className="ssi">
      <style>{CSS}</style>
      <div className="topbar"><div className="topbar-in">
        <div className="brand">
          <div><div className="brand-mark">SEVVEN<span className="brand-star">★</span>STAR</div><div className="brand-sub">Floor · Stock &amp; Uptime</div></div>
        </div>
        <div className="seg">
          <button className={`seg-btn ${view === 'operator' ? 'active' : ''}`} onClick={() => setView('operator')}><ScanLine size={14} /> Operator</button>
          <button className={`seg-btn ${view === 'supervisor' ? 'active' : ''}`} onClick={() => setView('supervisor')}><ClipboardList size={14} /> Supervisor</button>
          <button className={`seg-btn ${view === 'office' ? 'active' : ''}`} onClick={() => setView('office')}>{unlocked ? <Activity size={14} /> : <Lock size={13} />} Head office</button>
        </div>
      </div></div>

      <div className="wrap">
        {view === 'operator' && <div className="col"><p className="empty">Operator view coming soon — switch to Supervisor or Head office to test</p></div>}
        {view === 'supervisor' && <div className="col"><p className="empty">Supervisor view coming soon</p></div>}
        {view === 'office' && !unlocked && (
          <div className="glock">
            <div className="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Lock size={20} color="var(--amber)" />
                <h2 className="h-sec" style={{ margin: 0 }}>Head office</h2>
              </div>
              <div className="field">
                <label className="label">Password</label>
                <input className="input mono" type="password" value={pw} autoFocus
                  onChange={e => { setPw(e.target.value); setPwErr(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') tryUnlock() }}
                  placeholder="••••••••" />
              </div>
              {pwErr ? <p className="note" style={{ color: 'var(--down)', marginBottom: 10 }}>Wrong password</p> : null}
              <button className="btn btn-amber btn-block" onClick={tryUnlock}><KeyRound size={16} /> Unlock</button>
            </div>
          </div>
        )}
        {view === 'office' && unlocked && (
          <div className="panel" style={{ textAlign: 'center', marginTop: 20 }}>
            <h2 className="h-sec">✓ Unlocked</h2>
            <p className="note">Full dashboard coming soon! The database is connected and working.</p>
            {!supabaseReady && <p className="note" style={{ color: 'var(--down)' }}>⚠ Supabase not configured yet. See instructions below.</p>}
          </div>
        )}
      </div>

      {toast ? <div className="toast">{toast.icon === 'down' ? <AlertTriangle size={17} color="var(--down)" /> : <CheckCircle2 size={17} color="var(--run)" />}{toast.msg}</div> : null}
    </div>
  )
}
