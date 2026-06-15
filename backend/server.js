import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saude_idoso',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

async function testDbConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ MySQL conectado com sucesso.');
  } catch (err) {
    console.error('❌ ERRO ao conectar no MySQL:', err.message);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('❌ SQL:', err.message, sql, params);
    throw err;
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: 'Acesso negado para este perfil.' });
    next();
  };
}

async function getAccessiblePatientIds(user) {
  if (user.role === 'admin') {
    const rows = await query('SELECT id FROM patients');
    return rows.map((r) => r.id);
  }
  if (user.role === 'cuidador') {
    const rows = await query('SELECT patient_id AS id FROM user_patient_access WHERE user_id = ?', [user.id]);
    return rows.map((r) => r.id);
  }
  const rows = await query('SELECT id FROM patients WHERE user_id = ? LIMIT 1', [user.id]);
  return rows.map((r) => r.id);
}

// ─── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Informe email e senha.' });

    const rows = await query('SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Credenciais inválidas.' });

    res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao autenticar.', detail: e.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, birth_date, medical_notes } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role.' });
    if (!['idoso', 'cuidador'].includes(role))
      return res.status(400).json({ error: 'Tipo de conta inválido.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });

    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) return res.status(409).json({ error: 'E-mail já cadastrado.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, password_hash, role, birth_date, medical_notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, birth_date || null, medical_notes || null]
    );

    // Se for idoso, criar registro em patients
    if (role === 'idoso') {
      let age = 0;
      if (birth_date) {
        const diff = Date.now() - new Date(birth_date).getTime();
        age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
      }
      await query(
        'INSERT INTO patients (user_id, name, age, responsible, notes) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, name, age, name, medical_notes || '']
      );
    }

    res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao cadastrar.', detail: e.message });
  }
});

app.get('/api/auth/me', authRequired, (req, res) => res.json({ user: req.user }));

// ─── PROFILE ──────────────────────────────────────────────────────────────────
app.get('/api/profile', authRequired, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, email, role, birth_date, medical_notes, photo_url, allergies, special_care FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const user = rows[0];

    // Se idoso, busca paciente vinculado para pegar cuidador
    let caretaker = null;
    if (user.role === 'idoso') {
      const patRows = await query('SELECT id FROM patients WHERE user_id = ? LIMIT 1', [user.id]);
      if (patRows.length) {
        const careRows = await query(
          'SELECT u.name FROM users u JOIN user_patient_access upa ON upa.user_id = u.id WHERE upa.patient_id = ? AND u.role = "cuidador" LIMIT 1',
          [patRows[0].id]
        );
        caretaker = careRows[0]?.name || null;
      }
    }

    res.json({ ...user, caretaker });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar perfil.', detail: e.message });
  }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
app.get('/api/dashboard', authRequired, async (req, res) => {
  try {
    const patientIds = await getAccessiblePatientIds(req.user);
    if (!patientIds.length) {
      return res.json({ patient: null, medications: [], vitals: [], alerts: [], summary: { totalMedications: 0, pendingMedications: 0, lastPressure: '-', lastHeartbeat: '-', lastWeight: '-', lastGlicemia: '-' } });
    }

    const patientRows = await query(
      `SELECT id, name, age, responsible, notes FROM patients WHERE id IN (${patientIds.map(() => '?').join(',')}) ORDER BY id ASC LIMIT 1`,
      patientIds
    );
    const patient = patientRows[0];

    const medications = await query(
      "SELECT id, name, dose, TIME_FORMAT(time_schedule, '%H:%i') AS time, frequency, status FROM medications WHERE patient_id = ? ORDER BY time_schedule ASC",
      [patient.id]
    );
    const vitals = await query(
      'SELECT id, type, value, measured_at AS date FROM vitals WHERE patient_id = ? ORDER BY measured_at DESC',
      [patient.id]
    );
    const alerts = await query(
      'SELECT id, message, level, is_read FROM alerts WHERE patient_id = ? ORDER BY created_at DESC',
      [patient.id]
    );

    res.json({
      patient, medications, vitals, alerts,
      summary: {
        totalMedications: medications.length,
        pendingMedications: medications.filter((m) => m.status !== 'Tomada').length,
        lastPressure: vitals.find((v) => v.type === 'pressao')?.value ?? '-',
        lastHeartbeat: vitals.find((v) => v.type === 'batimento')?.value ?? '-',
        lastWeight: vitals.find((v) => v.type === 'peso')?.value ?? '-',
        lastGlicemia: vitals.find((v) => v.type === 'glicemia')?.value ?? '-',
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao carregar dashboard.', detail: e.message });
  }
});

// Dashboard para cuidador com idoso em foco específico
app.get('/api/dashboard/:patientId', authRequired, async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    if (req.user.role !== 'admin') {
      const ids = await getAccessiblePatientIds(req.user);
      if (!ids.includes(patientId)) return res.status(403).json({ error: 'Acesso negado.' });
    }

    const patientRows = await query('SELECT id, name, age, responsible, notes FROM patients WHERE id = ? LIMIT 1', [patientId]);
    if (!patientRows.length) return res.status(404).json({ error: 'Paciente não encontrado.' });
    const patient = patientRows[0];

    const medications = await query(
      "SELECT id, name, dose, TIME_FORMAT(time_schedule, '%H:%i') AS time, frequency, status FROM medications WHERE patient_id = ? ORDER BY time_schedule ASC",
      [patientId]
    );
    const vitals = await query(
      'SELECT id, type, value, measured_at AS date FROM vitals WHERE patient_id = ? ORDER BY measured_at DESC',
      [patientId]
    );
    const alerts = await query(
      'SELECT id, message, level, is_read FROM alerts WHERE patient_id = ? ORDER BY created_at DESC',
      [patientId]
    );

    res.json({
      patient, medications, vitals, alerts,
      summary: {
        totalMedications: medications.length,
        pendingMedications: medications.filter((m) => m.status !== 'Tomada').length,
        lastPressure: vitals.find((v) => v.type === 'pressao')?.value ?? '-',
        lastHeartbeat: vitals.find((v) => v.type === 'batimento')?.value ?? '-',
        lastWeight: vitals.find((v) => v.type === 'peso')?.value ?? '-',
        lastGlicemia: vitals.find((v) => v.type === 'glicemia')?.value ?? '-',
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao carregar dashboard.', detail: e.message });
  }
});

// ─── MEDICATIONS ──────────────────────────────────────────────────────────────
app.get('/api/medications', authRequired, async (req, res) => {
  try {
    const patientIds = await getAccessiblePatientIds(req.user);
    if (!patientIds.length) return res.json([]);
    const rows = await query(
      `SELECT id, name, dose, TIME_FORMAT(time_schedule, '%H:%i') AS time, frequency, status FROM medications WHERE patient_id IN (${patientIds.map(() => '?').join(',')}) ORDER BY time_schedule ASC`,
      patientIds
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar medicamentos.', detail: e.message });
  }
});

app.post('/api/medications', authRequired, async (req, res) => {
  try {
    const { patientId, name, dose, time, frequency } = req.body;
    if (!patientId || !name || !dose || !time || !frequency)
      return res.status(400).json({ error: 'Campos obrigatórios: patientId, name, dose, time, frequency.' });

    if (req.user.role !== 'admin') {
      const ids = await getAccessiblePatientIds(req.user);
      if (!ids.includes(Number(patientId))) return res.status(403).json({ error: 'Acesso negado.' });
    }

    const result = await query(
      "INSERT INTO medications (patient_id, name, dose, time_schedule, frequency, status) VALUES (?, ?, ?, ?, ?, 'Pendente')",
      [patientId, name, dose, `${time}:00`, frequency]
    );
    // Notificação ao idoso quando cuidador adiciona medicamento
    if (req.user.role === 'cuidador') {
      await query("INSERT INTO alerts (patient_id, message, level) VALUES (?, ?, 'info')", [patientId, `Cuidador cadastrou novo medicamento: ${name}.`]);
    }
    res.status(201).json({ id: result.insertId, patient_id: patientId, name, dose, time, frequency, status: 'Pendente' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao cadastrar medicamento.', detail: e.message });
  }
});

app.put('/api/medications/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, dose, time, frequency } = req.body;
    const rows = await query('SELECT id, patient_id FROM medications WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Medicamento não encontrado.' });

    if (req.user.role !== 'admin') {
      const ids = await getAccessiblePatientIds(req.user);
      if (!ids.includes(Number(rows[0].patient_id))) return res.status(403).json({ error: 'Acesso negado.' });
    }

    await query('UPDATE medications SET name=?, dose=?, time_schedule=?, frequency=? WHERE id=?', [name, dose, `${time}:00`, frequency, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao editar medicamento.', detail: e.message });
  }
});

app.patch('/api/medications/:id/toggle', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query('SELECT id, patient_id, status FROM medications WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Medicamento não encontrado.' });

    if (req.user.role !== 'admin') {
      const ids = await getAccessiblePatientIds(req.user);
      if (!ids.includes(Number(rows[0].patient_id))) return res.status(403).json({ error: 'Acesso negado.' });
    }

    const newStatus = rows[0].status === 'Tomada' ? 'Pendente' : 'Tomada';
    await query('UPDATE medications SET status = ? WHERE id = ?', [newStatus, id]);
    const [updated] = await query("SELECT id, patient_id, name, dose, TIME_FORMAT(time_schedule, '%H:%i') AS time, frequency, status FROM medications WHERE id = ?", [id]);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar.', detail: e.message });
  }
});

// ─── VITALS ───────────────────────────────────────────────────────────────────
app.get('/api/vitals', authRequired, async (req, res) => {
  try {
    const patientIds = await getAccessiblePatientIds(req.user);
    if (!patientIds.length) return res.json([]);
    const rows = await query(
      `SELECT id, type, value, measured_at AS date FROM vitals WHERE patient_id IN (${patientIds.map(() => '?').join(',')}) ORDER BY measured_at DESC`,
      patientIds
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar sinais vitais.', detail: e.message });
  }
});

app.post('/api/vitals', authRequired, async (req, res) => {
  try {
    const { patientId, type, value } = req.body;
    if (!patientId || !type || !value)
      return res.status(400).json({ error: 'Campos obrigatórios: patientId, type, value.' });

    const validTypes = ['pressao', 'batimento', 'peso', 'glicemia'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Tipo inválido.' });

    if (req.user.role !== 'admin') {
      const ids = await getAccessiblePatientIds(req.user);
      if (!ids.includes(Number(patientId))) return res.status(403).json({ error: 'Acesso negado.' });
    }

    const result = await query('INSERT INTO vitals (patient_id, type, value, measured_at) VALUES (?, ?, ?, NOW())', [patientId, type, value]);
    const [row] = await query('SELECT id, type, value, measured_at AS date FROM vitals WHERE id = ?', [result.insertId]);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao cadastrar sinal vital.', detail: e.message });
  }
});

// ─── PATIENTS ─────────────────────────────────────────────────────────────────
app.get('/api/patients', authRequired, allowRoles('admin', 'cuidador'), async (req, res) => {
  try {
    const patientIds = await getAccessiblePatientIds(req.user);
    if (!patientIds.length) return res.json([]);
    const rows = await query(
      `SELECT id, name, age, responsible, notes, allergies, special_care, diseases, height, weight FROM patients WHERE id IN (${patientIds.map(() => '?').join(',')}) ORDER BY name ASC`,
      patientIds
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar pacientes.', detail: e.message });
  }
});

app.post('/api/patients/link', authRequired, allowRoles('admin', 'cuidador'), async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Informe nome e email do idoso.' });

    const userRows = await query('SELECT id FROM users WHERE email = ? AND role = "idoso" LIMIT 1', [email]);
    if (!userRows.length) return res.status(404).json({ error: 'Idoso não encontrado. Verifique o cadastro.' });

    const patRows = await query('SELECT id FROM patients WHERE user_id = ? LIMIT 1', [userRows[0].id]);
    if (!patRows.length) return res.status(404).json({ error: 'Perfil de paciente não encontrado para este idoso.' });

    const patientId = patRows[0].id;
    await query(
      'INSERT IGNORE INTO user_patient_access (user_id, patient_id) VALUES (?, ?)',
      [req.user.id, patientId]
    );
    res.json({ ok: true, patient_id: patientId });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao vincular idoso.', detail: e.message });
  }
});

app.put('/api/patients/:id', authRequired, allowRoles('admin', 'cuidador'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (req.user.role !== 'admin') {
      const ids = await getAccessiblePatientIds(req.user);
      if (!ids.includes(id)) return res.status(403).json({ error: 'Acesso negado.' });
    }
    // Não permite alterar nome, idade nem email (campos readonly)
    const { notes, allergies, special_care, diseases, height, weight } = req.body;
    await query(
      'UPDATE patients SET notes=?, allergies=?, special_care=?, diseases=?, height=?, weight=? WHERE id=?',
      [notes, allergies, special_care, diseases, height, weight, id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao editar paciente.', detail: e.message });
  }
});

app.delete('/api/patients/:id/unlink', authRequired, allowRoles('cuidador'), async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    await query('DELETE FROM user_patient_access WHERE user_id = ? AND patient_id = ?', [req.user.id, patientId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao desvincular.', detail: e.message });
  }
});

// ─── USERS (ADMIN) ────────────────────────────────────────────────────────────
app.get('/api/users', authRequired, allowRoles('admin'), async (_req, res) => {
  try {
    const rows = await query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar usuários.', detail: e.message });
  }
});

app.post('/api/users', authRequired, allowRoles('admin'), async (req, res) => {
  try {
    const { name, email, password, role = 'cuidador' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Campos obrigatórios: name, email, password.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, passwordHash, role]);
    res.status(201).json({ id: result.insertId, name, email, role });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao cadastrar usuário.', detail: e.message });
  }
});

app.put('/api/users/:id', authRequired, allowRoles('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, role } = req.body;
    await query('UPDATE users SET name=?, email=?, role=? WHERE id=?', [name, email, role, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao editar usuário.', detail: e.message });
  }
});

app.delete('/api/users/:id', authRequired, allowRoles('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário.' });
    await query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir usuário.', detail: e.message });
  }
});

// ─── ADMIN STATS ──────────────────────────────────────────────────────────────
app.get('/api/stats', authRequired, allowRoles('admin'), async (_req, res) => {
  try {
    const [total] = await query('SELECT COUNT(*) AS total FROM users');
    const [idosos] = await query("SELECT COUNT(*) AS total FROM users WHERE role = 'idoso'");
    const [cuidadores] = await query("SELECT COUNT(*) AS total FROM users WHERE role = 'cuidador'");
    const [admins] = await query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
    const [meds] = await query('SELECT COUNT(*) AS total FROM medications');
    const [vitals] = await query('SELECT COUNT(*) AS total FROM vitals');
    res.json({
      totalUsers: total.total,
      totalIdosos: idosos.total,
      totalCuidadores: cuidadores.total,
      totalAdmins: admins.total,
      totalMedications: meds.total,
      totalVitals: vitals.total,
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas.', detail: e.message });
  }
});

// ─── ALERTS ───────────────────────────────────────────────────────────────────
app.get('/api/alerts', authRequired, async (req, res) => {
  try {
    const patientIds = await getAccessiblePatientIds(req.user);
    if (!patientIds.length) return res.json([]);
    const rows = await query(
      `SELECT id, message, level, is_read FROM alerts WHERE patient_id IN (${patientIds.map(() => '?').join(',')}) ORDER BY created_at DESC`,
      patientIds
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar alertas.', detail: e.message });
  }
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌', err.message);
  res.status(500).json({ error: 'Erro interno.', detail: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 API rodando em http://0.0.0.0:${PORT}`);
  await testDbConnection();
});
