export type UserType = 'CLIENT' | 'PROVIDER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  province?: string;
  municipality?: string;
  gender?: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  description?: string;
  type: UserType;
  foto?: string;
  localizacao?: string;
}

export interface Service {
  id: string;
  userId: string;
  titulo: string;
  descricao: string;
  categoria: string;
  preco?: string;
  localizacao: string;
  imagens: string[];
  telefone?: string;
  whatsapp?: string;
  infoAdicional?: string;
  disponibilidade?: string;
  avaliacoesMedia?: number;
  createdAt?: string;
}

export interface PropertyListing {
  id: string;
  userId: string;
  tipo: 'CASA' | 'TERRENO' | 'APARTAMENTO' | 'QUARTO';
  preco: string;
  localizacao: string;
  descricao: string;
  fotos: string[];
  contacto: string;
}

export interface TransportListing {
  id: string;
  userId: string;
  tipo: 'MOTOTAXI' | 'TAXI' | 'ENTREGA' | 'MUDANCA';
  localizacao: string;
  disponibilidade: string;
  preco?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  mensagem: string;
  timestamp: string;
  createdAt?: string;
}

export interface Review {
  id: string;
  serviceId: string;
  userId: string;
  nota: number;
  comentario: string;
}
