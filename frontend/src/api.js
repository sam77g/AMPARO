const API_URL = 'https://disengage-dribble-guise.ngrok-free.dev/api'

function getToken() { return localStorage.getItem('auth_token') }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Erro na requisição')
  }
  return response.json()
}


export const api = {
  health: () => request('/health'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  profile: () => request('/profile'),
  dashboard: (patientId) => patientId ? request(`/dashboard/${patientId}`) : request('/dashboard'),
  medications: () => request('/medications'),
  addMedication: (data) => request('/medications', { method: 'POST', body: JSON.stringify(data) }),
  editMedication: (id, data) => request(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleMedication: (id) => request(`/medications/${id}/toggle`, { method: 'PATCH' }),
  vitals: () => request('/vitals'),
  addVital: (data) => request('/vitals', { method: 'POST', body: JSON.stringify(data) }),
  alerts: () => request('/alerts'),
  patients: () => request('/patients'),
  linkPatient: (data) => request('/patients/link', { method: 'POST', body: JSON.stringify(data) }),
  editPatient: (id, data) => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  unlinkPatient: (id) => request(`/patients/${id}/unlink`, { method: 'DELETE' }),
  users: () => request('/users'),
  addUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  editUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  stats: () => request('/stats'),
  updateProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  clearToken: () => localStorage.removeItem('auth_token'),
  saveToken: (t) => localStorage.setItem('auth_token', t),
}
