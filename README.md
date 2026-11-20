# 💻 Financeiro Frontend — React Dashboard

Interface premium para controle financeiro pessoal, focada em visualização de dados e experiência do usuário (UX).

## 🛠️ Tecnologias
- **React 18**: Biblioteca para interfaces declarativas.
- **Tailwind CSS**: Estilização moderna e responsiva.
- **Chart.js**: Gráficos interativos para insights financeiros.
- **React Router 7**: Roteamento dinâmico e seguro.
- **Axios**: Cliente HTTP para comunicação com a API.
- **React Toastify**: Notificações visuais elegantes.

## 📁 Estrutura de Pastas
- `src/api`: Configuração do Axios e interceptores.
- `src/components`: Componentes reutilizáveis (Modais, Inputs, Cards).
- `src/context`: Contexto de Autenticação (`AuthContext`).
- `src/pages`: Telas principais (`Dashboard`, `Login`, `Register`).
- `src/public`: Ativos estáticos e manifestos.

## ⚙️ Variáveis de Ambiente
Crie um arquivo `.env` na raiz da pasta `frontend`:
```env
REACT_APP_API_URL=http://localhost:3000
```

## 🚀 Como Rodar Localmente
1. Instale as dependências: `npm install`
2. Inicie o projeto: `npm start`
3. O sistema abrirá em `http://localhost:3001`.

## ☁️ Deploy (Vercel)
Configurado para **Vercel** via `vercel.json` para suportar SPAs.
- **Build Command**: `npm run build`
- **Output Directory**: `build`

---
Interface moderna desenvolvida para máxima eficiência financeira.
