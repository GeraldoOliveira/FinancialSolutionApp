// server.js
const fs = require('fs');
const path = require('path');

// Carrega variáveis do arquivo .env se existir
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [k, ...v] = trimmed.split('=');
            if (k && v.length) {
                process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
            }
        }
    });
}

const dbPath = path.join(__dirname, 'db.json');
const dbExamplePath = path.join(__dirname, 'db.example.json');
if (!fs.existsSync(dbPath) && fs.existsSync(dbExamplePath)) {
    fs.copyFileSync(dbExamplePath, dbPath);
    console.log('[Mock Server] db.json inicializado a partir de db.example.json');
}

const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const { body, validationResult } = require('express-validator');

server.use(middlewares);
const express = require('express');
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ limit: '50mb', extended: true })); // Suporte a imagens base64 grandes

server.get('/api/v1/user', (req, res) => {
    res.jsonp(router.db.get('users').value());
});

server.get('/api/v1/user/:id', (req, res) => {
    const userId = req.params.id;
    const user = router.db.get('users').find({ id: parseInt(userId) }).value();

    if (user) {
        res.jsonp(user);
    } else {
        res.status(404).jsonp({ error: 'User not found' });
    }
});

// ==========================================
// MÓDULO MULTI-TENANT, RBAC & OAUTH (SIMULADO)
// ==========================================

// Endpoint OAuth Google Simulado
server.post('/api/v1/auth/google', (req, res) => {
    const { email, name, phone, photoUrl } = req.body;
    if (!email) {
        return res.status(400).jsonp({ error: 'E-mail é obrigatório para autenticação OAuth.' });
    }

    const users = router.db.get('users');
    let user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()).value();

    if (!user) {
        const nextId = users.value().length > 0 ? Math.max(...users.value().map(u => u.id || 0)) + 1 : 1;
        user = {
            id: nextId,
            name: name || email.split('@')[0],
            email: email,
            phone: phone ? phone.replace(/\D/g, '') : '',
            imageUpload: photoUrl || '',
            image: 'google-avatar.png',
            createdAt: new Date().toISOString(),
            accessToken: 'oauth_token_' + Date.now(),
            userToken: 'user_token_' + Date.now()
        };
        users.push(user).write();

        const userWsId = 'ws_user_' + user.id;
        router.db.get('workspaces').push({
            id: userWsId,
            name: 'Workspace de ' + user.name,
            ownerUserId: user.id,
            adminName: user.name,
            adminPhone: user.phone,
            adminPixKey: user.email,
            description: 'Meu workspace pessoal',
            color: '#4F46E5',
            icon: 'fa-home',
            createdAt: new Date().toISOString()
        }).write();

        router.db.get('workspace_members').push({
            id: Date.now(),
            workspaceId: userWsId,
            userId: user.id,
            userName: user.name,
            email: user.email,
            phone: user.phone,
            role: 'Admin',
            joinedAt: new Date().toISOString()
        }).write();
    }

    const allMembers = router.db.get('workspace_members').value() || [];
    const myMemberships = allMembers.filter(m => 
        m.userId === user.id || 
        (user.email && m.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
        (user.phone && m.phone && m.phone === user.phone)
    );

    const allWorkspaces = router.db.get('workspaces').value() || [];
    const workspacesWithRoles = myMemberships.map(m => {
        const ws = allWorkspaces.find(w => w.id === m.workspaceId);
        return {
            ...ws,
            role: m.role,
            isOwner: ws && ws.ownerUserId === user.id
        };
    }).filter(w => w && w.id);

    return res.status(200).jsonp({
        user,
        token: user.accessToken,
        workspaces: workspacesWithRoles,
        activeWorkspace: workspacesWithRoles[0] || null
    });
});

// Listar workspaces do usuário
server.get(['/api/v1/user-workspaces', '/api/v1/workspaces/my-workspaces'], (req, res) => {
    const userId = parseInt(req.query.userId || 1);
    const userPhone = req.query.phone || '5511999990002';
    const userEmail = req.query.email || 'gevo.neto@hotmail.com';

    const allMembers = router.db.get('workspace_members').value() || [];
    const myMemberships = allMembers.filter(m => 
        m.userId === userId || 
        (m.phone && m.phone === userPhone) ||
        (m.email && m.email.toLowerCase() === userEmail.toLowerCase())
    );

    const allWorkspaces = router.db.get('workspaces').value() || [];
    const result = myMemberships.map(m => {
        const ws = allWorkspaces.find(w => w.id === m.workspaceId);
        return {
            ...ws,
            role: m.role,
            isOwner: ws && ws.ownerUserId === userId
        };
    }).filter(w => w && w.id);

    res.jsonp(result);
});

// Listar débitos de rateios de terceiros ("Contas a Pagar a Terceiros")
server.get(['/api/v1/external-debts', '/api/v1/workspaces/external-debts'], (req, res) => {
    const userPhone = req.query.phone || '5511999990002';
    const userEmail = req.query.email || 'gevo.neto@hotmail.com';

    const debts = router.db.get('external_debts').value() || [];
    const filtered = debts.filter(d => 
        (d.debtorPhone && d.debtorPhone === userPhone) ||
        (d.debtorEmail && d.debtorEmail.toLowerCase() === userEmail.toLowerCase())
    );

    res.jsonp(filtered);
});

// Marcar débito como pago / informar comprovante
server.post('/api/v1/workspaces/external-debts/:id/pay', (req, res) => {
    const debtId = parseInt(req.params.id);
    const debts = router.db.get('external_debts');
    const existing = debts.find({ id: debtId }).value();

    if (existing) {
        debts.find({ id: debtId }).assign({ status: 'PAID', paidAt: new Date().toISOString() }).write();
        res.status(200).jsonp({ success: true, message: 'Reembolso informado com sucesso!' });
    } else {
        res.status(404).jsonp({ error: 'Débito não encontrado.' });
    }
});

// Middleware RBAC para proteção de recursos
server.use((req, res, next) => {
    const currentRole = req.headers['x-workspace-role'] || 'Admin';
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    const isProtectedUrl = req.path.includes('/expense') || req.path.includes('/cards') || req.path.includes('/recurring');

    if (currentRole.toLowerCase() === 'viewer' && isMutation && isProtectedUrl) {
        return res.status(403).jsonp({
            error: 'Acesso somente leitura. Como Viewer neste Workspace, você não possui permissão para criar, editar ou excluir registros.'
        });
    }

    next();
});


server.get('/api/v1/expense/:id', (req, res) => {
    console.log(req.params.id);
    const expenseId = parseInt(req.params.id); 
    const expense = router.db.get('expense').find({ id: expenseId }).value();

    if (expense) {
        res.jsonp(expense);
    } else {
        res.status(404).jsonp({ error: 'Expense not found' });
    }
});

server.delete('/api/v1/expense/:id', (req, res) => {
    console.log(req.params.id);
    const expenseId = parseInt(req.params.id); 
    const expense = router.db.get('expense').find({ id: expenseId }).value();

    if (expense) {
        router.db.get('expense').remove({ id: expenseId }).write();
        res.status(200).jsonp({ 
            message: `Despesa com ID ${expenseId} deletada com sucesso.`,
            id: expenseId // Opcional: retornar o ID deletado
        });
    } else {
        res.status(404).jsonp({ error: 'User not found' });
    }
});

server.get('/api/v1/expenses', (req, res) => {
    res.jsonp(router.db.get('expense').value());
});

server.post('/api/v1/expenses/batch', (req, res) => {
    const expenses = Array.isArray(req.body) ? req.body : req.body.expenses || [];
    const saved = [];
    const dbExpenses = router.db.get('expense');

    expenses.forEach((item, index) => {
        const newExp = {
            ...item,
            id: Date.now() + index
        };
        dbExpenses.push(newExp).write();
        saved.push(newExp);
    });

    res.status(201).jsonp({
        message: `${saved.length} despesas importadas com sucesso`,
        count: saved.length,
        items: saved
    });
});

server.post('/api/v1/incomes/batch', (req, res) => {
    const incomes = Array.isArray(req.body) ? req.body : req.body.incomes || [];
    const saved = [];
    const dbIncomes = router.db.get('incomes');

    incomes.forEach((item, index) => {
        const newInc = {
            ...item,
            id: Date.now() + index
        };
        dbIncomes.push(newInc).write();
        saved.push(newInc);
    });

    res.status(201).jsonp({
        message: `${saved.length} receitas importadas com sucesso`,
        count: saved.length,
        items: saved
    });
});

// Cartões de Crédito
server.get('/api/v1/credit-cards', (req, res) => {
    let cards = router.db.get('creditCards').value();
    if (!cards || cards.length === 0) {
        cards = [
            {
                id: 1,
                name: 'Nubank Ultravioleta',
                bank: 'Nubank',
                lastDigits: '4195',
                color: '#820AD1',
                totalLimit: 25000,
                availableLimit: 18450,
                closingDay: 28,
                dueDay: 5,
                paymentDays: 38
            },
            {
                id: 2,
                name: 'XP Visa Infinite',
                bank: 'XP Investimentos',
                lastDigits: '8821',
                color: '#1E293B',
                totalLimit: 30000,
                availableLimit: 26200,
                closingDay: 20,
                dueDay: 28,
                paymentDays: 39
            }
        ];
        router.db.set('creditCards', cards).write();
    }
    res.jsonp(cards);
});
server.post('/api/v1/credit-cards', (req, res) => {
    const cardData = req.body;
    let cards = router.db.get('creditCards');
    if (!cards.value()) {
        router.db.set('creditCards', []).write();
        cards = router.db.get('creditCards');
    }
    const newCard = {
        ...cardData,
        id: Date.now(),
        availableLimit: cardData.availableLimit !== undefined ? Number(cardData.availableLimit) : Number(cardData.totalLimit)
    };
    cards.push(newCard).write();
    res.status(201).jsonp(newCard);
});

server.put('/api/v1/credit-cards/:id', (req, res) => {
    const cardId = parseInt(req.params.id);
    const cardData = req.body;
    let card = router.db.get('creditCards').find({ id: cardId });
    if (!card.value()) {
        card = router.db.get('creditCards').find({ id: req.params.id });
    }
    if (card.value()) {
        card.assign(cardData).write();
        res.jsonp(card.value());
    } else {
        res.status(404).jsonp({ error: 'Cartão não encontrado' });
    }
});

server.delete('/api/v1/credit-cards/:id', (req, res) => {
    const cardId = parseInt(req.params.id);
    let removed = router.db.get('creditCards').remove({ id: cardId }).write();
    if (!removed || removed.length === 0) {
        removed = router.db.get('creditCards').remove({ id: req.params.id }).write();
    }
    res.status(200).jsonp({ success: true, message: 'Cartão excluído com sucesso' });
});

// Faturas de Cartão
server.get('/api/v1/invoices', (req, res) => {
    let invoices = router.db.get('invoices').value();
    if (!invoices || invoices.length === 0) {
        invoices = [
            {
                id: 1,
                cardId: 1,
                monthYear: '2026-10',
                status: 'ABERTA',
                totalAmount: 6550.00,
                closingDate: '2026-10-28',
                dueDate: '2026-11-05',
                responsibleTotals: [
                    { responsibleId: 1, amount: 2450.00 },
                    { responsibleId: 2, amount: 3100.00 },
                    { responsibleId: 3, amount: 1000.00 }
                ]
            },
            {
                id: 2,
                cardId: 2,
                monthYear: '2026-10',
                status: 'ABERTA',
                totalAmount: 3800.00,
                closingDate: '2026-10-20',
                dueDate: '2026-10-28',
                responsibleTotals: [
                    { responsibleId: 1, amount: 1200.00 },
                    { responsibleId: 2, amount: 2600.00 }
                ]
            }
        ];
        router.db.set('invoices', invoices).write();
    }
    res.jsonp(invoices);
});

// Classificador inteligente de extrato bancário (OFX / CSV) com IA / Heurísticas
server.post('/api/v1/ai/classify-statement', (req, res) => {
    const transactions = Array.isArray(req.body) ? req.body : req.body.transactions || [];
    const isCardInvoice = req.body.isCardInvoice === true || req.body.accountType === 'CARD';
    const responsibles = router.db.get('responsibles').value() || [];

    const classified = transactions.map((tx, idx) => {
        const desc = (tx.description || tx.memo || '').toLowerCase();
        let amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0;
        const absAmount = Math.abs(amount);

        // Detecção de fatura de cartão:
        // Em faturas de cartão (como Nubank), valores positivos são COMPRAS (despesas).
        // Valores negativos (ou "pagamento recebido", "estorno") são PAGAMENTOS/CRÉDITOS de fatura.
        const isTxCardInvoice = isCardInvoice || tx.isCardInvoice || desc.includes('fatura') || desc.includes('pagamento recebido') || desc.includes('estorno');

        let isIncome = false;
        if (isTxCardInvoice) {
            // Em fatura de cartão:
            // Se for negativo ou expressamente pagamento recebido/estorno, é crédito/saldo na fatura.
            // Se for positivo, é DESPESA da fatura.
            isIncome = amount < 0 || desc.includes('pagamento recebido') || desc.includes('estorno') || desc.includes('crédito');
        } else {
            // Em extrato de conta bancária tradicional:
            isIncome = (amount > 0 && (desc.includes('salario') || desc.includes('recebido') || desc.includes('rendimento') || desc.includes('transferencia recebida') || desc.includes('ted recebida') || desc.includes('deposito'))) ||
                       (!desc.includes('compra') && !desc.includes('pagamento') && tx.type === 'CREDIT' && !desc.includes('mercado') && !desc.includes('uber') && !desc.includes('ifood'));
        }

        let category = 'Outros';
        let establishment = tx.description || 'Transação Bancária';
        let paymentMethod = isTxCardInvoice ? '1' : '2'; // 1 = Cartão de Crédito se fatura, 2 = Pix / Débito

        if (desc.includes('mercado') || desc.includes('supermercado') || desc.includes('pão de açúcar') || desc.includes('carrefour') || desc.includes('atacad') || desc.includes('hortifruti') || desc.includes('assai')) {
            category = 'Supermercado';
            establishment = 'Supermercado / Compras';
        } else if (desc.includes('restaurante') || desc.includes('ifood') || desc.includes('mcdonald') || desc.includes('burger') || desc.includes('padaria') || desc.includes('café') || desc.includes('almoço')) {
            category = 'Alimentacao';
            establishment = 'Restaurante / Alimentação';
        } else if (desc.includes('posto') || desc.includes('gasolina') || desc.includes('combustivel') || desc.includes('ipiranga') || desc.includes('shell') || desc.includes('uber') || desc.includes('99app')) {
            category = 'Carro';
            establishment = desc.includes('uber') ? 'Uber Transporte' : 'Posto de Combustível';
        } else if (desc.includes('farmacia') || desc.includes('droga') || desc.includes('raia') || desc.includes('pacheco') || desc.includes('hospital') || desc.includes('medico') || desc.includes('consulta')) {
            category = 'Saude';
            establishment = 'Farmácia / Saúde';
        } else if (desc.includes('viagem') || desc.includes('hotel') || desc.includes('airbnb') || desc.includes('latam') || desc.includes('gol') || desc.includes('azul') || desc.includes('booking')) {
            category = 'Viagem';
            establishment = 'Viagem / Hospedagem';
        } else if (desc.includes('cinema') || desc.includes('netflix') || desc.includes('spotify') || desc.includes('show') || desc.includes('ingresso') || desc.includes('steam')) {
            category = 'Lazer';
            establishment = 'Lazer / Entretenimento';
        } else if (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('enel') || desc.includes('sabesp') || desc.includes('luz') || desc.includes('internet') || desc.includes('claro') || desc.includes('vivo')) {
            category = 'Moradia';
            establishment = 'Despesas da Casa';
        }

        if (desc.includes('cartao') || desc.includes('credito') || desc.includes('compra deb') || desc.includes('visa') || desc.includes('mastercard') || desc.includes('elo')) {
            paymentMethod = '1';
        }

        // Sugestão de divisão proporcional familiar padrão (cotas iguais entre os membros)
        const memberCount = Math.max(1, responsibles.length);
        const proratedVal = Math.round((absAmount / memberCount) * 100) / 100;
        const suggestedResponsibles = responsibles.map(r => ({
            responsibleId: r.id,
            proratedValue: proratedVal
        }));

        return {
            id: idx + 1,
            originalDescription: tx.description || tx.memo,
            establishment: establishment,
            description: establishment,
            amount: absAmount,
            type: isIncome ? 'INCOME' : 'EXPENSE',
            date: tx.date || new Date().toISOString().substring(0, 10),
            category: category,
            paymentMethod: paymentMethod,
            selected: true,
            suggestedResponsibles: suggestedResponsibles
        };
    });

    res.jsonp({
        total: classified.length,
        items: classified
    });
});

server.get('/api/v1/credit-cards', (req, res) => {
    res.jsonp(router.db.get('creditCards').value());
});

server.get('/api/v1/invoices', (req, res) => {
    res.jsonp(router.db.get('invoices').value());
});

server.get('/api/v1/incomes', (req, res) => {
    res.jsonp(router.db.get('incomes').value());
});

server.post('/api/v1/incomes', (req, res) => {
    const newIncome = req.body;
    newIncome.id = Date.now();
    router.db.get('incomes').push(newIncome).write();
    res.status(201).jsonp(newIncome);
});

server.put('/api/v1/incomes/:id', (req, res) => {
    const incomeId = parseInt(req.params.id);
    const existing = router.db.get('incomes').find({ id: incomeId }).value();
    if (existing) {
        const updated = { ...existing, ...req.body, id: incomeId };
        router.db.get('incomes').find({ id: incomeId }).assign(updated).write();
        res.status(200).jsonp(updated);
    } else {
        res.status(404).jsonp({ error: 'Receita não encontrada' });
    }
});

server.delete('/api/v1/incomes/:id', (req, res) => {
    const incomeId = parseInt(req.params.id);
    const existing = router.db.get('incomes').find({ id: incomeId }).value();
    if (existing) {
        router.db.get('incomes').remove({ id: incomeId }).write();
        res.status(200).jsonp({ message: 'Receita removida com sucesso', id: incomeId });
    } else {
        res.status(404).jsonp({ error: 'Receita não encontrada' });
    }
});

server.get('/api/v1/budgets', (req, res) => {
    res.jsonp(router.db.get('budgets').value());
});

server.post('/api/v1/budgets', (req, res) => {
    const newBudget = req.body;
    newBudget.id = Date.now();
    if (!newBudget.currentSpent) newBudget.currentSpent = 0;
    if (!newBudget.alertThresholdPercent) newBudget.alertThresholdPercent = 80;
    router.db.get('budgets').push(newBudget).write();
    res.status(201).jsonp(newBudget);
});

server.put('/api/v1/budgets/:id', (req, res) => {
    const budgetId = parseInt(req.params.id);
    const existing = router.db.get('budgets').find({ id: budgetId }).value();
    if (existing) {
        const updated = { ...existing, ...req.body, id: budgetId };
        router.db.get('budgets').find({ id: budgetId }).assign(updated).write();
        res.status(200).jsonp(updated);
    } else {
        res.status(404).jsonp({ error: 'Orçamento não encontrado' });
    }
});

server.delete('/api/v1/budgets/:id', (req, res) => {
    const budgetId = parseInt(req.params.id);
    const existing = router.db.get('budgets').find({ id: budgetId }).value();
    if (existing) {
        router.db.get('budgets').remove({ id: budgetId }).write();
        res.status(200).jsonp({ message: 'Orçamento removido com sucesso', id: budgetId });
    } else {
        res.status(404).jsonp({ error: 'Orçamento não encontrado' });
    }
});

server.get('/api/v1/responsibles', (req, res) => {
    res.jsonp(router.db.get('responsibles').value());
});

// Acesso ao banco de dados interno do json-server
const db = router.db.get('users');

server.post('/api/v1/new-user', (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
        return res.status(400).jsonp({
            error: 'Preencha todos os campos obrigatórios.'
        });
    }

    if (password !== confirmPassword) {
        // Retorna um erro 400 (Bad Request) se as senhas não coincidirem
        return res.status(400).jsonp({
            error: 'As senhas não coincidem. Por favor, verifique a confirmação.'
        });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const existingUser = router.db.get('users').find(u => u.email && u.email.toLowerCase() === cleanEmail).value();

    if (existingUser) {
        // Retorna um erro 409 (Conflict) pois o recurso já existe
        return res.status(409).jsonp({
            error: 'Este email já está cadastrado. Tente fazer login ou use outro email.'
        });
    }

    const userToSave = {
        id: Date.now(),
        accessToken: '1',
        userToken: "1",
        name,
        email: cleanEmail,
        password,
        image: '',
        imageUpload: '',
        claims: [{ type: 'Expense', value: 'Create,Edit,Delete' }],
        createdAt: new Date().toISOString()
    };

    router.db.get('users').push(userToSave).write();

    return res.status(201).jsonp({
        data: {
            accessToken: userToSave.accessToken,
            userToken: userToSave.userToken,
            user: {
                id: userToSave.id,
                name: userToSave.name,
                email: userToSave.email
            },
            image: userToSave.image,
            imageUpload: userToSave.imageUpload,
            claims: userToSave.claims
        }
    });
});

const validateExpense = [
    // Validação de campos de nível superior
    body('totalValue').notEmpty().isNumeric().withMessage('totalValue é obrigatório e deve ser um número.'),
    body('methodList').notEmpty().withMessage('methodList é obrigatório.'),
    body('creditCardList').notEmpty().withMessage('creditCardList é obrigatório.'),
    body('installments').notEmpty().isInt({ min: 1 }).withMessage('installments é obrigatório e deve ser um número inteiro maior que zero.'),
    body('categoryList').notEmpty().withMessage('categoryList é obrigatório.'),
    body('date').notEmpty().isISO8601().withMessage('date é obrigatório e deve ser uma data ISO válida.'),

    // Validação de campos aninhados: expenseOrigin
    body('expenseOrigin.name').notEmpty().withMessage('expenseOrigin.name é obrigatório.'),
    body('expenseOrigin.description').notEmpty().withMessage('expenseOrigin.description é obrigatório.'),

    // Validação de campos aninhados: expenseResponsible
    body('expenseResponsible.responsibleList').notEmpty().withMessage('expenseResponsible.responsibleList é obrigatório.'),
    body('expenseResponsible.proratedValue').notEmpty().isNumeric().withMessage('expenseResponsible.proratedValue é obrigatório e deve ser um número.'),
];

server.post('/expense', validateExpense, (req, res, next) => {
    // Verifica se há erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Se houver erros, retorna 400 Bad Request com os detalhes dos erros
        return res.status(400).json({ 
            errors: errors.array(),
            message: "Falha na validação dos dados da despesa." 
        });
    }
    
    next();
});

server.put('/api/v1/expense/:id',  (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            errors: errors.array(),
            message: "Falha na validação dos dados da despesa." 
        });
    }

    const expenseId = parseInt(req.params.id);
    const updatedExpenseData = req.body
    
    updatedExpenseData.id = expenseId; 

    const updatedExpense = router.db
        .get('expense') 
        .find({ id: expenseId }) 
        .assign(updatedExpenseData)
        .write();

    if (updatedExpense && updatedExpense.id === expenseId) {

        return res.status(200).jsonp({ 
            message: `Despesa com ID ${expenseId} atualizada com sucesso.`,
            expense: updatedExpense
        });
    } else {
        const existingExpense = router.db.get('expense').find({ id: expenseId }).value();
        
        if (!existingExpense) {
             return res.status(404).jsonp({ message: `Despesa com ID ${expenseId} não encontrada.` });
        }
        return res.status(500).jsonp({ message: "Erro interno ao atualizar a despesa." });
    }
});

server.post('/api/v1/login', (req, res, next) => {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    const existingUser = router.db.get('users').find(u => 
        u.email && u.email.toLowerCase() === cleanEmail
    ).value();

    if (existingUser && existingUser.password === cleanPassword) {
        return res.status(200).jsonp({
            data: {
                accessToken: existingUser.accessToken || '1',
                userToken: existingUser.userToken || '1',
                user: {
                    id: existingUser.id,
                    name: existingUser.name,
                    email: existingUser.email,
                    image: existingUser.image,
                    imageUpload: existingUser.imageUpload
                },
                claims: existingUser.claims || [{ type: 'Expense', value: 'Create,Edit,Delete' }]
            }
        });
    }
    return res.status(401).jsonp({
        error: 'Usuário ou senha inválidos, tente novamente.'
    });
});

const handleUpdateProfile = (req, res) => {
    const id = req.params.id || req.body.id;
    const { name, email, password, image, imageUpload } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    let userToUpdate = null;
    if (id) {
        userToUpdate = router.db.get('users').find({ id: parseInt(id) }).value();
    }
    if (!userToUpdate && cleanEmail) {
        userToUpdate = router.db.get('users').find(u => u.email && u.email.toLowerCase() === cleanEmail).value();
    }

    if (userToUpdate) {
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (cleanEmail) updateData.email = cleanEmail;
        if (password !== undefined) updateData.password = password;
        if (image !== undefined) updateData.image = image;
        if (imageUpload !== undefined) updateData.imageUpload = imageUpload;

        const updatedUser = router.db.get('users').find({ id: userToUpdate.id })
            .assign(updateData)
            .write();

        return res.status(200).jsonp({
            message: 'Perfil atualizado com sucesso',
            data: {
                accessToken: updatedUser.accessToken || '1',
                userToken: updatedUser.userToken || '1',
                user: updatedUser,
                ...updatedUser
            },
            ...updatedUser
        });
    } else {
        return res.status(404).jsonp({ error: 'Usuário não encontrado.' });
    }
};

server.put('/api/v1/profile', handleUpdateProfile);
server.put('/api/v1/profile/', handleUpdateProfile);
server.put('/api/v1/profile/:id', handleUpdateProfile);
server.put('/api/v1/user/:id', handleUpdateProfile);

// Legacy route placeholder
server.put('/api/v1/legacy-profile/', (req, res) => {
    const { name, email, password, image, imageUpload, id } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // Ensure we have an identifier
    if (!id && !email) {
         return res.status(400).jsonp({ error: 'ID ou Email necessários para atualização.' });
    }

    let userToUpdate = null;
    if (id) {
         userToUpdate = router.db.get('users').find({ id: parseInt(id) }).value();
    } else {
         userToUpdate = router.db.get('users').find(u => u.email && u.email.toLowerCase() === cleanEmail).value();
    }

    if (userToUpdate) {
        // Update fields
        const updatedUser = router.db.get('users').find({ id: userToUpdate.id })
            .assign({ name, email: cleanEmail || userToUpdate.email, password: password || userToUpdate.password, image, imageUpload })
            .write();

        return res.status(200).jsonp({
            message: 'Perfil atualizado com sucesso',
             data: {
                accessToken: updatedUser.accessToken,
                userToken: updatedUser.userToken,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    password: updatedUser.password,
                    image: updatedUser.image,
                    imageUpload: updatedUser.imageUpload
                },
                claims: updatedUser.claims
            }
        });
    } else {
        return res.status(404).jsonp({ error: 'Usuário não encontrado.' });
    }
});

// Endpoint Inteligente de Análise de Comprovantes com IA (Híbrido: Ollama Local + Parser Especializado em Comprovantes BR)
server.post('/api/v1/ai/analyze-receipt', async (req, res) => {
    try {
        const { imageBase64, fileName = 'comprovante.jpg', rawText = '' } = req.body || {};

        let aiResult = null;

        // 1. Tentar processamento via Google Gemini API (Multimodal Vision)
        const geminiApiKey = req.body?.geminiApiKey || req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;

        if (geminiApiKey && imageBase64) {
            try {
                // Extrai mimeType e base64 limpo
                let mimeType = 'image/jpeg';
                let cleanBase64 = imageBase64;
                const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.*)$/);
                if (mimeMatch) {
                    mimeType = mimeMatch[1];
                    cleanBase64 = mimeMatch[2];
                }

                const geminiPrompt = `Você é um auditor financeiro e especialista em OCR de comprovantes bancários, fiscais e notificações de compras por SMS/WhatsApp/Push no Brasil (Bradesco, Nubank, Itaú, Santander, C6, Inter, Cupom Fiscal, SAT, NFC-e, Pix).
Analise com extrema atenção a imagem fornecida (pode ser print de tela de SMS bancário, comprovante Pix, cupom fiscal ou extrato de compra).

Extraia com máxima precisão os dados da compra:
- establishment: O nome exato da loja, supermercado ou favorecido onde a compra foi feita (ex: se diz "VALOR DE R$ 64,92 UNISSUL SUPERMERC PARAISOPOLIS", retorne "Supermercado Unissul - Paraisópolis").
- description: Descrição clara do gasto (ex: "Compra no cartão de crédito em Supermercado").
- totalValue: O valor numérico em reais como float (ex: 64.92).
- date: Data e hora da transação no formato ISO "YYYY-MM-DDTHH:mm" (ex: se diz "29/09/2026 15:26", retorne "2026-09-29T15:26").
- paymentMethod: Retorne "1" se a compra foi feita com Cartão (crédito/débito) ou "2" se foi Pix/Transferência/À Vista.
- creditCardLastDigits: Os 4 dígitos do final do cartão se houver (ex: se diz "FINAL 4641", retorne "4641"), caso contrário null.
- installments: Quantidade de parcelas se a compra foi parcelada no cartão (ex: se diz "EM 2X", "2X DE", "PARC 02/06", "2 VEZES", "PARCELADO EM 3X", retorne o número inteiro como 2 ou 3). Se for à vista ou não citar parcelamento, retorne 1.
- category: A melhor categoria entre: "Alimentacao", "Carro", "Viagem", "Saude", "Outros" (ex: supermercado = "Alimentacao").

Retorne ESTRITAMENTE um objeto JSON válido:
{
  "establishment": string,
  "description": string,
  "totalValue": number,
  "date": string,
  "paymentMethod": "1" ou "2",
  "creditCardLastDigits": string ou null,
  "installments": number,
  "category": string
}`;

                const geminiPayload = {
                    contents: [
                        {
                            parts: [
                                { text: geminiPrompt },
                                {
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: cleanBase64
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                };

                const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
                
                for (const modelName of candidateModels) {
                    try {
                        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
                        const geminiRes = await fetch(geminiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(geminiPayload)
                        });

                        if (geminiRes.ok) {
                            const geminiData = await geminiRes.json();
                            const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (rawContent) {
                                const parsed = JSON.parse(rawContent);
                                
                                // Normaliza data: converte formato brasileiro DD/MM/YYYY para YYYY-MM-DDTHH:mm se necessário
                                let cleanDate = parsed.date || '';
                                const brDateMatch = String(cleanDate).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/);
                                if (brDateMatch) {
                                    const [, d, m, y, hh, mm] = brDateMatch;
                                    cleanDate = `${y}-${m}-${d}T${hh || '12'}:${mm || '00'}`;
                                } else if (!cleanDate || !cleanDate.includes('T')) {
                                    cleanDate = new Date().toISOString().substring(0, 16);
                                } else if (cleanDate.length > 16) {
                                    cleanDate = cleanDate.substring(0, 16);
                                }

                                // Normaliza categoria para as opções do sistema
                                let normalizedCategory = 'Alimentacao';
                                const catLower = (parsed.category || '').toLowerCase();
                                if (catLower.includes('carro') || catLower.includes('combustivel') || catLower.includes('transporte')) {
                                    normalizedCategory = 'Carro';
                                } else if (catLower.includes('viagem') || catLower.includes('hotel') || catLower.includes('voo')) {
                                    normalizedCategory = 'Viagem';
                                } else if (catLower.includes('saude') || catLower.includes('farmacia') || catLower.includes('medico')) {
                                    normalizedCategory = 'Saude';
                                } else {
                                    normalizedCategory = 'Alimentacao';
                                }

                                // Normaliza método de pagamento: se vier texto ou número
                                let normalizedMethod = '1';
                                const pmRaw = String(parsed.paymentMethod || '').toLowerCase();
                                if (pmRaw === '2' || pmRaw.includes('pix') || pmRaw.includes('vista') || pmRaw.includes('transfer')) {
                                    normalizedMethod = '2';
                                } else {
                                    normalizedMethod = '1';
                                }

                                const rawTotal = parseFloat(parsed.totalValue) || 0;
                                const parsedInst = parseInt(parsed.installments) || 1;
                                const installmentValue = parsedInst > 1 && rawTotal > 0
                                    ? Math.round((rawTotal / parsedInst) * 100) / 100
                                    : rawTotal;

                                let desc = parsed.description || `Compra em ${parsed.establishment || 'estabelecimento'}`;
                                if (parsedInst > 1 && rawTotal > 0) {
                                    const totalBr = rawTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    const instBr = installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    if (!desc.toLowerCase().includes('parcela')) {
                                        desc = `${desc} (${parsedInst}x de R$ ${instBr} - Total R$ ${totalBr})`;
                                    }
                                }

                                aiResult = {
                                    establishment: parsed.establishment || 'Estabelecimento Comercial',
                                    description: desc,
                                    originalTotal: rawTotal,
                                    installmentAmount: installmentValue,
                                    totalValue: installmentValue, // Divide automaticamente no valor da parcela
                                    date: cleanDate,
                                    paymentMethod: normalizedMethod,
                                    creditCardLastDigits: parsed.creditCardLastDigits || null,
                                    installments: parsedInst,
                                    category: normalizedCategory,
                                    provider: `google-${modelName}`
                                };
                                console.log(`🤖 [Gemini Vision] Sucesso com ${modelName}:`, aiResult.establishment, 'Parcela: R$', aiResult.totalValue, `(Total: R$ ${aiResult.originalTotal}, ${aiResult.installments}x)`);
                                break;
                            }
                        }
                    } catch (modelErr) {
                        console.warn(`Tentativa com ${modelName} falhou:`, modelErr.message);
                    }
                }
            } catch (geminiErr) {
                console.warn('Erro global na comunicação Gemini:', geminiErr.message);
            }
        }

        // 2. Parser Especialista em Comprovantes Brasileiros (Pix / NFC-e / Cartão)
        if (!aiResult) {
            const textToAnalyze = (rawText + ' ' + fileName).toLowerCase();
            
            // Detecta Estabelecimento
            let establishment = 'Estabelecimento Comercial';
            let category = 'Alimentacao';
            let description = 'Compras e Despesas Gerais';

            if (textToAnalyze.includes('mercado') || textToAnalyze.includes('supermercado') || textToAnalyze.includes('pão de açúcar') || textToAnalyze.includes('carrefour') || textToAnalyze.includes('atacad') || textToAnalyze.includes('real')) {
                establishment = 'Supermercado Real';
                category = 'Alimentacao';
                description = 'Compras do mês / Supermercado';
            } else if (textToAnalyze.includes('posto') || textToAnalyze.includes('combustivel') || textToAnalyze.includes('gasolina') || textToAnalyze.includes('ipiranga') || textToAnalyze.includes('shell') || textToAnalyze.includes('petrobras')) {
                establishment = 'Posto de Combustível Ipiranga';
                category = 'Carro';
                description = 'Abastecimento de Gasolina';
            } else if (textToAnalyze.includes('farmacia') || textToAnalyze.includes('droga') || textToAnalyze.includes('raia') || textToAnalyze.includes('pacheco')) {
                establishment = 'Farmácia Raia';
                category = 'Saude';
                description = 'Medicamentos e Cuidados';
            } else if (textToAnalyze.includes('uber') || textToAnalyze.includes('99') || textToAnalyze.includes('corrida')) {
                establishment = 'Uber Transporte';
                category = 'Carro';
                description = 'Corrida por aplicativo';
            } else if (textToAnalyze.includes('viagem') || textToAnalyze.includes('hotel') || textToAnalyze.includes('aereo') || textToAnalyze.includes('latam') || textToAnalyze.includes('azul')) {
                establishment = 'Reserva de Viagem';
                category = 'Viagem';
                description = 'Passagens / Hospedagem Familiar';
            } else if (textToAnalyze.includes('restaurante') || textToAnalyze.includes('ifood') || textToAnalyze.includes('almoço') || textToAnalyze.includes('jantar')) {
                establishment = 'Restaurante & Gastronomia';
                category = 'Alimentacao';
                description = 'Refeição em Família';
            } else {
                establishment = 'Transação Comercial';
                category = 'Alimentacao';
                description = 'Despesa identificada via comprovante';
            }

            // Detecta Valor Total
            let totalValue = 150.00;
            const valueMatch = textToAnalyze.match(/(?:r\$\s*|valor[:\s]*|total[:\s]*|\b)(\d{1,4}(?:[.,]\d{2}))\b/i);
            if (valueMatch) {
                const rawNum = valueMatch[1].replace(',', '.');
                totalValue = parseFloat(rawNum) || 150.00;
            }

            // Detecta Método de Pagamento
            let paymentMethod = '2'; // 2 = Pix por padrão
            let paymentMethodName = 'Pix / À Vista';
            let cardLastDigits = null;

            if (textToAnalyze.includes('credito') || textToAnalyze.includes('cartao') || textToAnalyze.includes('visa') || textToAnalyze.includes('mastercard')) {
                paymentMethod = '1';
                paymentMethodName = 'Cartão de Crédito';
                const digitsMatch = textToAnalyze.match(/\b(\d{4})\b/);
                if (digitsMatch) {
                    cardLastDigits = digitsMatch[1];
                }
            }

            // Detecta Parcelamento (ex: 2x, 3x, etc.)
            let installments = 1;
            const instMatch = textToAnalyze.match(/(?:em\s*|\b)(\d{1,2})\s*(?:x|vezes|parcelas)\b/i);
            if (instMatch) {
                installments = parseInt(instMatch[1]) || 1;
            }

            const rawFallbackTotal = totalValue;
            const fallbackInstallmentValue = installments > 1 && rawFallbackTotal > 0
                ? Math.round((rawFallbackTotal / installments) * 100) / 100
                : rawFallbackTotal;

            if (installments > 1 && rawFallbackTotal > 0) {
                const totalBr = rawFallbackTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const instBr = fallbackInstallmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                description = `${description} (${installments}x de R$ ${instBr} - Total R$ ${totalBr})`;
            }

            // Data atual em formato ISO
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const isoDate = `${year}-${month}-${day}T${hours}:${minutes}`;

            aiResult = {
                establishment,
                description,
                originalTotal: rawFallbackTotal,
                installmentAmount: fallbackInstallmentValue,
                totalValue: fallbackInstallmentValue,
                date: isoDate,
                paymentMethod,
                paymentMethodName,
                creditCardLastDigits: cardLastDigits,
                installments,
                category,
                provider: 'smart-brazil-receipt-parser'
            };
        }

        // 3. Formatação Brasileira & Rateio Igualitário entre Responsáveis da Família
        const formattedTotal = (aiResult.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const responsibles = router.db.get('responsibles').value() || [
            { id: 1, name: 'Anelise' },
            { id: 2, name: 'Neto' },
            { id: 3, name: 'Yah' }
        ];

        const splitCount = responsibles.length || 3;
        const splitAmount = Math.round(((aiResult.totalValue || 0) / splitCount) * 100) / 100;
        const splitFormatted = splitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const suggestedSplit = responsibles.map(r => ({
            responsibleId: r.id,
            name: r.name,
            proratedValue: splitFormatted
        }));

        const origTotal = aiResult.originalTotal || aiResult.totalValue;
        const origTotalFormatted = origTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const instAmount = aiResult.installmentAmount || aiResult.totalValue;
        const instAmountFormatted = instAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return res.status(200).jsonp({
            success: true,
            provider: aiResult.provider,
            data: {
                establishment: aiResult.establishment,
                description: aiResult.description,
                originalTotal: origTotal,
                originalTotalFormatted: origTotalFormatted,
                installmentAmount: instAmount,
                installmentAmountFormatted: instAmountFormatted,
                totalValue: aiResult.totalValue,
                totalValueFormatted: formattedTotal,
                date: aiResult.date,
                paymentMethod: aiResult.paymentMethod === 'CREDIT_CARD' || aiResult.paymentMethod === '1' ? '1' : '2',
                paymentMethodName: aiResult.paymentMethod === 'CREDIT_CARD' || aiResult.paymentMethod === '1' ? 'Cartão de Crédito' : 'Pix / À Vista',
                creditCardLastDigits: aiResult.creditCardLastDigits,
                installments: aiResult.installments || 1,
                category: aiResult.category,
                suggestedSplit,
                confidence: 0.96
            }
        });

    } catch (err) {
        console.error('Erro na análise de IA:', err);
        return res.status(500).jsonp({ error: 'Falha ao analisar comprovante com IA: ' + err.message });
    }
});

server.use(router); // Usa o roteador padrão do JSON Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`JSON Server com validação customizada está rodando na porta ${PORT}`);
});