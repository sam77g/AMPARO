CREATE DATABASE IF NOT EXISTS saude_idoso
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE saude_idoso;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('idoso', 'cuidador', 'admin') NOT NULL DEFAULT 'cuidador',
  birth_date DATE NULL,
  medical_notes TEXT NULL,
  photo_url VARCHAR(255) NULL,
  allergies TEXT NULL,
  special_care TEXT NULL,
  diseases TEXT NULL,
  height DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(120) NOT NULL,
  age INT NOT NULL,
  responsible VARCHAR(120) NOT NULL,
  notes TEXT NULL,
  allergies TEXT NULL,
  special_care TEXT NULL,
  diseases TEXT NULL,
  height DECIMAL(5,2) NULL,
  weight DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_patients_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  dose VARCHAR(60) NOT NULL,
  time_schedule TIME NOT NULL,
  frequency VARCHAR(60) NOT NULL,
  status ENUM('Tomada', 'Pendente') NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medications_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  type ENUM('pressao', 'batimento', 'peso', 'glicemia') NOT NULL,
  value VARCHAR(60) NOT NULL,
  measured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vitals_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  message VARCHAR(255) NOT NULL,
  level ENUM('info', 'warning', 'danger') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alerts_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_patient_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  patient_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_patient (user_id, patient_id),
  CONSTRAINT fk_upa_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_upa_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Senhas: admin@saude.com → admin123 | ana@saude.com → cuidador123
INSERT INTO users (name, email, password_hash, role)
VALUES
  ('Administrador', 'admin@saude.com', '$2b$10$9ryWNgminOkfgq43JO.CLeKXnCVQamtFJ7K1YLEUN9uwXEXiRF58G', 'admin'),
  ('Ana Silva', 'ana@saude.com', '$2b$10$YN//BkomSR0wnEt8/UgdmO7pQsJUVsExbIu8nbeE/LTdBYCDfONlC', 'cuidador')
ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role);

INSERT INTO patients (user_id, name, age, responsible, notes, allergies, special_care, diseases, height, weight)
SELECT u.id, 'Dona Maria', 72, 'Ana Silva', 'Paciente com acompanhamento diário.', 'Dipirona', 'Locomoção reduzida', 'Hipertensão, Diabetes', 1.62, 71.2
FROM users u
WHERE u.email = 'ana@saude.com'
  AND NOT EXISTS (SELECT 1 FROM patients WHERE name = 'Dona Maria');

INSERT INTO user_patient_access (user_id, patient_id)
SELECT u.id, p.id
FROM users u JOIN patients p ON p.name = 'Dona Maria'
WHERE u.email IN ('admin@saude.com', 'ana@saude.com')
  AND NOT EXISTS (SELECT 1 FROM user_patient_access upa WHERE upa.user_id = u.id AND upa.patient_id = p.id);

INSERT INTO medications (patient_id, name, dose, time_schedule, frequency, status)
SELECT p.id, 'Losartana', '50 mg', '08:00:00', '1x ao dia', 'Tomada' FROM patients p WHERE p.name = 'Dona Maria'
  AND NOT EXISTS (SELECT 1 FROM medications m WHERE m.patient_id = p.id AND m.name = 'Losartana');

INSERT INTO medications (patient_id, name, dose, time_schedule, frequency, status)
SELECT p.id, 'Metformina', '850 mg', '12:00:00', '1x ao dia', 'Pendente' FROM patients p WHERE p.name = 'Dona Maria'
  AND NOT EXISTS (SELECT 1 FROM medications m WHERE m.patient_id = p.id AND m.name = 'Metformina');

INSERT INTO vitals (patient_id, type, value, measured_at)
SELECT p.id, 'pressao', '12/8', '2026-05-21 08:00:00' FROM patients p WHERE p.name = 'Dona Maria'
  AND NOT EXISTS (SELECT 1 FROM vitals v WHERE v.patient_id = p.id AND v.type = 'pressao');

INSERT INTO vitals (patient_id, type, value, measured_at)
SELECT p.id, 'batimento', '74', '2026-05-21 08:05:00' FROM patients p WHERE p.name = 'Dona Maria'
  AND NOT EXISTS (SELECT 1 FROM vitals v WHERE v.patient_id = p.id AND v.type = 'batimento');

INSERT INTO vitals (patient_id, type, value, measured_at)
SELECT p.id, 'peso', '71.2', '2026-05-21 08:10:00' FROM patients p WHERE p.name = 'Dona Maria'
  AND NOT EXISTS (SELECT 1 FROM vitals v WHERE v.patient_id = p.id AND v.type = 'peso');

INSERT INTO alerts (patient_id, message, level)
SELECT p.id, 'Horário da Metformina em 25 minutos.', 'warning' FROM patients p WHERE p.name = 'Dona Maria'
  AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.patient_id = p.id AND a.message = 'Horário da Metformina em 25 minutos.');
