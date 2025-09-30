// server.js

const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser); // Essencial para ler o corpo (body) do POST

// --- ROTA GET: BUSCAR TODOS OS USUÁRIOS ---
server.get('/api/v1/user', (req, res) => {
    // CORRIGIDO: Busca na coleção 'users'
    res.jsonp(router.db.get('users').value());
});

// Acesso ao banco de dados interno do json-server
const db = router.db.get('users');

server.post('/api/v1/new-user', (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;

    // -----------------------------------------------------
    // 1. VALIDAÇÃO DE SENHAS (Passa/Não Passa)
    // -----------------------------------------------------
    if (password !== confirmPassword) {
        // Retorna um erro 400 (Bad Request)
        return res.status(400).jsonp({
            error: 'As senhas não coincidem. Por favor, verifique a confirmação.'
        });
    }

    // -----------------------------------------------------
    // 2. VERIFICAÇÃO DE DUPLICIDADE (Email)
    // -----------------------------------------------------
    const existingUser = db.find({ email: email }).value();

    if (existingUser) {
        // Retorna um erro 409 (Conflict) pois o recurso já existe
        return res.status(409).jsonp({
            error: 'Este email já está cadastrado. Tente fazer login ou use outro email.'
        });
    }
    
    const userToSave = { 
        // Não inclua 'confirmPassword' no objeto final
        name, 
        email, 
        password, // Em um ambiente real, você faria o HASH dessa senha!
        createdAt: new Date().toISOString() 
    };
    
    // Anexa a requisição com o objeto final
    req.body = userToSave;

    // Mapeia a requisição para a coleção 'users' do JSON Server para que ele salve
    req.url = '/users'; 
    
    // Permite que o JSON Server salve
    next();
});

server.use(router); // Usa o roteador padrão do JSON Server
server.listen(3000, () => {
    console.log('JSON Server com validação customizada está rodando na porta 3000');
});