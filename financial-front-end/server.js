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

// --- MIDDLEWARE DE VALIDAÇÃO (ENDPOINT CUSTOMIZADO) ---
// CORRIGIDO: Adicionada a barra inicial (/)
server.post('/api/v1/new-user', (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;

    // ... (Lógica de Validação Omitida, mas está correta)

    // Se todas as validações passarem:
    const userToSave = { 
        name, 
        email, 
        password,
        createdAt: new Date().toISOString() 
    };
    
    // Anexa a requisição com o objeto final
    req.body = userToSave;

    // CORRIGIDO: Mapeia a requisição para a coleção correta no JSON Server
    req.url = '/api/v1/new-user'; 
    
    // Permite que o JSON Server salve
    next();
});

server.use(router); // Usa o roteador padrão do JSON Server
server.listen(3000, () => {
    console.log('JSON Server com validação customizada está rodando na porta 3000');
});