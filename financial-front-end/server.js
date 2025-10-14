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
        createdAt: new Date().toISOString()
    };

    // Anexa a requisição com o objeto final
    req.body = userToSave;

    // Mapeia a requisição para a coleção 'users' do JSON Server para que ele salve
    req.url = '/users';

    const newUser = db.insert(userToSave).write();
    return res.status(201).jsonp({
        data: {
            accessToken: userToSave.accessToken,
            userToken: userToSave.userToken,
            user: {
                name: userToSave.name,
                email: userToSave.email
            }
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
                    name: existingUser.name,
                    email: existingUser.email
                }
            }
        });
    }
    return res.status(409).jsonp({
        error: 'Usuario ou senha inválidos, tente novamente.'
    });
    // next();

});

server.use(router); // Usa o roteador padrão do JSON Server
server.listen(3000, () => {
    console.log('JSON Server com validação customizada está rodando na porta 3000');
});