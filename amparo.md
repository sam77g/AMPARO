# AMPARO — Documentação do Projeto

## O que é o AMPARO?

**AMPARO** é uma aplicação web voltada ao cuidado de idosos. Seu objetivo é centralizar o acompanhamento de saúde, permitindo que tanto o próprio idoso quanto seus cuidadores registrem e monitorem medicamentos, sinais vitais e informações médicas de forma simples e organizada.

O frontend é desenvolvido em **React (JSX)** e se comunica com uma API REST local rodando em `http://localhost:3001/api`.

---

## Estrutura dos arquivos

```
frontend/src/
├── App.jsx      → Interface completa da aplicação (componentes React)
├── api.js       → Camada de comunicação com a API backend
└── styles.css   → Estilização global
```

---

## Perfis de usuário

O sistema possui três tipos de usuários, cada um com sua própria área e permissões:

| Perfil | Acesso |
|---|---|
| **Idoso** | Visualiza e gerencia seus próprios dados de saúde |
| **Cuidador** | Gerencia múltiplos idosos vinculados |
| **Admin** | Controle total: gerencia todos os usuários e visualiza estatísticas globais |

---

## Funcionalidades

### Autenticação
- **Login** com e-mail e senha
- **Cadastro** com seleção de perfil (Idoso ou Cuidador)
- No cadastro de idosos, é possível informar data de nascimento e observações médicas
- Sessão persistida via token JWT no `localStorage`
- Tema claro/escuro salvo entre sessões

---

### Área do Idoso
Após o login, o idoso acessa duas abas:

**Perfil**
- Visualização e edição do nome e observações médicas
- Upload de foto de perfil (salva localmente no navegador)
- Exibe informações como idade calculada, cuidador vinculado, alergias e cuidados especiais

**Painel de Saúde**
- Banner de alerta quando há medicamentos pendentes no dia
- Notificação nativa do browser (caso a permissão seja concedida) para lembrar medicamentos não tomados
- Gestão completa de medicamentos e registro de sinais vitais (descritos abaixo)

---

### Área do Cuidador
O cuidador possui três abas:

**Perfil** — mesmas funcionalidades da área do idoso.

**Painel** — exibe o painel de saúde do idoso selecionado. Um seletor no cabeçalho permite trocar entre os idosos vinculados.

**Pacientes**
- Vincular um novo idoso pelo nome e e-mail
- Editar informações complementares do idoso: observações, alergias, cuidados especiais, doenças, altura e peso
- Desvincular um idoso
- Botão de atalho para abrir o painel de um paciente diretamente

---

### Área do Admin
**Dashboard** — exibe métricas gerais do sistema:
- Total de usuários, idosos, cuidadores e admins
- Total de medicamentos cadastrados
- Total de registros de sinais vitais
- Gráfico de barras com distribuição de usuários por tipo

**Usuários**
- Listagem de todos os usuários
- Criação de novo usuário (qualquer perfil, incluindo admin)
- Edição de nome, e-mail e tipo de qualquer usuário
- Exclusão de usuários

---

### Painel Operacional (compartilhado entre Idoso e Cuidador)

#### Medicamentos
- Adicionar medicamento com nome, dose, horário e frequência
- Marcar como **Tomada** ou **Pendente** com um clique
- Editar dados de um medicamento inline
- Badge visual indicando o status de cada medicamento

#### Sinais Vitais
- Registrar leituras de: **pressão arterial**, **batimento cardíaco**, **peso** e **glicemia**
- Registros do dia aparecem em destaque separados dos anteriores
- Exibe horário exato de cada medição

#### Gráficos
- Mini gráficos de linha SVG para as últimas 20 leituras de:
  - Peso (kg)
  - Pressão sistólica
  - Batimentos cardíacos (bpm)

---

## Camada de API (`api.js`)

Todos os endpoints são chamados via `fetch` com autenticação por Bearer Token. As principais rotas são:

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Cadastro |
| GET | `/auth/me` | Dados do usuário logado |
| GET/PUT | `/profile` | Perfil do usuário |
| GET | `/dashboard` ou `/dashboard/:id` | Dados do painel |
| GET/POST | `/medications` | Listar e adicionar medicamentos |
| PUT | `/medications/:id` | Editar medicamento |
| PATCH | `/medications/:id/toggle` | Alternar status |
| GET/POST | `/vitals` | Sinais vitais |
| GET/POST | `/patients/link` | Listar e vincular idosos |
| PUT/DELETE | `/patients/:id` | Editar ou desvincular idoso |
| GET/POST | `/users` | Gerenciar usuários (admin) |
| PUT/DELETE | `/users/:id` | Editar ou excluir usuário |
| GET | `/stats` | Estatísticas globais (admin) |

---

## Tecnologias utilizadas

- **React** com Hooks (`useState`, `useEffect`, `useCallback`)
- **Lucide React** para ícones
- **SVG nativo** para mini gráficos de linha
- **Fetch API** para comunicação com o backend
- **localStorage** para persistência de token e foto de perfil
- **sessionStorage** para controle de alertas diários
- **Notification API** do browser para notificações nativas

---

## Observações técnicas

- O backend deve estar rodando em `http://localhost:3001` para o frontend funcionar.
- A foto de perfil é armazenada como Base64 no `localStorage` do navegador (não é enviada ao servidor).
- O alerta de medicamentos pendentes é disparado uma vez por sessão por paciente, usando `sessionStorage` como controle.
- O tema escuro/claro é aplicado via classe `dark` no elemento `<html>` e persistido no `localStorage`.