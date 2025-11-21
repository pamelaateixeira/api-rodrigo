# api-rodrigo

Uma implementação completa da API Rodrigo Ribeiro usando Node.js.

## Como Rodar
1. Abra o terminal na pasta do projeto
2. Digite: `node server.js`
3. O servidor vai rodar em http://localhost:3000

## Endpoints

### Autenticação
- POST /registrar - Registrar novo usuário
- POST /login - Fazer login

### Produtos
- GET /produtos - Listar todos os produtos
- GET /produto?id=1 - Buscar um produto
- POST /produto/cadastrar - Cadastrar novo produto (requer token )

### Livros
- GET /livros - Listar todos os livros
- GET /livro?id=1 - Buscar um livro
- POST /livro/cadastrar - Cadastrar novo livro (requer token)

### Visão Computacional
- POST /classificar - Classificar uma imagem (requer token)
- POST /detectar - Detectar objetos em uma imagem (requer token)

## Como Testar
Use o Postman para testar os endpoints:

1. **Registrar:**
   - POST http://localhost:3000/registrar
   - Body: {"email":"usuario@exemplo.com","senha":"123456"}

2. **Login:**
   - POST http://localhost:3000/login
   - Body: {"email":"usuario@exemplo.com","senha":"123456"}
   - Copie o token da resposta

3. **Usar token:**
   - Adicione no header: Authorization: Bearer TOKEN

## Tecnologias

- Node.js
- HTTP nativo (sem dependências externas )
- JWT para autenticação
- Banco de dados em memória
