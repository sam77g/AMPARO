import React, { useEffect, useState, useCallback } from 'react'
import {
  Activity, Bell, ChevronDown, HeartPulse, LogOut, Pill,
  User, Users, LineChart as ChartIcon, Plus, Pencil, Trash2, Check, X, Link, Camera, Edit2,
} from 'lucide-react'
import { api } from './api'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function cls(...args) { return args.filter(Boolean).join(' ') }
function age(birth) {
  if (!birth) return '—'
  return Math.floor((Date.now() - new Date(birth)) / (365.25 * 24 * 3600 * 1000))
}
function todayStr() { return new Date().toISOString().slice(0, 10) }
function isToday(dateStr) { return dateStr && dateStr.slice(0, 10) === todayStr() }

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Card({ children, className, wide }) {
  return <div className={cls('card', wide && 'card--wide', className)}>{children}</div>
}
function Badge({ status }) {
  return <span className={cls('badge', status === 'Tomada' ? 'badge-done' : 'badge-pending')}>{status}</span>
}
function Spinner() { return <div className="spinner" /> }
function SectionTitle({ icon, title }) {
  return <div className="section-title">{icon}<h3>{title}</h3></div>
}

function MiniChart({ data, color = '#6366f1', label }) {
  if (!data || data.length < 2) return <p className="no-data">Dados insuficientes para gráfico</p>
  const nums = data.map((d) => parseFloat(d.value)).filter((v) => !isNaN(v))
  if (nums.length < 2) return <p className="no-data">Dados não numéricos</p>
  const min = Math.min(...nums), max = Math.max(...nums)
  const range = max - min || 1
  const W = 280, H = 80, pad = 8
  const pts = nums.slice(-20).map((v, i, arr) => {
    const x = pad + (i / (arr.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="chart-wrap">
      <div className="chart-label">{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mini-chart">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {nums.slice(-20).map((v, i, arr) => {
          const x = pad + (i / (arr.length - 1)) * (W - pad * 2)
          const y = H - pad - ((v - min) / range) * (H - pad * 2)
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />
        })}
      </svg>
    </div>
  )
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, dark, onToggle }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '', confirm: '', role: 'idoso', birth_date: '', medical_notes: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const data = await api.login(form.email, form.password)
      api.saveToken(data.token); onLogin(data.user)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('')
    if (form.password !== form.confirm) { setError('Senhas não conferem.'); setLoading(false); return }
    if (form.password.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); setLoading(false); return }
    try {
      await api.register({ name: form.name, email: form.email, password: form.password, role: form.role, birth_date: form.birth_date || undefined, medical_notes: form.medical_notes || undefined })
      setSuccess('Cadastro realizado! Faça login.')
      setTab('login')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="login-shell">
      <Card className="login-card">
        <div className="brand login-brand"><img src="/logo.png" alt="AMPARO" style={{height:"36px",width:"36px",objectFit:"contain"}} /><span>AMPARO</span></div>
        <div className="auth-tabs">
          <button type="button" className={cls('tab-btn', tab === 'login' && 'active')} onClick={() => { setTab('login'); setError('') }}>Entrar</button>
          <button type="button" className={cls('tab-btn', tab === 'register' && 'active')} onClick={() => { setTab('register'); setError('') }}>Cadastrar</button>
        </div>
        {success && <div className="auth-success">{success}</div>}
        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <input placeholder="E-mail" type="email" value={form.email} onChange={set('email')} required />
            <input placeholder="Senha" type="password" value={form.password} onChange={set('password')} required />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <input placeholder="Nome completo" value={form.name} onChange={set('name')} required />
            <input placeholder="E-mail" type="email" value={form.email} onChange={set('email')} required />
            <input placeholder="Senha (mín. 6 caracteres)" type="password" value={form.password} onChange={set('password')} required />
            <input placeholder="Confirmar senha" type="password" value={form.confirm} onChange={set('confirm')} required />
            <select value={form.role} onChange={set('role')}>
              <option value="idoso">Idoso</option>
              <option value="cuidador">Cuidador</option>
            </select>
            {form.role === 'idoso' && (
              <>
                <label className="field-label">Data de nascimento</label>
                <input type="date" value={form.birth_date} onChange={set('birth_date')} />
                <textarea placeholder="Observações médicas" value={form.medical_notes} onChange={set('medical_notes')} rows={3} />
              </>
            )}
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Cadastrando...' : 'Cadastrar'}</button>
          </form>
        )}
      </Card>
    </div>
  )
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function ProfileSection({ profile, extraInfo }) {
  const photoKey = `amparo_photo_${profile?.id}`
  const [photo, setPhoto] = useState(() => localStorage.getItem(photoKey) || profile?.photo_url || null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: profile?.name || '', medical_notes: profile?.medical_notes || '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = React.useRef()

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { localStorage.setItem(photoKey, ev.target.result); setPhoto(ev.target.result) }
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true)
    try {
      await api.updateProfile(form)
      setMsg('Perfil atualizado!'); setEditing(false)
    } catch { setMsg('Erro ao salvar.') }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (!profile) return null
  const roleLabel = profile.role === 'idoso' ? 'Idoso' : profile.role === 'cuidador' ? 'Cuidador' : 'Admin'

  return (
    <div className="profile-section">
      <div className="profile-header">
        <div className="profile-avatar-wrap" onClick={() => fileRef.current.click()} title="Clique para alterar foto">
          {photo
            ? <img className="profile-avatar" src={photo} alt="Foto" />
            : <div className="profile-avatar-placeholder"><User size={40} /></div>}
          <div className="profile-avatar-overlay"><Camera size={14} /> Alterar</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>
        <div className="profile-header-info">
          <h2 className="profile-name">{profile.name}</h2>
          <span className="profile-role-badge">{roleLabel}</span>
          <p className="profile-email">{profile.email}</p>
        </div>
      </div>

      <div className="profile-fields">
        <div className="profile-field">
          <span className="profile-field-label">Nome</span>
          {editing
            ? <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            : <span className="profile-field-value">{profile.name}</span>}
        </div>
        <div className="profile-field">
          <span className="profile-field-label">E-mail</span>
          <span className="profile-field-value">{profile.email}</span>
        </div>
        {profile.birth_date && (
          <div className="profile-field">
            <span className="profile-field-label">Idade</span>
            <span className="profile-field-value">{age(profile.birth_date)} anos</span>
          </div>
        )}
        {profile.caretaker && (
          <div className="profile-field">
            <span className="profile-field-label">Cuidador</span>
            <span className="profile-field-value">{profile.caretaker}</span>
          </div>
        )}
        {profile.allergies && (
          <div className="profile-field">
            <span className="profile-field-label">Alergias</span>
            <span className="profile-field-value">{profile.allergies}</span>
          </div>
        )}
        {profile.special_care && (
          <div className="profile-field">
            <span className="profile-field-label">Cuidados especiais</span>
            <span className="profile-field-value">{profile.special_care}</span>
          </div>
        )}
        {extraInfo}
        <div className="profile-field profile-field--full">
          <span className="profile-field-label">Obs. médicas</span>
          {editing
            ? <textarea rows={3} value={form.medical_notes} onChange={e => setForm(f => ({ ...f, medical_notes: e.target.value }))} />
            : <span className="profile-field-value">{profile.medical_notes || '—'}</span>}
        </div>
      </div>

      {msg && <div className="auth-success">{msg}</div>}

      <div className="profile-actions">
        {editing ? (
          <>
            <button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button className="ghost-btn" onClick={() => setEditing(false)}>Cancelar</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)}><Edit2 size={14} /> Editar perfil</button>
        )}
      </div>
    </div>
  )
}

// ─── BANNER DE ALERTA ─────────────────────────────────────────────────────────
function AlertBanner({ medications }) {
  const pending = medications.filter((m) => m.status !== 'Tomada')
  if (!pending.length) return null
  return (
    <div className="alert-banner">
      <Bell size={16} />
      <strong>⚠ Atenção:</strong> {pending.length} medicamento{pending.length > 1 ? 's' : ''} ainda não {pending.length > 1 ? 'foram tomados' : 'foi tomado'} hoje:&nbsp;
      {pending.map((m) => m.name).join(', ')}
    </div>
  )
}

// ─── PAINEL OPERACIONAL ───────────────────────────────────────────────────────
function PainelOperacional({ dashboard, patientId, onRefresh, userRole }) {
  const [medForm, setMedForm] = useState({ name: '', dose: '', time: '', frequency: '' })
  const [vitalForm, setVitalForm] = useState({ type: 'pressao', value: '' })
  const [editMed, setEditMed] = useState(null)
  const [loading, setLoading] = useState(false)
  const setMed = (k) => (e) => setMedForm((f) => ({ ...f, [k]: e.target.value }))
  const setVit = (k) => (e) => setVitalForm((f) => ({ ...f, [k]: e.target.value }))

  const medications = dashboard?.medications ?? []
  const vitals = dashboard?.vitals ?? []
  const vitalsToday = vitals.filter((v) => isToday(v.date))
  const vitalsOld = vitals.filter((v) => !isToday(v.date))

  useEffect(() => {
    if (!dashboard) return
    const key = `alerted_${patientId}_${todayStr()}`
    if (!sessionStorage.getItem(key)) {
      const pending = medications.filter((m) => m.status !== 'Tomada')
      if (pending.length) {
        setTimeout(() => {
          if (window.Notification?.permission === 'granted') {
            new Notification('AMPARO – Medicamentos pendentes', {
              body: `${pending.length} remédio(s) não tomado(s): ${pending.map(m => m.name).join(', ')}`,
            })
          }
        }, 800)
        sessionStorage.setItem(key, '1')
      }
    }
  }, [medications, patientId, dashboard])

  if (!dashboard) return <div className="page-center"><Spinner /></div>

  async function addMedication(e) {
    e.preventDefault(); setLoading(true)
    try { await api.addMedication({ ...medForm, patientId }); setMedForm({ name: '', dose: '', time: '', frequency: '' }); await onRefresh() }
    catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  async function saveEditMed(e) {
    e.preventDefault(); setLoading(true)
    try { await api.editMedication(editMed.id, { name: editMed.name, dose: editMed.dose, time: editMed.time, frequency: editMed.frequency }); setEditMed(null); await onRefresh() }
    catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  async function addVital(e) {
    e.preventDefault(); setLoading(true)
    try { await api.addVital({ ...vitalForm, patientId }); setVitalForm({ type: 'pressao', value: '' }); await onRefresh() }
    catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  async function toggle(id) {
    try { await api.toggleMedication(id); await onRefresh() } catch (err) { alert(err.message) }
  }

  const pesoData = [...vitals].filter((v) => v.type === 'peso').reverse()
  const pressaoData = [...vitals].filter((v) => v.type === 'pressao').map((v) => ({ ...v, value: v.value.includes('/') ? v.value.split('/')[0] : v.value })).reverse()
  const batData = [...vitals].filter((v) => v.type === 'batimento').reverse()

  return (
    <div className="painel">
      <AlertBanner medications={medications} />
      <div className="grid-two">
        <Card>
          <SectionTitle icon={<Pill size={18} />} title="Medicamentos" />
          <form className="form-grid" onSubmit={addMedication}>
            <input placeholder="Nome" value={medForm.name} onChange={setMed('name')} required />
            <input placeholder="Dose (ex: 50mg)" value={medForm.dose} onChange={setMed('dose')} required />
            <input placeholder="Horário (ex: 08:00)" value={medForm.time} onChange={setMed('time')} required />
            <input placeholder="Frequência (ex: 1x ao dia)" value={medForm.frequency} onChange={setMed('frequency')} required />
            <button type="submit" disabled={loading}><Plus size={14} /> Adicionar</button>
          </form>
          <div className="stack">
            {medications.map((m) => editMed?.id === m.id ? (
              <form key={m.id} className="list-row edit-row" onSubmit={saveEditMed}>
                <input value={editMed.name} onChange={(e) => setEditMed({ ...editMed, name: e.target.value })} />
                <input value={editMed.dose} onChange={(e) => setEditMed({ ...editMed, dose: e.target.value })} />
                <input value={editMed.time} onChange={(e) => setEditMed({ ...editMed, time: e.target.value })} />
                <input value={editMed.frequency} onChange={(e) => setEditMed({ ...editMed, frequency: e.target.value })} />
                <div className="row-actions">
                  <button type="submit" className="icon-btn success"><Check size={14} /></button>
                  <button type="button" className="icon-btn danger" onClick={() => setEditMed(null)}><X size={14} /></button>
                </div>
              </form>
            ) : (
              <div className="list-row" key={m.id}>
                <div>
                  <strong>{m.name}</strong>
                  <p>{m.dose} · {m.time} · {m.frequency}</p>
                </div>
                <div className="row-actions">
                  <Badge status={m.status} />
                  <button type="button" className="icon-btn" onClick={() => toggle(m.id)} title={m.status === 'Tomada' ? 'Marcar pendente' : 'Marcar tomada'}>
                    {m.status === 'Tomada' ? <X size={14} /> : <Check size={14} />}
                  </button>
                  <button type="button" className="icon-btn" onClick={() => setEditMed({ ...m })}><Pencil size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={<HeartPulse size={18} />} title="Sinais Vitais" />
          <form className="form-grid" onSubmit={addVital}>
            <select value={vitalForm.type} onChange={setVit('type')}>
              <option value="pressao">Pressão arterial</option>
              <option value="batimento">Batimento cardíaco</option>
              <option value="peso">Peso</option>
              <option value="glicemia">Glicemia</option>
            </select>
            <input placeholder={vitalForm.type === 'pressao' ? 'Ex: 12/8' : 'Valor'} value={vitalForm.value} onChange={setVit('value')} required />
            <button type="submit" disabled={loading}><Plus size={14} /> Registrar</button>
          </form>
          <div className="stack">
            {vitalsToday.length > 0 && (
              <>
                <div className="vitals-day-label today-label">Hoje — {new Date().toLocaleDateString('pt-BR')}</div>
                {vitalsToday.slice(0, 8).map((v) => (
                  <div className="list-row vital-today" key={v.id}>
                    <div>
                      <strong className="vital-type">{v.type}</strong>
                      <p>{v.value} · {new Date(v.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            {vitalsToday.length === 0 && <div className="alert-inline">Nenhum sinal vital registrado hoje.</div>}
            {vitalsOld.slice(0, 5).length > 0 && (
              <>
                <div className="vitals-day-label">Registros anteriores</div>
                {vitalsOld.slice(0, 5).map((v) => (
                  <div className="list-row" key={v.id}>
                    <div>
                      <strong className="vital-type">{v.type}</strong>
                      <p>{v.value} · {new Date(v.date).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon={<ChartIcon size={18} />} title="Gráficos" />
        <div className="charts-grid">
          <MiniChart data={pesoData} color="#10b981" label="Peso (kg)" />
          <MiniChart data={pressaoData} color="#f59e0b" label="Pressão (sistólica)" />
          <MiniChart data={batData} color="#ef4444" label="Batimento (bpm)" />
        </div>
      </Card>
    </div>
  )
}

// ─── ÁREA DO IDOSO ────────────────────────────────────────────────────────────
function IdosoArea({ user, onLogout, dark, onToggle }) {
  const [tab, setTab] = useState('painel')
  const [dashboard, setDashboard] = useState(null)
  const [profile, setProfile] = useState(null)
  const [patientId, setPatientId] = useState(null)

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([api.dashboard(), api.profile()])
      setDashboard(d); setProfile(p)
      if (d.patient) setPatientId(d.patient.id)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><img src="/logo.png" alt="AMPARO" style={{height:"36px",width:"36px",objectFit:"contain"}} /><span>AMPARO</span></div>
        <nav className="nav-tabs">
          <button className={cls('nav-btn', tab === 'perfil' && 'active')} onClick={() => setTab('perfil')}><User size={16} /> Perfil</button>
          <button className={cls('nav-btn', tab === 'painel' && 'active')} onClick={() => setTab('painel')}><Activity size={16} /> Painel</button>
        </nav>
        <div className="top-actions">
          <span className="role-pill">IDOSO</span>
          <ThemeToggle dark={dark} onToggle={onToggle} />
          <button className="ghost-btn" onClick={onLogout}><LogOut size={16} /> Sair</button>
        </div>
      </header>
      <main className="container">
        {tab === 'perfil' && (
          <Card wide>
            <ProfileSection profile={profile} />
          </Card>
        )}
        {tab === 'painel' && (
          <PainelOperacional dashboard={dashboard} patientId={patientId} onRefresh={load} userRole="idoso" />
        )}
      </main>
    </div>
  )
}

// ─── ÁREA DO CUIDADOR ─────────────────────────────────────────────────────────
function CuidadorArea({ user, onLogout, dark, onToggle }) {
  const [tab, setTab] = useState('painel')
  const [patients, setPatients] = useState([])
  const [focusPatient, setFocusPatient] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [profile, setProfile] = useState(null)
  const [linkForm, setLinkForm] = useState({ name: '', email: '' })
  const [editPatient, setEditPatient] = useState(null)
  const [linkError, setLinkError] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)

  const loadPatients = useCallback(async () => {
    try {
      const [pts, prof] = await Promise.all([api.patients(), api.profile()])
      setPatients(pts); setProfile(prof)
      if (!focusPatient && pts.length) setFocusPatient(pts[0])
    } catch (e) { console.error(e) }
  }, [focusPatient])

  const loadDashboard = useCallback(async (pid) => {
    if (!pid) return
    try { const d = await api.dashboard(pid); setDashboard(d) } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadPatients() }, [])
  useEffect(() => { if (focusPatient) loadDashboard(focusPatient.id) }, [focusPatient])

  async function link(e) {
    e.preventDefault(); setLinkLoading(true); setLinkError('')
    try { await api.linkPatient(linkForm); setLinkForm({ name: '', email: '' }); await loadPatients() }
    catch (err) { setLinkError(err.message) } finally { setLinkLoading(false) }
  }

  async function savePatient(e) {
    e.preventDefault()
    try { await api.editPatient(editPatient.id, editPatient); setEditPatient(null); await loadPatients() }
    catch (err) { alert(err.message) }
  }

  async function unlink(id) {
    if (!confirm('Desvincular este idoso?')) return
    try { await api.unlinkPatient(id); await loadPatients() } catch (err) { alert(err.message) }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><img src="/logo.png" alt="AMPARO" style={{height:"36px",width:"36px",objectFit:"contain"}} /><span>AMPARO</span></div>
        <nav className="nav-tabs">
          <button className={cls('nav-btn', tab === 'perfil' && 'active')} onClick={() => setTab('perfil')}><User size={16} /> Perfil</button>
          <button className={cls('nav-btn', tab === 'painel' && 'active')} onClick={() => setTab('painel')}><Activity size={16} /> Painel</button>
          <button className={cls('nav-btn', tab === 'pacientes' && 'active')} onClick={() => setTab('pacientes')}><Users size={16} /> Pacientes</button>
        </nav>
        <div className="top-actions">
          {focusPatient && tab === 'painel' && (
            <div className="focus-selector">
              <select value={focusPatient.id} onChange={(e) => setFocusPatient(patients.find((p) => p.id === Number(e.target.value)))}>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <span className="role-pill">CUIDADOR</span>
          <ThemeToggle dark={dark} onToggle={onToggle} />
          <button className="ghost-btn" onClick={onLogout}><LogOut size={16} /> Sair</button>
        </div>
      </header>
      <main className="container">
        {tab === 'perfil' && (
          <Card wide>
            <ProfileSection
              profile={profile}
              extraInfo={focusPatient && (
                <div className="profile-field">
                  <span className="profile-field-label">Idoso em foco</span>
                  <span className="profile-field-value">{focusPatient.name}</span>
                </div>
              )}
            />
          </Card>
        )}

        {tab === 'painel' && (
          !focusPatient
            ? <Card><p className="no-data">Nenhum idoso vinculado. Acesse "Pacientes" para vincular.</p></Card>
            : <PainelOperacional dashboard={dashboard} patientId={focusPatient?.id} onRefresh={() => loadDashboard(focusPatient.id)} userRole="cuidador" />
        )}

        {tab === 'pacientes' && (
          <div className="painel">
            <Card>
              <SectionTitle icon={<Link size={18} />} title="Vincular Idoso" />
              <form className="form-grid" onSubmit={link}>
                <input placeholder="Nome do idoso" value={linkForm.name} onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })} required />
                <input placeholder="E-mail do idoso" type="email" value={linkForm.email} onChange={(e) => setLinkForm({ ...linkForm, email: e.target.value })} required />
                {linkError && <div className="auth-error">{linkError}</div>}
                <button type="submit" disabled={linkLoading}>{linkLoading ? 'Vinculando...' : 'Vincular'}</button>
              </form>
            </Card>
            <Card>
              <SectionTitle icon={<Users size={18} />} title="Meus Pacientes" />
              {patients.map((p) => editPatient?.id === p.id ? (
                <form key={p.id} className="patient-form" onSubmit={savePatient}>
                  <div className="patient-readonly"><strong>{p.name}</strong> · {p.age} anos</div>
                  <div className="form-grid">
                    <textarea placeholder="Observações" value={editPatient.notes || ''} onChange={(e) => setEditPatient({ ...editPatient, notes: e.target.value })} rows={2} />
                    <input placeholder="Alergias" value={editPatient.allergies || ''} onChange={(e) => setEditPatient({ ...editPatient, allergies: e.target.value })} />
                    <input placeholder="Cuidados especiais" value={editPatient.special_care || ''} onChange={(e) => setEditPatient({ ...editPatient, special_care: e.target.value })} />
                    <input placeholder="Doenças" value={editPatient.diseases || ''} onChange={(e) => setEditPatient({ ...editPatient, diseases: e.target.value })} />
                    <input placeholder="Altura (m)" type="number" step="0.01" value={editPatient.height || ''} onChange={(e) => setEditPatient({ ...editPatient, height: e.target.value })} />
                    <input placeholder="Peso (kg)" type="number" step="0.1" value={editPatient.weight || ''} onChange={(e) => setEditPatient({ ...editPatient, weight: e.target.value })} />
                  </div>
                  <div className="row-actions">
                    <button type="submit" className="icon-btn success"><Check size={14} /> Salvar</button>
                    <button type="button" className="icon-btn danger" onClick={() => setEditPatient(null)}><X size={14} /> Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="patient-card" key={p.id}>
                  <div className="patient-info">
                    <strong>{p.name}</strong>
                    <p>Idade: {p.age} · Altura: {p.height || '—'}m · Peso: {p.weight || '—'}kg</p>
                    <p>Alergias: {p.allergies || '—'}</p>
                    <p>Doenças: {p.diseases || '—'}</p>
                    <p>Cuidados especiais: {p.special_care || '—'}</p>
                    {p.notes && <p>Obs: {p.notes}</p>}
                  </div>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => { setFocusPatient(p); setTab('painel') }} title="Ver painel"><Activity size={14} /></button>
                    <button className="icon-btn" onClick={() => setEditPatient({ ...p })}><Pencil size={14} /></button>
                    <button className="icon-btn danger" onClick={() => unlink(p.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {!patients.length && <p className="no-data">Nenhum idoso vinculado.</p>}
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── ÁREA ADMIN ───────────────────────────────────────────────────────────────
function AdminArea({ user, onLogout, dark, onToggle }) {
  const [tab, setTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'cuidador' })
  const [editUser, setEditUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const setUF = (k) => (e) => setUserForm((f) => ({ ...f, [k]: e.target.value }))

  const loadUsers = useCallback(async () => {
    try { const [u, s] = await Promise.all([api.users(), api.stats()]); setUsers(u); setStats(s) }
    catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function addUser(e) {
    e.preventDefault()
    try { await api.addUser(userForm); setUserForm({ name: '', email: '', password: '', role: 'cuidador' }); setShowForm(false); await loadUsers() }
    catch (err) { alert(err.message) }
  }

  async function saveEdit(e) {
    e.preventDefault()
    try { await api.editUser(editUser.id, { name: editUser.name, email: editUser.email, role: editUser.role }); setEditUser(null); await loadUsers() }
    catch (err) { alert(err.message) }
  }

  async function deleteUser(id) {
    if (!confirm('Excluir usuário?')) return
    try { await api.deleteUser(id); await loadUsers() } catch (err) { alert(err.message) }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><img src="/logo.png" alt="AMPARO" style={{height:"36px",width:"36px",objectFit:"contain"}} /><span>AMPARO</span></div>
        <nav className="nav-tabs">
          <button className={cls('nav-btn', tab === 'dashboard' && 'active')} onClick={() => setTab('dashboard')}><Activity size={16} /> Dashboard</button>
          <button className={cls('nav-btn', tab === 'usuarios' && 'active')} onClick={() => setTab('usuarios')}><Users size={16} /> Usuários</button>
        </nav>
        <div className="top-actions">
          <span className="role-pill">ADMIN</span>
          <ThemeToggle dark={dark} onToggle={onToggle} />
          <button className="ghost-btn" onClick={onLogout}><LogOut size={16} /> Sair</button>
        </div>
      </header>
      <main className="container">
        {tab === 'dashboard' && stats && (
          <div className="painel">
            <div className="stats-grid-3">
              <div className="stat-card"><div className="stat-num">{stats.totalUsers}</div><div className="stat-lbl">Total de usuários</div></div>
              <div className="stat-card"><div className="stat-num">{stats.totalIdosos}</div><div className="stat-lbl">Idosos</div></div>
              <div className="stat-card"><div className="stat-num">{stats.totalCuidadores}</div><div className="stat-lbl">Cuidadores</div></div>
              <div className="stat-card"><div className="stat-num">{stats.totalAdmins}</div><div className="stat-lbl">Admins</div></div>
              <div className="stat-card"><div className="stat-num">{stats.totalMedications}</div><div className="stat-lbl">Medicamentos cadastrados</div></div>
              <div className="stat-card"><div className="stat-num">{stats.totalVitals}</div><div className="stat-lbl">Registros de sinais vitais</div></div>
            </div>
            <Card>
              <SectionTitle icon={<ChartIcon size={18} />} title="Distribuição de Usuários" />
              <div className="admin-bar-chart">
                {[
                  { label: 'Idosos', value: stats.totalIdosos, color: '#6366f1' },
                  { label: 'Cuidadores', value: stats.totalCuidadores, color: '#10b981' },
                  { label: 'Admins', value: stats.totalAdmins, color: '#f59e0b' },
                ].map((item) => (
                  <div key={item.label} className="bar-row">
                    <span className="bar-label">{item.label}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${stats.totalUsers ? (item.value / stats.totalUsers) * 100 : 0}%`, background: item.color }} />
                    </div>
                    <span className="bar-val">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
        {tab === 'usuarios' && (
          <div className="painel">
            <Card>
              <SectionTitle icon={<Users size={18} />} title="Gerenciamento de Usuários" />
              <button className="secondary-btn" onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Fechar' : <><Plus size={14} /> Novo Usuário</>}
              </button>
              {showForm && (
                <form className="form-grid" onSubmit={addUser}>
                  <input placeholder="Nome" value={userForm.name} onChange={setUF('name')} required />
                  <input placeholder="E-mail" type="email" value={userForm.email} onChange={setUF('email')} required />
                  <input placeholder="Senha" type="password" value={userForm.password} onChange={setUF('password')} required />
                  <select value={userForm.role} onChange={setUF('role')}>
                    <option value="cuidador">Cuidador</option>
                    <option value="idoso">Idoso</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit">Criar</button>
                </form>
              )}
              <div className="user-table">
                <div className="user-row header">
                  <span>ID</span><span>Nome</span><span>E-mail</span><span>Tipo</span><span>Ações</span>
                </div>
                {users.map((u) => editUser?.id === u.id ? (
                  <form key={u.id} className="user-row edit" onSubmit={saveEdit}>
                    <span>{u.id}</span>
                    <input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                    <input value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                    <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                      <option value="cuidador">Cuidador</option>
                      <option value="idoso">Idoso</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="row-actions">
                      <button type="submit" className="icon-btn success"><Check size={14} /></button>
                      <button type="button" className="icon-btn danger" onClick={() => setEditUser(null)}><X size={14} /></button>
                    </div>
                  </form>
                ) : (
                  <div key={u.id} className="user-row">
                    <span>{u.id}</span><span>{u.name}</span><span>{u.email}</span>
                    <span className={cls('role-tag', u.role)}>{u.role}</span>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setEditUser({ ...u })}><Pencil size={14} /></button>
                      <button className="icon-btn danger" onClick={() => deleteUser(u.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} title="Alternar tema">
      {dark ? '☀️ Claro' : '🌙 Escuro'}
    </button>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme') === 'dark'
    document.documentElement.classList.toggle('dark', saved)
    return saved
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark, user])

  useEffect(() => {
    async function boot() {
      const token = localStorage.getItem('auth_token')
      if (!token) { setBooting(false); return }
      try { const me = await api.me(); setUser(me.user) }
      catch { api.clearToken() }
      finally { setBooting(false) }
    }
    boot()
  }, [])

  function handleLogin(u) { setUser(u) }
  function handleLogout() {
    api.clearToken(); setUser(null)
    document.documentElement.classList.toggle('dark', dark)
  }
  const toggle = () => setDark((v) => !v)

  if (booting) return <div className="page-center"><Spinner /></div>
  if (!user) return <AuthScreen onLogin={handleLogin} dark={dark} onToggle={toggle} />
  if (user.role === 'admin') return <AdminArea user={user} onLogout={handleLogout} dark={dark} onToggle={toggle} />
  if (user.role === 'cuidador') return <CuidadorArea user={user} onLogout={handleLogout} dark={dark} onToggle={toggle} />
  return <IdosoArea user={user} onLogout={handleLogout} dark={dark} onToggle={toggle} />
}
