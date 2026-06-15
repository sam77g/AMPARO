# AMPARO

Aplicação full stack desenvolvida com **Node.js**, **Vite** e **Capacitor**, composta por um frontend web, backend e integração para Android.

## 📋 Descrição

O AMPARO é uma aplicação dividida em três partes principais:

* **Frontend:** interface desenvolvida com Vite.
* **Backend:** servidor desenvolvido em Node.js.
* **Android:** integração através do Capacitor para gerar uma aplicação móvel.

## 🚀 Tecnologias utilizadas

### Frontend

* Vite
* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* npm

### Mobile

* Capacitor
* Android Studio

---

## 📂 Estrutura do projeto

```text
AMPARO/
│
├── backend/
│
├── frontend/
│
├── README.md
├── amparo.md
├── capacitor.config.json
└── logo.png
```

---

## ⚙️ Pré-requisitos

Instale os seguintes programas:

* Node.js (versão 20 ou superior)
* npm
* Git
* Android Studio (opcional)

Verifique as instalações:

```bash
node -v
npm -v
git --version
```

---

## 🔧 Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/sam77g/AMPARO.git

cd AMPARO
```

---

### 2. Configurar o backend

```bash
cd backend

npm install
```

Inicie o servidor:

```bash
npm start
```

ou

```bash
node server.js
```

---

### 3. Configurar o frontend

Abra outro terminal:

```bash
cd frontend

npm install

npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

---

## 📱 Executar no Android

Dentro da pasta frontend:

```bash
npx cap sync android

npx cap open android
```

O Android Studio será aberto.

---

## 🔐 Variáveis de ambiente

Crie um arquivo `.env` dentro da pasta `backend`.

Exemplo:

```env
PORT=

DB_HOST=

DB_PORT=

DB_NAME=

DB_USER=

DB_PASSWORD=

JWT_SECRET=
```

**Nunca publique o arquivo `.env` no GitHub.**

---

## 📄 Licença

Este projeto está disponível para fins acadêmicos e educacionais.

---

## 👨‍💻 Autor

Desenvolvido por Samuel.
