import { User, Service, Message } from '../types';

// O API Service agora usa o nosso servidor intermediário (Proxy) para maior estabilidade
export const api = {
  profiles: {
    get: async (id: string): Promise<User> => {
      try {
        const res = await fetch(`/api/profiles/${id}`);
        if (!res.ok) {
          const info = await res.text().catch(() => 'No detail');
          throw new Error(`Erro ao carregar perfil (${res.status}): ${info}`);
        }
        const data = await res.json();
        return {
          id: data.id,
          name: data.full_name,
          email: data.email,
          phone: data.phone,
          province: data.province,
          municipality: data.municipality,
          gender: data.gender,
          description: data.description,
          type: data.type || 'CLIENT',
          foto: data.avatar_url
        };
      } catch (err) {
        console.error(`Erro ao buscar perfil ${id}:`, err);
        throw err;
      }
    }
  },
  services: {
    list: async (): Promise<Service[]> => {
      const res = await fetch('/api/services');
      if (!res.ok) throw new Error('Erro ao carregar serviços');
      const data = await res.json();
      return data.map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        titulo: s.titulo,
        descricao: s.descricao,
        categoria: s.categoria,
        preco: s.preco,
        localizacao: s.localizacao,
        imagens: s.imagens || [],
        telefone: s.telefone,
        whatsapp: s.whatsapp,
        infoAdicional: s.info_adicional,
        createdAt: s.created_at
      }));
    },
    create: async (service: Omit<Service, 'id'>): Promise<Service> => {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: service.userId,
          titulo: service.titulo,
          descricao: service.descricao,
          categoria: service.categoria,
          preco: service.preco,
          localizacao: service.localizacao,
          imagens: service.imagens,
          telefone: service.telefone,
          whatsapp: service.whatsapp,
          info_adicional: service.infoAdicional
        })
      });
      if (!res.ok) throw new Error('Erro ao criar serviço');
      const data = await res.json();
      return {
        id: data.id,
        userId: data.user_id,
        titulo: data.titulo,
        descricao: data.descricao,
        categoria: data.categoria,
        preco: data.preco,
        localizacao: data.localizacao,
        imagens: data.imagens,
        telefone: data.telefone,
        whatsapp: data.whatsapp,
        infoAdicional: data.info_adicional,
        createdAt: data.created_at
      };
    }
  },
  messages: {
    getByUser: async (userId: string): Promise<Message[]> => {
      try {
        const res = await fetch(`/api/messages/${userId}`);
        if (!res.ok) {
          const errorInfo = await res.text().catch(() => 'No detail');
          throw new Error(`Erro ao carregar mensagens (${res.status}): ${errorInfo}`);
        }
        const data = await res.json();
        return data.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          mensagem: m.mensagem,
          timestamp: m.timestamp
        }));
      } catch (err: any) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          console.error("Network error fetching messages - is the server running?");
        }
        throw err;
      }
    },
    getChat: async (userId: string, otherId: string): Promise<Message[]> => {
      try {
        const res = await fetch(`/api/messages/chat/${userId}/${otherId}`);
        if (!res.ok) {
          const errorInfo = await res.text().catch(() => 'No detail');
          throw new Error(`Erro ao carregar chat (${res.status}): ${errorInfo}`);
        }
        const data = await res.json();
        return data.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          mensagem: m.mensagem,
          timestamp: m.timestamp
        }));
      } catch (err: any) {
        throw err;
      }
    },
    send: async (msg: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: msg.senderId,
          receiver_id: msg.receiverId,
          mensagem: msg.mensagem
        })
      });
      if (!res.ok) throw new Error('Erro ao enviar mensagem');
      const data = await res.json();
      return {
        id: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        mensagem: data.mensagem,
        timestamp: data.timestamp
      };
    }
  }
};
