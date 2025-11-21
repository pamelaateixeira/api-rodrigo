// ============================================
// API RODRIGO RIBEIRO - VERSÃO COMPLETA
// Com autenticação, produtos, livros e visão computacional
// ============================================

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuração
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'sua_chave_secreta_super_segura_aqui';

// Banco de dados simulado (em memória)
const usuarios = [];
const produtos = [
  { id: 1, descricao: 'Teclado Mecânico TKL', valor: 349.90 },
  { id: 2, descricao: 'Mouse Gamer 7200dpi', valor: 129.00 },
  { id: 3, descricao: 'Monitor 24\' IPS', valor: 899.00 },
  { id: 4, descricao: 'Headset USB com Microfone', valor: 199.90 },
  { id: 5, descricao: 'SSD NVMe 1TB', valor: 499.00 }
];

const livros = [
  { id: 1, titulo: 'Introdução a APIs REST com Python', resumo: 'resumo do livro', capa: 'https://via.placeholder.com/200x300?text=REST+API', valor: 59.90 },
  { id: 2, titulo: 'Flask na Prática', resumo: 'resumo do livro', capa: 'https://via.placeholder.com/200x300?text=Flask', valor: 69.90 },
  { id: 3, titulo: 'SQL para Iniciantes', resumo: 'resumo do livro', capa: 'https://via.placeholder.com/200x300?text=SQL', valor: 49.90 },
  { id: 4, titulo: 'JWT e Autenticação Web', resumo: 'resumo do livro', capa: 'https://via.placeholder.com/200x300?text=JWT', valor: 39.90 },
  { id: 5, titulo: 'Processamento de Imagens com Python', resumo: 'resumo do livro', capa: 'https://via.placeholder.com/200x300?text=Imagens', valor: 79.90 }
];

let proximoProdutoId = 6;
let proximoLivroId = 6;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função para responder no padrão da API do Rodrigo
function resposta(statusCode, success, message, response = null) {
  return {
    status_code: statusCode,
    success: success,
    message: message,
    response: response
  };
}

// Hash simples de senha
function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

// Gerar JWT
function gerarToken(id, email) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    id: id,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  })).toString('base64');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${header}.${payload}.${signature}`;
}

// Verificar JWT
function verificarToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) return null;
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    
    return decoded;
  } catch (erro) {
    return null;
  }
}

// Parse do body
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(data);
    } catch (erro) {
      callback(null);
    }
  });
}

// ============================================
// ENDPOINTS DE AUTENTICAÇÃO
// ============================================

function handleRegistrar(req, res, data) {
  const { email, senha } = data;

  if (!email || !senha) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(400, false, 'Email e senha são obrigatórios')));
    return;
  }

  if (usuarios.find(u => u.email === email)) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(409, false, 'Email já registrado')));
    return;
  }

  const novoUsuario = {
    id: usuarios.length + 1,
    email: email,
    senha: hashSenha(senha),
    dataCriacao: new Date().toISOString()
  };

  usuarios.push(novoUsuario);

  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(201, true, 'Usuário registrado com sucesso', {
    id: novoUsuario.id,
    email: novoUsuario.email
  })));
}

function handleLogin(req, res, data) {
  const { email, senha } = data;

  if (!email || !senha) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(400, false, 'Email e senha são obrigatórios')));
    return;
  }

  const usuario = usuarios.find(u => u.email === email);
  if (!usuario) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(401, false, 'Email ou senha inválidos')));
    return;
  }

  if (usuario.senha !== hashSenha(senha)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(401, false, 'Email ou senha inválidos')));
    return;
  }

  const token = gerarToken(usuario.id, usuario.email);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(200, true, 'Login efetuado', {
    token: token,
    expires_in_minutes: 1440
  })));
}

// ============================================
// ENDPOINTS DE PRODUTOS
// ============================================

function handleGetProdutos(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(200, true, 'Lista de produtos', produtos)));
}

function handleGetProduto(req, res, queryParams) {
  const id = parseInt(queryParams.id);
  const produto = produtos.find(p => p.id === id);

  if (!produto) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(404, false, 'Produto não encontrado')));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(200, true, 'Produto encontrado', produto)));
}

function handleCadastrarProduto(req, res, data, usuarioId) {
  if (!usuarioId) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(401, false, 'Token não fornecido')));
    return;
  }

  const { descricao, valor } = data;

  if (!descricao || valor === undefined) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(400, false, 'Descrição e valor são obrigatórios')));
    return;
  }

  const novoProduto = {
    id: proximoProdutoId++,
    descricao: descricao,
    valor: parseFloat(valor)
  };

  produtos.push(novoProduto);

  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(201, true, 'Produto cadastrado com sucesso', novoProduto)));
}

// ============================================
// ENDPOINTS DE LIVROS
// ============================================

function handleGetLivros(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(200, true, 'Lista de livros', livros)));
}

function handleGetLivro(req, res, queryParams) {
  const id = parseInt(queryParams.id);
  const livro = livros.find(l => l.id === id);

  if (!livro) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(404, false, 'Livro não encontrado')));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(200, true, 'Livro encontrado', livro)));
}

function handleCadastrarLivro(req, res, data, usuarioId) {
  if (!usuarioId) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(401, false, 'Token não fornecido')));
    return;
  }

  const { titulo, resumo, capa, valor } = data;

  if (!titulo || !resumo || !capa || valor === undefined) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(400, false, 'Título, resumo, capa e valor são obrigatórios')));
    return;
  }

  const novoLivro = {
    id: proximoLivroId++,
    titulo: titulo,
    resumo: resumo,
    capa: capa,
    valor: parseFloat(valor)
  };

  livros.push(novoLivro);

  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(201, true, 'Livro cadastrado com sucesso', novoLivro)));
}

// ============================================
// ENDPOINTS DE VISÃO COMPUTACIONAL
// ============================================

function handleClassificar(req, res, data, usuarioId) {
  if (!usuarioId) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(401, false, 'Token não fornecido')));
    return;
  }

  const { image } = data;

  if (!image) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(400, false, 'Imagem é obrigatória')));
    return;
  }

  // Simulação de classificação
  const classes = ['cat', 'dog', 'bird', 'car', 'person'];
  const randomClass = classes[Math.floor(Math.random() * classes.length)];
  const randomScore = (Math.random() * 0.5 + 0.5).toFixed(3);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(200, true, 'Classificação realizada', {
    class: randomClass,
    score: parseFloat(randomScore)
  })));
}

function handleDetectar(req, res, data, usuarioId) {
  if (!usuarioId) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(401, false, 'Token não fornecido')));
    return;
  }

  const { image, preview } = data;

  if (!image) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(resposta(400, false, 'Imagem é obrigatória')));
    return;
  }

  // Simulação de detecção
  const objects = [
    { class: 'person', boundingbox: { xywh: [10, 20, 100, 150], xyxy: [10, 20, 110, 170] }, score: 0.95 },
    { class: 'phone', boundingbox: { xywh: [150, 50, 80, 120], xyxy: [150, 50, 230, 170] }, score: 0.87 }
  ];

  const resultado = {
    objects: objects,
    preview_img: preview ? 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : null
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(200, true, 'Detecção realizada', resultado)));
}

// ============================================
// SERVIDOR HTTP
// ============================================

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const queryParams = parsedUrl.query;

  // Extrair token
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  const usuarioId = token ? verificarToken(token)?.id : null;

  // GET /
  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      mensagem: 'API Rodrigo Ribeiro',
      endpoints: {
        autenticacao: {
          registrar: 'POST /registrar',
          login: 'POST /login'
        },
        produtos: {
          listar: 'GET /produtos',
          buscar: 'GET /produto?id=1',
          cadastrar: 'POST /produto/cadastrar (requer token)'
        },
        livros: {
          listar: 'GET /livros',
          buscar: 'GET /livro?id=1',
          cadastrar: 'POST /livro/cadastrar (requer token)'
        },
        visao_computacional: {
          classificar: 'POST /classificar (requer token)',
          detectar: 'POST /detectar (requer token)'
        }
      }
    }));
    return;
  }

  // POST /registrar
  if (pathname === '/registrar' && req.method === 'POST') {
    parseBody(req, (data) => {
      if (data === null) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resposta(400, false, 'JSON inválido')));
      } else {
        handleRegistrar(req, res, data);
      }
    });
    return;
  }

  // POST /login
  if (pathname === '/login' && req.method === 'POST') {
    parseBody(req, (data) => {
      if (data === null) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resposta(400, false, 'JSON inválido')));
      } else {
        handleLogin(req, res, data);
      }
    });
    return;
  }

  // GET /produtos
  if (pathname === '/produtos' && req.method === 'GET') {
    handleGetProdutos(req, res);
    return;
  }

  // GET /produto
  if (pathname === '/produto' && req.method === 'GET') {
    handleGetProduto(req, res, queryParams);
    return;
  }

  // POST /produto/cadastrar
  if (pathname === '/produto/cadastrar' && req.method === 'POST') {
    parseBody(req, (data) => {
      if (data === null) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resposta(400, false, 'JSON inválido')));
      } else {
        handleCadastrarProduto(req, res, data, usuarioId);
      }
    });
    return;
  }

  // GET /livros
  if (pathname === '/livros' && req.method === 'GET') {
    handleGetLivros(req, res);
    return;
  }

  // GET /livro
  if (pathname === '/livro' && req.method === 'GET') {
    handleGetLivro(req, res, queryParams);
    return;
  }

  // POST /livro/cadastrar
  if (pathname === '/livro/cadastrar' && req.method === 'POST') {
    parseBody(req, (data) => {
      if (data === null) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resposta(400, false, 'JSON inválido')));
      } else {
        handleCadastrarLivro(req, res, data, usuarioId);
      }
    });
    return;
  }

  // POST /classificar
  if (pathname === '/classificar' && req.method === 'POST') {
    parseBody(req, (data) => {
      if (data === null) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resposta(400, false, 'JSON inválido')));
      } else {
        handleClassificar(req, res, data, usuarioId);
      }
    });
    return;
  }

  // POST /detectar
  if (pathname === '/detectar' && req.method === 'POST') {
    parseBody(req, (data) => {
      if (data === null) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resposta(400, false, 'JSON inválido')));
      } else {
        handleDetectar(req, res, data, usuarioId);
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(resposta(404, false, 'Rota não encontrada')));
});

server.listen(PORT, () => {
  console.log(`\n✅ API Rodrigo Ribeiro rodando em http://localhost:${PORT}`);
  console.log(`\n📚 Endpoints disponíveis:`);
  console.log(`\n   AUTENTICAÇÃO:`);
  console.log(`   POST   /registrar`);
  console.log(`   POST   /login`);
  console.log(`\n   PRODUTOS:`);
  console.log(`   GET    /produtos`);
  console.log(`   GET    /produto?id=1`);
  console.log(`   POST   /produto/cadastrar (requer token)`);
  console.log(`\n   LIVROS:`);
  console.log(`   GET    /livros`);
  console.log(`   GET    /livro?id=1`);
  console.log(`   POST   /livro/cadastrar (requer token)`);
  console.log(`\n   VISÃO COMPUTACIONAL:`);
  console.log(`   POST   /classificar (requer token)`);
  console.log(`   POST   /detectar (requer token)\n`);
});