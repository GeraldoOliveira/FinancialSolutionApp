// server.js

const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const { body, validationResult } = require('express-validator');

server.use(middlewares);
server.use(jsonServer.bodyParser); // Essencial para ler o corpo (body) do POST

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

// Acesso ao banco de dados interno do json-server
const db = router.db.get('users');

server.post('/api/v1/new-user', (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        // Retorna um erro 400 (Bad Request) se as senhas não coincidirem
        return res.status(400).jsonp({
            error: 'As senhas não coincidem. Por favor, verifique a confirmação.'
        });
    }

    const existingUser = db.find({ email: email }).value();

    if (existingUser) {
        // Retorna um erro 409 (Conflict) pois o recurso já existe
        return res.status(409).jsonp({
            error: 'Este email já está cadastrado. Tente fazer login ou use outro email.'
        });
    }

    const userToSave = {
        accessToken: '1', // Gera um token único
        userToken: "1",
        name,
        email,
        password,
        image: '',
        imageUpload: '',
        claims: [],
        createdAt: new Date().toISOString()
    };

    // Anexa a requisição com o objeto final
    req.body = userToSave;

    // Mapeia a requisição para a coleção 'users' do JSON Server para que ele salve
    req.url = '/users';

    const newUser = db.insert(userToSave).write();
    return res.status(201).jsonp({
        data: {
            accessToken: newUser.accessToken,
            userToken: newUser.userToken,
            user: {
                name: newUser.name,
                email: newUser.email
            },
            image: newUser.image,
            imageUpload: newUser.imageUpload,
            claims: newUser.claims
        }
    });
    // next();

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

    const existingUser = db.find({ email: email }).value();

    if (existingUser && existingUser.password === password) {
        // Retorna um erro 409 (Conflict) pois o recurso já existe
        return res.status(200).jsonp({
            data: {
                accessToken: existingUser.accessToken,
                userToken: existingUser.userToken,
                user: {
                    id: existingUser.id,
                    name: existingUser.name,
                    email: existingUser.email,
                    image: existingUser.image,
                imageUpload: existingUser.imageUpload
                },
                claims: existingUser.claims,
                
            }
        });
    }
    return res.status(409).jsonp({
        error: 'Usuario ou senha inválidos, tente novamente.'
    });
    // next();

});

server.put('/api/v1/profile/', (req, res) => {
    const { name, email, password, image, imageUpload, id } = req.body;
    
    // Find user by ID or Email (assuming email is unique and ID is present)
    // Using ID is safer if available in the body
    let userToUpdate = null;
    
    // Ensure we have an identifier
    if (!id && !email) {
         return res.status(400).jsonp({ error: 'ID ou Email necessários para atualização.' });
    }

    if (id) {
         userToUpdate = db.find({ id: parseInt(id) }).value();
    } else {
         userToUpdate = db.find({ email: email }).value();
    }

    if (userToUpdate) {
        // Update fields
        const updatedUser = db.find({ id: userToUpdate.id })
            .assign({ name, email, password, image, imageUpload }) // Add other fields as needed
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

server.use(router); // Usa o roteador padrão do JSON Server
server.listen(3000, () => {
    console.log('JSON Server com validação customizada está rodando na porta 3000');
});