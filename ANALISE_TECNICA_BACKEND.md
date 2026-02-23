# Análise Técnica - Finance Tracker Backend

**Data da Análise:** Fevereiro 2026  
**Versão:** 1.0  
**Escopo:** Transposição da camada de dados do localStorage+Google Drive para um backend API

---

## 1. O que Pode Ser Alimentado por uma API

O aplicativo atualmente funciona com dados armazenados em `localStorage` (browser) e sincroniza com Google Drive. A seguinte estrutura de dados deve ser migrada para um backend:

### 1.1 Entidades Principais

| Entidade | Descrição | Status Atual |
|----------|-----------|--------------|
| **Transações** | Registros individuais de entrada/saída de dinheiro | localStorage + Google Drive |
| **Transações Recorrentes** | Transações que se repetem (e.g., salário mensal, aluguel) | localStorage |
| **Balances Mensais** | Agregações de transações por mês | localStorage (calculado) |
| **Categorias** | Lista de categorias de transações | localStorage |
| **Usuários** | Dados de autenticação e perfil | NextAuth (Google) |
| **Dados de Sincronização** | Timestamps e histórico de backups | Google Drive |

### 1.2 Dados Derivados (Atualmente Calculados no Frontend)

- **Saldos diários por mês**
- **Totais de receita/despesa por mês**
- **Performance mensal** (receita - despesa)
- **Carryover entre meses** (saldo final → saldo inicial posterior)

---

## 2. Tipos de Endpoints Necessários

### 2.1 Transações

```
POST   /api/transactions              Criar nova transação
GET    /api/transactions              Listar transações (com filtros)
GET    /api/transactions/:id          Obter transação específica
PUT    /api/transactions/:id          Atualizar transação
DELETE /api/transactions/:id          Deletar transação

GET    /api/transactions/month/:year/:month    Obter transações do mês
```

### 2.2 Transações Recorrentes

```
POST   /api/recurring-transactions              Criar recorrência
GET    /api/recurring-transactions              Listar recorrências
GET    /api/recurring-transactions/:id          Obter recorrência específica
PUT    /api/recurring-transactions/:id          Atualizar recorrência
DELETE /api/recurring-transactions/:id          Deletar recorrência

POST   /api/recurring-transactions/:id/apply    Aplicar transações do mês
```

### 2.3 Resumos e Agregações

```
GET    /api/monthly-summary/:year/:month       Resumo do mês
GET    /api/monthly-data                       Dados de todos os meses
GET    /api/balance/daily/:year/:month         Saldos diários do mês
GET    /api/performance/chart                  Dados para gráficos
```

### 2.4 Categorias

```
POST   /api/categories                         Criar categoria
GET    /api/categories                         Listar categorias
PUT    /api/categories/:id                     Editar categoria
DELETE /api/categories/:id                     Deletar categoria
GET    /api/categories/stats/:year/:month      Estatísticas por categoria
```

### 2.5 Sincronização e Backup

```
POST   /api/sync/backup                        Criar backup manual
GET    /api/sync/backup/list                   Listar backups anteriores
POST   /api/sync/restore/:backupId             Restaurar backup
DELETE /api/sync/backup/:backupId              Deletar backup antigo
POST   /api/sync/auto-backup                   Configurar backup automático
```

### 2.6 Autenticação (Já Implementado)

```
GET    /api/auth/[...nextauth]                 NextAuth endpoint
POST   /api/auth/signin                        Login com Google
GET    /api/auth/session                       Obter sessão atual
POST   /api/auth/signout                       Logout
```

---

## 3. Dados Enviados e Recebidos

### 3.1 Transação (Transaction)

#### Request (POST/PUT):
```json
{
  "date": "2025-05-15",
  "description": "Salário mensal",
  "amount": 3500.00,
  "type": "entrada",
  "category": "salário",
  "note": "Referente a maio"
}
```

#### Response (GET):
```json
{
  "id": "trans-1708560000000",
  "date": "2025-05-15T00:00:00Z",
  "description": "Salário mensal",
  "amount": 3500.00,
  "type": "entrada",
  "category": "salário",
  "note": "Referente a maio",
  "userId": "user-123",
  "createdAt": "2025-05-15T10:30:00Z",
  "updatedAt": "2025-05-15T10:30:00Z"
}
```

### 3.2 Transação Recorrente (RecurringTransaction)

#### Request (POST/PUT):
```json
{
  "description": "Aluguel",
  "amount": 1200.00,
  "type": "saída",
  "category": "aluguel",
  "frequency": "monthly",
  "dayOfMonth": 5,
  "isActive": true,
  "startDate": "2025-01-05",
  "endDate": "2026-01-05",
  "note": "Aluguel do apartamento"
}
```

#### Response (GET):
```json
{
  "id": "rec-trans-1708560000000",
  "description": "Aluguel",
  "amount": 1200.00,
  "type": "saída",
  "category": "aluguel",
  "frequency": "monthly",
  "dayOfMonth": 5,
  "dayOfWeek": null,
  "isActive": true,
  "startDate": "2025-01-05T00:00:00Z",
  "endDate": "2026-01-05T00:00:00Z",
  "note": "Aluguel do apartamento",
  "userId": "user-123",
  "lastAppliedMonth": "2025-05",
  "createdAt": "2025-01-05T00:00:00Z"
}
```

### 3.3 Resumo Mensal (MonthlySummary)

#### Request (GET):
```
GET /api/monthly-summary/2025/5
```

#### Response:
```json
{
  "month": 5,
  "year": 2025,
  "initialBalance": 500.00,
  "totalIncome": 3500.00,
  "totalExpense": 2890.00,
  "performance": 610.00,
  "finalBalance": 1110.00,
  "transactionCount": 45,
  "recurringTransactionCount": 8,
  "dailyBalances": [
    {
      "date": "2025-05-01T00:00:00Z",
      "income": 0,
      "expense": 0,
      "balance": 500.00,
      "transactionCount": 0
    },
    {
      "date": "2025-05-05T00:00:00Z",
      "income": 0,
      "expense": 1200.00,
      "balance": -700.00,
      "transactionCount": 1
    }
  ]
}
```

### 3.4 Categoria

#### Request (POST):
```json
{
  "name": "Lazer",
  "color": "#FF5733",
  "icon": "🎮",
  "description": "Despesas com entretenimento"
}
```

#### Response (GET):
```json
{
  "id": "cat-123",
  "name": "Lazer",
  "color": "#FF5733",
  "icon": "🎮",
  "description": "Despesas com entretenimento",
  "isDefault": false,
  "transactionCount": 12,
  "totalAmount": 450.00,
  "userId": "user-123",
  "createdAt": "2025-01-15T00:00:00Z"
}
```

### 3.5 Errors Padrão

#### 400 - Bad Request:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Descrição é obrigatória",
  "details": {
    "field": "description",
    "reason": "required"
  }
}
```

#### 401 - Unauthorized:
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Sessão expirada. Faça login novamente."
}
```

#### 403 - Forbidden:
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Você não tem permissão para acessar este recurso"
}
```

#### 404 - Not Found:
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Transação não encontrada"
}
```

#### 500 - Server Error:
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "Erro ao processar a requisição",
  "requestId": "req-123456"
}
```

---

## 4. Validações no Servidor

### 4.1 Validações de Transações

| Campo | Validação | Tipo | Comentário |
|-------|-----------|------|-----------|
| **description** | Obrigatório, 3-200 caracteres | String | Remove espaços extras |
| **amount** | Obrigatório, > 0, máx 999999.99 | Decimal | 2 casas decimais |
| **type** | Obrigatório, 'entrada' ou 'saída' | Enum | Case-insensitive |
| **date** | Obrigatório, data válida, não > hoje + 1 dia | Date | ISO 8601 |
| **category** | Opcional, deve existir no banco | String | Lowercase, validar contra lista |
| **note** | Opcional, máx 500 caracteres | String | Trim de espaços |
| **userId** | Obrigatório (do token JWT) | String | Extraído da sessão |

**Validações de Negócio:**
- ✅ Transação não pode ter data no futuro (exceto 1 dia)
- ✅ Deve haver correspondência com ano/mês da data
- ✅ Amount deve ser convertido corretamente (BRL)
- ✅ Verificar duplicatas (mesma descrição, valor, tipo no mesmo dia)

### 4.2 Validações de Transações Recorrentes

| Campo | Validação | Tipo | Comentário |
|-------|-----------|------|-----------|
| **description** | Obrigatório, 3-200 caracteres | String | - |
| **amount** | Obrigatório, > 0, máx 999999.99 | Decimal | - |
| **type** | Obrigatório, 'entrada' ou 'saída' | Enum | - |
| **frequency** | Obrigatório, enum válido | Enum | 'monthly', 'weekly', 'daily' |
| **dayOfMonth** | Required se freq='monthly', 1-31 | Integer | Validar dias válidos (29,30,31) |
| **dayOfWeek** | Required se freq='weekly', 0-6 | Integer | 0=domingo, 6=sábado |
| **category** | Obrigatório, deve existir | String | - |
| **startDate** | Obrigatório, data válida | Date | Não pode ser no passado |
| **endDate** | Opcional, >= startDate | Date | Se definida, usar para desativar |
| **isActive** | Obrigatório, booleano | Boolean | Default true |

**Validações de Negócio:**
- ✅ Não permitir recorrências com dayOfMonth=31 se frequency='monthly' (fevereiro)
- ✅ Se houver endDate, recorrência deve desativar automaticamente
- ✅ Validar que a recorrência não cria ciclos infinitos
- ✅ Evitar recorrências muito antigas sem aplicação

### 4.3 Validações de Categorias

| Campo | Validação | Tipo | Comentário |
|-------|-----------|------|-----------|
| **name** | Obrigatório, 2-50 caracteres, unique | String | Case-insensitive para duplicação |
| **color** | Opcional, formato hex válido | String | #RRGGBB |
| **icon** | Opcional, emoji único | String | Max 2 caracteres |
| **description** | Opcional, máx 200 caracteres | String | - |

**Validações de Negócio:**
- ✅ Não permitir deletar categorias padrão do sistema
- ✅ Validar que há pelo menos 1 categoria
- ✅ Se deletar categoria com transações, mover para "Outros"

### 4.4 Validações de Período

| Validação | Regra |
|-----------|-------|
| **Ano** | 1900 ≤ ano ≤ ano atual + 1 |
| **Mês** | 0 ≤ mês ≤ 11 (JavaScript) ou 1 ≤ mês ≤ 12 (boas práticas) |
| **Dia** | 1 ≤ dia ≤ dias_do_mês |

### 4.5 Sanitização

```javascript
// Todos os inputs de string devem:
- Trim de espaços em branco
- Escape de caracteres especiais (XSS)
- Validação de encoding UTF-8
- Limite de tamanho máximo

// Numbers:
- Verificar overflow/underflow
- Arredondar para 2 decimais (moeda)
```

---

## 5. Regras de Negócio Implícitas

### 5.1 Cálculo de Saldos (Continuidade Mensal)

**Regra Principal:** O saldo final de um mês é o saldo inicial do mês seguinte.

```
Mês N:
  Saldo Inicial = 500.00 (do mês N-1)
  + Entradas = 3500.00
  - Saídas = 2890.00
  = Saldo Final = 1110.00

Mês N+1:
  Saldo Inicial = 1110.00 (carryover do mês N)
  (recalcular todos os dias)
```

**Implicações no Backend:**
- Quando editar/deletar transação: recalcular todos os saldos do mês + meses posteriores
- Criar novo mês: buscar saldo final do mês anterior como inicial
- Ao restaurar backup: validar integridade de continuidade

### 5.2 Aplicação de Transações Recorrentes

```javascript
// Para cada mês solicitado (ano, mês):
for (cada recorrência ativa) {
  if (recurrência.startDate <= mês && 
      (!recorrência.endDate || recorrência.endDate >= mês)) {
    
    if (frequência == 'monthly') {
      dia = recorrência.dayOfMonth
      // Validar se dia existe no mês
      if (dia > diasDoMês) dia = diasDoMês
    } 
    else if (frequência == 'weekly') {
      // Calcular próximo dia da semana
      dia = próximoDia_daSemana(recorrência.dayOfWeek, dataInício)
    }
    else if (frequência == 'daily') {
      // Criar para cada dia do mês
    }
    
    // Criar transação automática
    criar_transacao(recorrência, dia)
    
    // Marcar como lastAppliedMonth
    recorrência.lastAppliedMonth = `${ano}-${mês}`
  }
}
```

### 5.3 Permissões por Usuário

```javascript
// Cada usuário só pode ver/modificar seus próprios dados
- Transações: filtrar por userId
- Recorrências: filtrar por userId
- Categorias: filtrar por userId
- Backup: apenas do usuário autenticado
```

### 5.4 Validação de Integridade de Dados

```javascript
// Invariantes que devem ser mantidas:
1. Para cada dia de um mês:
   balance = saldo_inicial + Σ(entradas) - Σ(saídas)

2. Para cada mês:
   totalIncome = Σ de todas as "entrada"
   totalExpense = Σ de todas as "saída"
   performance = totalIncome - totalExpense

3. Cada transação pertence a exatamente um mês
4. Cada transação tem uma categoria válida (ou null)
5. Não há transações duplicadas (id único)
```

### 5.5 Regras de Exclusão em Cascata

```javascript
// Se deletar categoria:
- Transações com essa categoria → mover para "Outros" ou null
- Transações recorrentes → mover para "Outros" ou null

// Se deletar usuário:
- Todas as suas transações, recorrências, categorias → deletadas
```

---

## 6. Modelagem Conceitual do MongoDB

### 6.1 Estrutura de Collections

#### **users**
```javascript
db.users.insertOne({
  _id: ObjectId("..."),
  email: "usuario@example.com",
  name: "João Silva",
  googleId: "1234567890",
  avatar: "https://...",
  preferences: {
    timezone: "America/Sao_Paulo",
    currency: "BRL",
    dateFormat: "DD/MM/YYYY",
    autoBackup: true,
    backupInterval: 300000  // 5 minutos em ms
  },
  createdAt: ISODate("2025-01-15T10:30:00Z"),
  updatedAt: ISODate("2025-01-15T10:30:00Z")
})
```

#### **transactions**
```javascript
db.transactions.insertOne({
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  date: ISODate("2025-05-15T00:00:00Z"),
  description: "Salário",
  amount: Decimal128("3500.00"),
  type: "entrada",  // "entrada" | "saída"
  category: ObjectId("..."),  // referência a categories
  note: "Referente a maio",
  month: 5,
  year: 2025,
  isRecurringGenerated: false,
  parentRecurringId: ObjectId("..."),  // se gerada por recorrência
  createdAt: ISODate("2025-05-15T10:30:00Z"),
  updatedAt: ISODate("2025-05-15T10:30:00Z")
})

// Índices recomendados:
db.transactions.createIndex({ userId: 1, date: -1 })
db.transactions.createIndex({ userId: 1, month: 1, year: 1 })
db.transactions.createIndex({ userId: 1, category: 1 })
db.transactions.createIndex({ date: 1, userId: 1 })
```

#### **recurring_transactions**
```javascript
db.recurring_transactions.insertOne({
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  description: "Aluguel",
  amount: Decimal128("1200.00"),
  type: "saída",
  category: ObjectId("..."),
  frequency: "monthly",  // "daily" | "weekly" | "monthly"
  dayOfMonth: 5,         // para monthly
  dayOfWeek: 0,          // para weekly (0 = domingo)
  isActive: true,
  startDate: ISODate("2025-01-05T00:00:00Z"),
  endDate: ISODate("2026-01-05T00:00:00Z"),
  note: "Aluguel do apartamento",
  lastAppliedMonth: "2025-05",
  lastAppliedDate: ISODate("2025-05-05T00:00:00Z"),
  createdAt: ISODate("2025-01-05T00:00:00Z"),
  updatedAt: ISODate("2025-01-05T00:00:00Z")
})

// Índices:
db.recurring_transactions.createIndex({ userId: 1, isActive: 1 })
db.recurring_transactions.createIndex({ userId: 1, startDate: 1, endDate: 1 })
```

#### **categories**
```javascript
db.categories.insertOne({
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  name: "Salário",
  color: "#00C853",
  icon: "💰",
  description: "Receitas de trabalho",
  isDefault: true,
  transactionCount: 12,
  createdAt: ISODate("2025-01-01T00:00:00Z"),
  updatedAt: ISODate("2025-01-15T10:30:00Z")
})

// Índices:
db.categories.createIndex({ userId: 1, name: 1 }, { unique: true })
db.categories.createIndex({ userId: 1, isDefault: 1 })
```

#### **monthly_summaries** (Cache/Desnormalização)
```javascript
db.monthly_summaries.insertOne({
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  month: 5,
  year: 2025,
  initialBalance: Decimal128("500.00"),
  totalIncome: Decimal128("3500.00"),
  totalExpense: Decimal128("2890.00"),
  performance: Decimal128("610.00"),
  finalBalance: Decimal128("1110.00"),
  transactionCount: 45,
  categoryBreakdown: {
    "salário": Decimal128("3500.00"),
    "aluguel": Decimal128("-1200.00"),
    "alimentação": Decimal128("-500.00")
  },
  lastUpdated: ISODate("2025-05-31T23:59:59Z")
})

// Índices:
db.monthly_summaries.createIndex({ userId: 1, year: 1, month: 1 }, { unique: true })
```

#### **backups**
```javascript
db.backups.insertOne({
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  fileName: "finance-tracker-backup-2025-05-15.json",
  googleDriveFileId: "1a2b3c4d5e6f7g8h9i0j",
  backupSize: 102400,  // bytes
  transactionCount: 287,
  recurringTransactionCount: 12,
  type: "manual",  // "manual" | "automatic"
  status: "success",  // "success" | "failed" | "pending"
  error: null,
  createdAt: ISODate("2025-05-15T10:30:00Z"),
  expiresAt: ISODate("2025-08-15T10:30:00Z")  // TTL para cleanup
})

// Índices:
db.backups.createIndex({ userId: 1, createdAt: -1 })
db.backups.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })  // TTL
```

#### **sessions** (Se não usar NextAuth storage)
```javascript
db.sessions.insertOne({
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  sessionToken: "hash_do_token",
  accessToken: "google_access_token_criptografado",
  refreshToken: "google_refresh_token_criptografado",
  expiresAt: ISODate("2025-01-20T10:30:00Z"),
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  lastActivity: ISODate("2025-01-15T14:30:00Z"),
  createdAt: ISODate("2025-01-15T10:30:00Z")
})

// Índices:
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })  // TTL
db.sessions.createIndex({ sessionToken: 1 }, { unique: true })
```

### 6.2 Relacionamentos

```
users (1) ──┬─→ (N) transactions
            ├─→ (N) recurring_transactions
            ├─→ (N) categories
            ├─→ (N) backups
            └─→ (N) sessions

transactions (M) ──→ (1) categories
transactions (M) ──→ (1) recurring_transactions (se isRecurringGenerated=true)

recurring_transactions (M) ──→ (1) categories
```

### 6.3 Estratégia de Denormalização

**Motivo:** Performance de leitura para views (gráficos, resumos)

```javascript
// Em transactions: copiar nome da categoria
{
  categoryId: ObjectId("..."),
  categoryName: "Salário"  // desnormalizado
}

// Em monthly_summaries: copiar dados agregados
// Atualizar via job noturno ou quando criar/editar transação

// Em users: copiar informações de sessão ativa
{
  lastLogin: ISODate("..."),
  sessionCount: 3
}
```

---

## 7. Preocupações de Segurança

### 7.1 Autenticação e Autorização

#### 🔴 CRÍTICO - Autenticação

| Concern | Risco | Mitigação |
|---------|-------|-----------|
| **Token Expirado** | Acesso prolongado após logout | Validar expiração a cada request, refresh automático |
| **Token Inválido** | Falsificação de identidade | Verificar JWT signature, checklist whitelist |
| **Session Hijacking** | Roubo de sessão | Bind session a IP + User-Agent, HTTPS obrigatório |
| **CSRF (Cross-Site Request Forgery)** | Requisições não autorizadas | CSRF tokens em POST/PUT/DELETE, SameSite cookies |
| **XSS (Cross-Site Scripting)** | Roubo de tokens do localStorage | Usar httpOnly cookies, CSP headers |

**Implementação:**
```javascript
// Middleware de autenticação
async function validateAuth(req) {
  const session = await getSession({ req })
  if (!session) throw new Error('UNAUTHORIZED')
  
  // Validar token ainda não expirou
  if (session.expiresAt < Date.now()) throw new Error('TOKEN_EXPIRED')
  
  return session
}

// CSRF token check
app.post('/api/transactions', [
  validateCSRFToken(),
  validateAuth(),
  validateInput()
], handler)
```

#### 🔴 CRÍTICO - Autorização

| Validação | Regra |
|-----------|-------|
| **User Isolation** | Cada user só vê seus dados, validar userId em TODA query |
| **Recorrência** | Só pode deletar sua própria recorrência |
| **Categoria** | Não deletar categorias padrão do sistema |
| **Backup** | Apenas owner pode acessar/restaurar seu backup |

**Implementação:**
```javascript
// Sempre adicionar filtro userId
db.transactions.find({ 
  userId: ObjectId(session.userId),  // OBRIGATÓRIO
  date: { $gte: new Date(...) }
})

// Validar ownership antes de deletar
const transaction = await Transaction.findById(id)
if (transaction.userId.toString() !== session.userId) {
  throw new Error('FORBIDDEN')
}
```

### 7.2 Validação e Sanitização

#### 🔴 CRÍTICO - Injection Attacks

| Attack | Risco | Prevenção |
|--------|-------|-----------|
| **NoSQL Injection** | Manipular queries MongoDB | Usar typed queries, schemas validation |
| **SQL Injection** | N/A (MongoDB) | - |
| **XXE (XML External Entity)** | DoS, file access | Não aceitar XML input |

**Implementação:**
```javascript
// ❌ PERIGO:
db.transactions.find({ description: req.body.description })

// ✅ SEGURO:
const { description } = req.body
const schema = z.string().min(3).max(200)
const validated = schema.parse(description)
db.transactions.find({ description: { $eq: validated } })
```

#### 🟡 ALTER - Input Validation

```javascript
// Whitelist, não blacklist
const allowedTypes = ['entrada', 'saída']
if (!allowedTypes.includes(type)) throw new Error('Invalid type')

// Tamanho máximo
if (description.length > 200) throw new Error('Too long')

// Formato de Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) throw new Error('Invalid email')

// Valores monetários
if (amount < 0 || amount > 999999.99) throw new Error('Invalid amount')
if (!Number.isFinite(amount)) throw new Error('Invalid amount')
```

### 7.3 Criptografia e Armazenamento

#### 🔴 CRÍTICO - Dados Sensíveis

| Dado | Armazenamento | Criptografia |
|------|-----------------|-------------|
| **Google Access Token** | Banco de dados | AES-256 |
| **Google Refresh Token** | Banco de dados | AES-256 |
| **Sessão JWT** | HTTP-only cookie | HTTPS |
| **Dados Financeiros** | Banco de dados | Não criptografar (já filtrado por usuário) |

**Implementação:**
```javascript
// Criptografar tokens sensíveis
const crypto = require('crypto')
const key = process.env.ENCRYPTION_KEY  // 32 bytes

function encryptToken(token) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decryptToken(encrypted) {
  const [iv, cipher] = encrypted.split(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'))
  let decrypted = decipher.update(cipher, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

#### 🟡 ALTER - Rate Limiting

```javascript
// Por IP + Endpoint
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100,
  keyGenerator: (req) => req.ip
})

// Por Usuário para operações sensíveis
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 10,
  keyGenerator: (req) => req.session.userId
})

app.post('/api/transactions', [strictLimiter, ...])
app.get('/api/monthly-summary', [limiter, ...])
```

### 7.4 Proteção contra Abuso

#### 🟡 ALTER - DDoS

```javascript
// Helmet.js para headers de segurança
app.use(helmet())

// CORS restritivo
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  maxAge: 86400
}))

// Compression para reduzir payloads
app.use(compression())

// Request size limits
app.use(express.json({ limit: '10kb' }))
```

#### 🟡 ALTER - Validação de Google OAuth

```javascript
// Verificar estado do OAuth
async function validateGoogleAuth(code, state) {
  // 1. Validar state against stored state
  const storedState = req.session.oauthState
  if (state !== storedState) throw new Error('Invalid state')
  
  // 2. Validar domínio de email
  const allowedDomains = ['@gmail.com', '@company.com']
  if (!allowedDomains.some(d => email.endsWith(d))) {
    throw new Error('Email domain not allowed')
  }
  
  // 3. Verificar ID token signature
  const verified = await verifyGoogleIdToken(idToken)
  
  return verified
}
```

### 7.5 Auditoria e Logging

#### 🟢 IMPORTANTE - Logs de Ação

```javascript
// Log de mudanças sensíveis
async function logAction(userId, action, details, ipAddress) {
  await AuditLog.create({
    userId,
    action,  // 'CREATE_TRANSACTION', 'DELETE_TRANSACTION', 'LOGIN_FAILED'
    details,
    ipAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
    status: 'success' | 'failed'
  })
}

// Alertas de ações suspeitas
// - Múltiplas falhas de login
// - Acesso de IP diferente
// - Exclusão em massa de transações
// - Múltiplas tentativas de backup
```

#### 🟢 IMPORTANTE - Rotação de Tokens

```javascript
// Refresh token a cada 7 dias ou se IP mudar
async function refreshSession(session) {
  if (session.ipChanged) {
    // Invalidar sessão anterior
    await session.invalidate()
    // Forçar novo login
    return { redirect: '/api/auth/signin' }
  }
  
  if (Date.now() - session.lastRefresh > 7 * 24 * 60 * 60 * 1000) {
    // Renovar token
    session.token = generateNewToken()
    session.lastRefresh = Date.now()
  }
}
```

### 7.6 Proteção de Dados em Trânsito

#### 🔴 CRÍTICO - HTTPS

```javascript
// Forçar HTTPS em produção
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`)
    }
    next()
  })
}

// HSTS (HTTP Strict Transport Security)
app.use(helmet.hsts({
  maxAge: 31536000,  // 1 ano
  includeSubDomains: true,
  preload: true
}))
```

#### 🟡 ALTER - Cookies Seguros

```javascript
// Configurar cookies com bendera segura
session: {
  cookie: {
    httpOnly: true,      // Não acessível via JavaScript
    secure: true,        // Apenas HTTPS
    sameSite: 'strict',  // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 dias
  }
}
```

### 7.7 Tratamento de Erros

#### 🟡 ALTER - Não Expor Informações Sensíveis

```javascript
// ❌ PERIGO:
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const t = await Transaction.findById(req.params.id)
  } catch (error) {
    res.status(500).json({ error: error.toString() })  // Expõe stack
  }
})

// ✅ SEGURO:
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const t = await Transaction.findById(req.params.id)
  } catch (error) {
    console.error('Transaction fetch error:', error)  // Log interno
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: req.id  // Para debugging
    })
  }
})
```

### 7.8 Monitoramento de Segurança

#### 🟢 IMPORTANTE - Alertas

```javascript
// Alertas de segurança
const securityAlerts = {
  MULTIPLE_LOGIN_FAILURES: {
    threshold: 5,
    window: 15 * 60 * 1000,
    action: 'block_user'
  },
  UNUSUAL_API_USAGE: {
    threshold: 1000,
    window: 60 * 1000,
    action: 'rate_limit'
  },
  LARGE_DATA_EXPORT: {
    threshold: 1000000,  // bytes
    action: 'log_and_email'
  }
}

// Verificar volume de transações criadas/deletadas
if (deletedCount > 100 && timeWindow < 60000) {
  alert('SUSPICIOUS_ACTIVITY')
}
```

### 7.9 Matriz de Risco de Segurança

| Vetor de Ataque | Risco | Impacto | Mitigação | Prioridade |
|-----------------|-------|--------|-----------|-----------|
| Session Hijacking | Alto | Crítico | Token refresh, IP binding | 🔴 |
| NoSQL Injection | Alto | Crítico | Schema validation, typed queries | 🔴 |
| Unauthorized Access (Multitenancy) | Alto | Crítico | userId validation em todas queries | 🔴 |
| XSS via localStorage | Médio | Alto | HTTP-only cookies, CSP | 🔴 |
| CSRF | Médio | Médio | CSRF tokens, SameSite cookies | 🟡 |
| Password Attack (OAuth) | Baixo | Médio | Rate limiting, email verification | 🟡 |
| Data Exfiltration | Médio | Alto | HTTPS, audit logging | 🟡 |
| DoS | Médio | Médio | Rate limiting, request size limits | 🟡 |

---

## Resumo Executivo

### Oportunidades de Migração

```
Current State (Frontend-Only):
- Dados no localStorage (browser)
- Sincronização via Google Drive API
- Sem persistência real no servidor
- Sem isolamento de dados entre abas/dispositivos

Target State (Backend API):
- Fonte de verdade no MongoDB
- Google Drive apenas para backup
- Sincronização real-time possível
- Controle centralizado de acesso
- Escalabilidade para múltiplos usuários
```

### Endpoints Prioritários (MVP)

```
Phase 1 (Semana 1-2):
✅ POST   /api/transactions              (criar)
✅ GET    /api/transactions              (listar)
✅ PUT    /api/transactions/:id          (editar)
✅ DELETE /api/transactions/:id          (deletar)
✅ GET    /api/monthly-summary/:year/:month

Phase 2 (Semana 3-4):
✅ Transações Recorrentes (CRUD)
✅ Categorias (CRUD)
✅ Backup/Restore

Phase 3 (Semana 5+):
✅ Agregações e Gráficos
✅ Performance optimizations
✅ Notifications e webhooks
```

### Tecnologias Recomendadas

```
Backend:
- Node.js/Express.js (familiar ao contexto)
- MongoDB (NoSQL, flexível)
- Mongoose (schema validation)
- JWT (autenticação)
- NextAuth.js (já implementado partial)

Middleware de Segurança:
- Helmet.js (headers)
- express-validator (validation)
- express-rate-limit (rate limiting)
- cors (CORS protection)
- joi (schema validation)

Criptografia:
- bcrypt (senhas - se implementar)
- crypto-js (tokens sensíveis)
- jsonwebtoken (JWT)

Auditoria:
- winston (logging)
- sentry (error tracking)
- elastic-stack (ELK - opcional)
```

---

## Próximas Ações Recomendadas

1. **Definir escopo exato do backend** - Qual será a primeira feature?
2. **Setup do MongoDB e modelo inicial** - Collections e índices
3. **Implementar autenticação com NextAuth + JWT** - Base de segurança
4. **Criar endpoints CRUD para Transactions** - Core functionality
5. **Implementar validações rigorosas** - Especialmente regras de negócio
6. **Setup de rate limiting e monitoring** - Defesa proativa
7. **Testes de integração e segurança** - QA antes de production
8. **CI/CD pipeline** - Automação e qualidade de código

---

**Documento preparado para:** Análise de arquitetura backend  
**Audiência:** Desenvolvedor backend (você mesmo)  
**Próxima revisão:** Após implementação da Phase 1
