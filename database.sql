-- Script SQL para o Banco de Dados Facilitou

-- 1. Tabela de Usuários (Inclui campos de perfil detalhados)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    province TEXT,
    municipality TEXT,
    gender TEXT CHECK(gender IN ('MASCULINO', 'FEMININO', 'OUTRO')),
    description TEXT,
    foto TEXT,
    type TEXT DEFAULT 'CLIENT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Serviços/Anúncios
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    preco TEXT,
    localizacao TEXT NOT NULL,
    imagens TEXT, -- Armazenado como JSON ou string separada por vírgulas
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. Tabela de Mensagens (Chat)
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- 4. Tabela de Avaliações
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nota INTEGER CHECK(nota >= 1 AND nota <= 5),
    comentario TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
