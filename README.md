# TDE Mod

Aplicação composta por:

- Frontend: Vite + Capacitor
- Backend: Node.js
- Android: Capacitor Android

## Requisitos

- Node.js 20+
- npm
- Android Studio (opcional)

## Instalação

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Gerar build

```bash
npm run build
```

### Android

```bash
npx cap sync android
npx cap open android
```

## Configuração

Crie um arquivo `.env` dentro de `backend` usando `.env.example` como base.