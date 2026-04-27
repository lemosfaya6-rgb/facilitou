/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Home, Search, MessageSquare, PlusCircle, User, MapPin, Star, ChevronRight, ChevronLeft, Share2, Phone, MessageCircle, Briefcase, Camera, Laptop, Eye, EyeOff, Mail, Lock, Moon, Sun, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from './constants';
import { Service } from './types';
import { api } from './services/api';

function AppContent() {
  const { user, login, register, updateProfile, logout, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLoadingLongerThanExpected, setShowLoadingLongerThanExpected] = useState(false);
  const [forceEntry, setForceEntry] = useState(false);
  const [isSupabaseReachable, setIsSupabaseReachable] = useState<boolean | null>(null);
  const [isStorageBlocked, setIsStorageBlocked] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  
  useEffect(() => {
    // Diagnósticos avançados
    setIsInIframe(window.self !== window.top);
    
    try {
      localStorage.setItem('facilitou_test', '1');
      localStorage.removeItem('facilitou_test');
      setIsStorageBlocked(false);
    } catch (e) {
      setIsStorageBlocked(true);
    }

    const url = (import.meta as any).env.VITE_SUPABASE_URL || 'https://mwyssozviszlgsvruggj.supabase.co';
    fetch(url, { mode: 'no-cors', cache: 'no-cache' })
      .then(() => setIsSupabaseReachable(true))
      .catch((err) => {
        console.error('Supabase unreachable:', err);
        setIsSupabaseReachable(false);
      });
  }, []);

  useEffect(() => {
    let timer: any;
    if (loading && !forceEntry) {
      timer = setTimeout(() => {
        setShowLoadingLongerThanExpected(true);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [loading, forceEntry]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  useEffect(() => {
    setError('');
  }, [authMode, isAuthModalOpen]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Profile Edit States
  const [newName, setNewName] = useState(user?.name || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [newProvince, setNewProvince] = useState(user?.province || '');
  const [newMunicipality, setNewMunicipality] = useState(user?.municipality || '');
  const [newGender, setNewGender] = useState(user?.gender || 'MASCULINO');
  const [newDescription, setNewDescription] = useState(user?.description || '');
  const [newFoto, setNewFoto] = useState(user?.foto || '');

  // Messaging States
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);

  // Form States for Creation
  const [createCategory, setCreateCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [adImage, setAdImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showMyAds, setShowMyAds] = useState(false);

  useEffect(() => {
    api.services.list()
      .then(setServices)
      .catch(err => {
        console.error('Erro ao carregar serviços:', err);
        // Em caso de erro (ex: tabela não existe), mantemos a lista vazia
        setServices([]);
      });
    if (user) {
       setNewName(user.name);
       setNewEmail(user.email);
       setNewPhone(user.phone || '');
       setNewProvince(user.province || '');
       setNewMunicipality(user.municipality || '');
       setNewGender(user.gender || 'MASCULINO');
       setNewDescription(user.description || '');
       setNewFoto(user.foto || '');

       // Initial conversation load
       loadConversations();
    }
  }, [user]);

  // Poll for messages when a chat is active
  useEffect(() => {
    let timeoutId: any;
    let isMounted = true;

    const poll = async () => {
      if (!user || !activeChatId || !isMounted) return;
      await loadChatMessages();
      if (isMounted) {
        timeoutId = setTimeout(poll, 4000); // 4 seconds between polls
      }
    };

    if (user && activeChatId) {
      poll();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user, activeChatId]);

  const loadConversations = async () => {
    if (!user) return;
    try {
      const msgs = await api.messages.getByUser(user.id);
      
      // Group messages by contact
      const contacts: any = {};
      for (const m of msgs) {
        const otherId = m.senderId === user.id ? m.receiverId : m.senderId;
        if (!contacts[otherId] || new Date(m.timestamp) > new Date(contacts[otherId].lastMessage.timestamp)) {
          contacts[otherId] = {
            userId: otherId,
            lastMessage: m
          };
        }
      }
      
      const conversationList = await Promise.all(Object.values(contacts).map(async (c: any) => {
        try {
          const userData = await api.profiles.get(c.userId);
          return { ...c, user: userData };
        } catch (e) {
          return null; // Handle deleted users or errors
        }
      }));

      setConversations(conversationList.filter(c => c !== null).sort((a: any, b: any) => 
        new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
      ));
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    }
  };

  const loadChatMessages = async () => {
    if (!user || !activeChatId) return;
    try {
      console.log('Solicitando mensagens do chat para:', activeChatId);
      const data = await api.messages.getChat(user.id, activeChatId);
      setChatMessages(data);
    } catch (err: any) {
      console.error('Erro ao carregar mensagens:', err);
      // Se o erro for "Failed to fetch", pode ser interrupção de rede ou queda do server
      if (err.message?.includes('fetch')) {
        console.warn('Possível problema de rede ou servidor offline.');
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessageText.trim()) return;

    try {
      await api.messages.send({
        senderId: user.id,
        receiverId: activeChatId,
        mensagem: newMessageText
      });
      setNewMessageText('');
      loadChatMessages();
      loadConversations();
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + err.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      try {
        await updateProfile({
          name: newName,
          email: newEmail,
          phone: newPhone,
          province: newProvince,
          municipality: newMunicipality,
          gender: newGender as any,
          description: newDescription,
          foto: newFoto
        });
        setIsEditProfileOpen(false);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authLoadingLongerThanExpected, setAuthLoadingLongerThanExpected] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isAuthLoading) {
      timer = setTimeout(() => {
        setAuthLoadingLongerThanExpected(true);
      }, 5000);
    } else {
      setAuthLoadingLongerThanExpected(false);
    }
    return () => clearTimeout(timer);
  }, [isAuthLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Iniciando handleLogin...');
    setError('');
    setIsAuthLoading(true);
    
    try {
      console.log('Chamando api de login...');
      await login(email, password);
      console.log('Login concluído com sucesso.');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Erro detectado no handleLogin:', err);
      let errorMsg = err.message;
      
      const lowerMsg = err.message?.toLowerCase() || '';
      
      if (lowerMsg.includes('credentials') || lowerMsg.includes('invalid')) {
        errorMsg = 'Email ou senha incorrectos. Verifique os seus dados.';
      } else if (lowerMsg.includes('timeout') || lowerMsg.includes('demorou')) {
        errorMsg = 'A conexão falhou por lentidão. Tente novamente agora.';
      }
      
      setError(errorMsg);
    } finally {
      console.log('Finalizando estado de carregamento do login.');
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Iniciando handleRegister...');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setIsAuthLoading(true);
    setError('');
    try {
      console.log('Chamando api de registo...');
      await register(email, password, newName);
      console.log('Registo concluído com sucesso.');
      setError('Conta criada com sucesso! Já pode entrar.');
      setAuthMode('login');
      // Limpamos os campos para segurança
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Erro detectado no handleRegister:', err);
      let errorMsg = err.message;
      const lowerMsg = err.message?.toLowerCase() || '';
      
      if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
        errorMsg = 'Este email já está cadastrado. Tente fazer login ou use outro email.';
      } else if (lowerMsg.includes('timeout') || lowerMsg.includes('demorou')) {
        errorMsg = 'O registo demorou muito por falha na internet. Tente novamente.';
      }
      
      setError(errorMsg);
    } finally {
      console.log('Finalizando estado de carregamento do registo.');
      setIsAuthLoading(false);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.categoria.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || s.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && !forceEntry) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 bg-angola-red rounded-[32px] flex items-center justify-center shadow-2xl shadow-angola-red/30 animate-pulse">
            <span className="text-angola-yellow font-black text-4xl italic">F</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-black font-display text-[var(--text)] italic tracking-tighter">Facilitou Angola</h2>
              <div className="flex items-center gap-2 justify-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-angola-red rounded-full animate-spin" />
                Sincronizando...
              </div>
            </div>

            {showLoadingLongerThanExpected && (
              <button
                onClick={() => setForceEntry(true)}
                className="mt-6 w-full py-4 bg-gray-100 dark:bg-zinc-800 text-gray-500 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Continuar sem Sincronizar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen lg:flex-row lg:bg-[var(--bg)]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-80 h-screen fixed left-0 top-0 bg-[var(--card)] border-r border-[var(--border)] flex-col p-10 z-50 overflow-y-auto">
        <div className="flex items-center gap-4 mb-14">
          <div className="w-12 h-12 bg-angola-red rounded-2xl flex items-center justify-center shadow-xl shadow-angola-red/30 rotate-12">
            <span className="text-angola-yellow font-black text-2xl leading-none italic">F</span>
          </div>
          <h1 className="text-3xl font-display font-black text-[var(--text)] italic tracking-tighter">Facilitou</h1>
        </div>
        
        <nav className="space-y-4 flex-1">
          <DesktopNavItem icon={Home} label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <DesktopNavItem icon={Search} label="Explorar" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <DesktopNavItem icon={MessageSquare} label="Mensagens" active={activeTab === 'chat'} onClick={() => !user ? setIsAuthModalOpen(true) : setActiveTab('chat')} />
          <DesktopNavItem icon={User} label="Meu Perfil" active={activeTab === 'profile'} image={user?.foto} onClick={() => {
            if (!user) {
              setIsAuthModalOpen(true);
            } else {
              setShowMyAds(false);
              setActiveTab('profile');
            }
          }} />
        </nav>

        <div className="mt-8 space-y-4">
          <motion.button 
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={() => user ? setIsCreateModalOpen(true) : setIsAuthModalOpen(true)}
             className="btn-primary w-full py-5 rounded-[28px] text-lg shadow-2xl"
          >
            <PlusCircle size={22} className="mr-2" /> Publicar Anúncio
          </motion.button>

          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-3 p-5 rounded-[28px] bg-gray-50 dark:bg-zinc-900 border border-[var(--border)] text-[var(--text)] font-black transition-all hover:border-angola-red/50"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />} Tema {isDark ? 'Claro' : 'Escuro'}
          </button>
        </div>
      </div>

      <div className="flex-1 lg:pl-80">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)] px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-angola-red rounded-lg flex items-center justify-center shadow-lg shadow-angola-red/20 rotate-12">
                 <span className="text-angola-yellow font-bold text-lg leading-none">F</span>
              </div>
              <h1 className="text-2xl font-display font-extrabold text-[var(--text)] italic tracking-tight">Facilitou</h1>
            </motion.div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all active:scale-90"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={() => !user ? setIsAuthModalOpen(true) : setActiveTab('profile')} 
                className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-transparent active:border-angola-red transition-all"
              >
                 {user ? <img src={user.foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="profile" /> : <User size={20} className="text-gray-500" />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-12 overflow-x-hidden">
          <div className="max-w-5xl mx-auto px-4 lg:px-16 py-6 lg:py-16">
          
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-8 lg:space-y-12"
              >
                {/* Desktop Search Header */}
                <div className="hidden lg:flex flex-col gap-6 mb-12">
                   <h2 className="text-5xl font-black font-display tracking-tighter leading-[0.9]">Encontre o Talento <br/> <span className="text-angola-red italic underline decoration-angola-yellow">Certo</span> em Angola.</h2>
                   <p className="text-gray-400 text-lg font-medium max-w-xl">Conectando profissionais qualificados a quem precisa de serviços de excelência em todo o país.</p>
                </div>

                {/* Search Bar */}
                <div className="relative group max-w-2xl lg:mx-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                  <input 
                    type="text" 
                    placeholder="O que procura hoje?" 
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-[28px] py-5 lg:py-6 pl-14 pr-4 focus:outline-none focus:ring-4 focus:ring-angola-red/10 transition-all shadow-sm group-focus-within:shadow-xl text-lg lg:text-xl font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Promo Banner */}
                {!user && (
                  <div className="bg-gradient-to-br from-angola-red to-red-600 rounded-[40px] p-10 lg:p-14 text-white overflow-hidden relative shadow-2xl shadow-angola-red/20 border-4 border-black/5">
                    <div className="relative z-10 lg:max-w-md">
                      <div className="flex gap-2 mb-4">
                        <div className="w-8 h-1.5 bg-angola-yellow rounded-full" />
                        <div className="w-2 h-1.5 bg-white/40 rounded-full" />
                      </div>
                      <h2 className="text-3xl lg:text-5xl font-bold font-display leading-tight tracking-tight">Oportunidades em cada esquina</h2>
                      <p className="text-base lg:text-lg opacity-80 mt-4 leading-relaxed font-medium">Cadastre-se hoje e comece a oferecer seus serviços para milhares de angolanos.</p>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setAuthMode('register');
                          setIsAuthModalOpen(true);
                        }}
                        className="mt-8 bg-white text-angola-red px-8 py-3.5 rounded-[22px] text-base lg:text-lg font-black shadow-2xl transition-all"
                      >
                        Começar Agora
                      </motion.button>
                    </div>
                    <div className="absolute right-[-10%] top-[-10%] w-96 h-96 bg-angola-yellow/5 rounded-full blur-[100px]" />
                    <div className="absolute left-[-5%] bottom-[-5%] w-64 h-64 bg-black/10 rounded-full blur-[60px]" />
                  </div>
                )}

                {/* Categories - Adaptive Grid */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-2xl font-black font-display tracking-tight text-[var(--text)]">Categorias Populares</h3>
                    <motion.button whileHover={{ x: 5 }} className="text-angola-red text-sm font-black uppercase tracking-widest flex items-center gap-1">Ver tudo <ChevronRight size={16}/></motion.button>
                  </div>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-5">
                    {CATEGORIES.slice(0, 6).map((cat, i) => (
                      <motion.button 
                        key={cat.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                        className={`flex flex-col items-center gap-4 group ${selectedCategory === cat.name ? 'scale-105' : ''}`}
                      >
                        <div className={`w-16 h-16 lg:w-24 lg:h-24 ${cat.color} rounded-[28px] lg:rounded-[36px] flex items-center justify-center shadow-md dark:shadow-none transition-all group-hover:scale-110 group-hover:shadow-xl ${selectedCategory === cat.name ? 'ring-4 ring-angola-red ring-offset-4 dark:ring-offset-zinc-900' : ''}`}>
                          <cat.icon size={26} className="lg:scale-125" />
                        </div>
                        <span className={`text-[11px] lg:text-sm font-black tracking-tight uppercase transition-colors ${selectedCategory === cat.name ? 'text-angola-red' : 'text-gray-500 dark:text-gray-400'}`}>
                          {cat.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </section>

                {/* Popular Services - Grid Layout for Desktop */}
                <section className="space-y-6">
                  <div className="px-2">
                    <h3 className="text-2xl font-black font-display tracking-tight">Especialistas Top em Angola</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8">
                    {filteredServices.length === 0 ? (
                       <div className="py-20 text-center text-gray-400 col-span-full bg-[var(--card)] rounded-[40px] border-2 border-dashed border-[var(--border)] px-6">
                          <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Search size={32} className="opacity-20" />
                          </div>
                          <h3 className="text-xl font-black text-[var(--text)] mb-2 tracking-tight">Nenhum serviço encontrado</h3>
                          <p className="font-bold text-sm max-w-xs mx-auto opacity-60">
                            {selectedCategory 
                              ? `Não encontramos serviços na categoria "${selectedCategory}" no momento.` 
                              : searchQuery 
                                ? `Não encontramos resultados para "${searchQuery}".` 
                                : "Ainda não existem talentos cadastrados nesta área."}
                          </p>
                          {(selectedCategory || searchQuery) && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}
                              className="mt-8 bg-angola-red text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-angola-red/20"
                            >
                              Ver Todos os Serviços
                            </motion.button>
                          )}
                       </div>
                    ) : filteredServices.map((service) => (
                      <ServiceCard 
                        key={service.id} 
                        service={service} 
                        onClick={() => setSelectedService(service)} 
                      />
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

          {activeTab === 'explore' && (
            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="space-y-8"
            >
              <div className="px-2">
                <h3 className="text-3xl font-black font-display text-[var(--text)]">O que você precisa?</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Conectamos você ao melhor talento de Angola.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                 {CATEGORIES.map((cat, i) => (
                   <motion.div 
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setActiveTab('home');
                      }}
                      className={`${cat.color} p-6 rounded-[40px] flex flex-col gap-4 justify-between h-48 lg:h-56 relative overflow-hidden shadow-sm active:scale-95 transition-transform cursor-pointer border border-white/20`}
                   >
                      <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-[20px] flex items-center justify-center relative z-10 shadow-lg">
                         <cat.icon size={28} className="text-current" />
                      </div>
                      <div className="relative z-10">
                        <span className="font-black text-xl lg:text-2xl leading-tight">{cat.name}</span>
                        <p className="text-[10px] uppercase font-black opacity-60 mt-1 tracking-widest">Explorar catálogo</p>
                      </div>
                      <cat.icon size={120} className="absolute -right-6 -bottom-6 opacity-[0.1] lg:opacity-[0.15] rotate-12" />
                   </motion.div>
                 ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && user && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold">Mensagens</h3>
              
              {!activeChatId ? (
                <div className="divide-y divide-gray-100 bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
                  {conversations.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-medium">Nenhuma conversa iniciada.</p>
                      <button onClick={() => setActiveTab('home')} className="text-angola-red font-bold mt-2">Explorar Serviços</button>
                    </div>
                  ) : conversations.map((conv) => (
                    <div 
                      key={conv.userId} 
                      onClick={async () => {
                        setActiveChatId(conv.userId);
                        setOtherUser(conv.user);
                      }}
                      className="p-4 flex gap-4 active:bg-gray-50 dark:active:bg-zinc-800 transition-colors cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-transparent group-hover:border-angola-red transition-all">
                        <img src={conv.user.foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.user.name}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-[var(--text)]">{conv.user.name}</h4>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">{conv.lastMessage.mensagem}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-250px)] bg-[var(--card)] rounded-[32px] border border-[var(--border)] overflow-hidden">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--bg)]/50">
                    <button onClick={() => setActiveChatId(null)} className="p-2 -ml-2 text-gray-400"><ChevronRight className="rotate-180" /></button>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                      <img src={otherUser?.foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.name}`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{otherUser?.name}</h4>
                      <span className="text-[10px] font-black text-green-500 uppercase">Online</span>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-zinc-900/10">
                    {chatMessages.map(m => (
                      <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm ${
                          m.senderId === user.id 
                            ? 'bg-angola-red text-white rounded-br-none' 
                            : 'bg-white dark:bg-zinc-800 text-[var(--text)] rounded-bl-none'
                        }`}>
                          {m.mensagem}
                          <div className={`text-[9px] mt-1 opacity-60 ${m.senderId === user.id ? 'text-right' : 'text-left'}`}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={sendMessage} className="p-4 bg-[var(--card)] border-t border-[var(--border)] flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Escreva uma mensagem..." 
                      className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 focus:outline-none font-medium"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                    />
                    <button type="submit" className="p-3 bg-angola-red text-white rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}

            {activeTab === 'profile' && user && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10"
              >
                <div className="flex flex-col items-center gap-6 py-10 relative bg-[var(--card)] border border-[var(--border)] rounded-[48px] shadow-sm overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 font-black italic tracking-tighter opacity-10 text-[var(--text)] text-6xl select-none">ANGOLA</div>
                  <div className="relative">
                    <div className="w-32 h-32 lg:w-44 lg:h-44 rounded-[40px] lg:rounded-[56px] border-4 border-angola-red/20 p-1.5 bg-gradient-to-tr from-angola-red/20 to-transparent">
                      <img src={user.foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full rounded-[32px] lg:rounded-[48px] bg-gray-100 dark:bg-zinc-800 object-cover" />
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsEditProfileOpen(true)}
                      className="absolute -bottom-2 -right-2 w-12 h-12 bg-angola-yellow text-black rounded-2xl flex items-center justify-center shadow-lg border-4 border-[var(--card)]"
                    >
                      <PlusCircle size={24} className="rotate-45" />
                    </motion.button>
                  </div>
                  <div className="text-center space-y-4 relative z-10 px-8">
                    <div className="space-y-1">
                      <h3 className="text-3xl lg:text-4xl font-black font-display text-[var(--text)] leading-tight">{user.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 font-bold text-sm lg:text-base uppercase tracking-[0.2em]">{user.email}</p>
                    </div>
                    
                    {user.phone && (
                      <div className="flex items-center justify-center gap-2 text-sm font-bold text-[var(--text)]/70">
                        <Phone size={14} className="text-angola-red" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    
                    {(user.province || user.municipality) && (
                      <div className="flex items-center justify-center gap-2 text-sm font-bold text-[var(--text)]/70">
                        <MapPin size={14} className="text-angola-red" />
                        <span>{user.municipality}{user.province ? `, ${user.province}` : ''}</span>
                      </div>
                    )}

                    {user.description && (
                      <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto italic">
                        "{user.description}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 relative z-10">
                    <span className="px-5 py-2 bg-angola-red text-white text-[11px] lg:text-sm font-black rounded-full uppercase italic tracking-tighter shadow-xl shadow-angola-red/30">Membro Facilitou</span>
                  </div>
                </div>

                {showMyAds ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <button 
                        onClick={() => setShowMyAds(false)}
                        className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-xl"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <h4 className="text-2xl font-black font-display">Meus Anúncios</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {services.filter(s => s.userId === user.id).length > 0 ? (
                        services.filter(s => s.userId === user.id).map(service => (
                          <ServiceCard 
                            key={service.id} 
                            service={service} 
                            onClick={() => setSelectedService(service)} 
                          />
                        ))
                      ) : (
                        <div className="text-center py-12 space-y-4 bg-gray-50 dark:bg-zinc-900 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-zinc-800">
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Ainda não publicou nada</p>
                          <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-angola-red text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                          >
                            Criar Primeiro Anúncio
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4 px-2">
                    <h4 className="text-xl font-black font-display mb-6">Painel de Controlo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ProfileItem icon={User} label="Editar Perfil" onClick={() => setIsEditProfileOpen(true)} />
                      <ProfileItem icon={PlusCircle} label="Meus Anúncios" onClick={() => setShowMyAds(true)} />
                      <ProfileItem icon={Star} label="Minhas Avaliações" />
                      <ProfileItem label="Terminar Sessão" onClick={logout} danger icon={User} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
        </div>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/90 backdrop-blur-xl border-t border-[var(--border)] z-50">
        <div className="max-w-md mx-auto grid grid-cols-5 h-20 px-2 pb-2">
          <NavItem icon={Home} label="Início" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={Search} label="Explorar" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <div className="flex items-center justify-center -translate-y-6">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => user ? setIsCreateModalOpen(true) : setIsAuthModalOpen(true)}
              className="w-16 h-16 bg-angola-red text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-angola-red/40 ring-8 ring-[var(--bg)] transition-all"
            >
              <PlusCircle size={32} />
            </motion.button>
          </div>
          <NavItem icon={MessageSquare} label="Chats" active={activeTab === 'chat'} onClick={() => {
            if(!user) {
              setIsAuthModalOpen(true);
            } else {
              setActiveTab('chat');
            }
          }} />
          <NavItem 
            icon={User} 
            label="Eu" 
            active={activeTab === 'profile'} 
            image={user?.foto}
            onClick={() => {
              if(!user) {
                setIsAuthModalOpen(true);
              } else {
                setShowMyAds(false);
                setActiveTab('profile');
              }
            }} 
          />
        </div>
      </nav>

      {/* Modals remain similarly styled but with var colors */}
      
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsEditProfileOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card)] rounded-[40px] p-8 lg:p-10 relative z-10 space-y-8 border border-[var(--border)] shadow-2xl"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-display text-[var(--text)]">Editar Perfil</h3>
                  <p className="text-gray-500 text-sm font-medium">Actualize a sua identidade no Facilitou.</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-[32px] bg-gray-100 dark:bg-zinc-800 overflow-hidden border-4 border-[var(--card)] shadow-xl">
                      {newFoto ? (
                        <img src={newFoto} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <User size={40} />
                        </div>
                      )}
                    </div>
                    <label 
                      htmlFor="profile-photo" 
                      className="absolute -bottom-2 -right-2 w-10 h-10 bg-angola-red text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform active:scale-95"
                    >
                      <Camera size={18} />
                    </label>
                    <input 
                      type="file" 
                      id="profile-photo" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewFoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Foto de Perfil</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-4 flex items-center border border-transparent focus-within:border-angola-red/30">
                       <User size={18} className="text-gray-400 mr-3" />
                       <input 
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        className="bg-transparent w-full focus:outline-none font-black text-[var(--text)]" 
                        placeholder="Seu nome"
                        required 
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-4 flex items-center border border-transparent focus-within:border-angola-red/30">
                       <Mail size={18} className="text-gray-400 mr-3" />
                       <input 
                        type="email" 
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        className="bg-transparent w-full focus:outline-none font-black text-[var(--text)]" 
                        placeholder="seu@email.com"
                        required 
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Telefone</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-4 flex items-center border border-transparent focus-within:border-angola-red/30">
                       <Phone size={18} className="text-gray-400 mr-3" />
                       <input 
                        type="tel" 
                        value={newPhone} 
                        onChange={(e) => setNewPhone(e.target.value)} 
                        className="bg-transparent w-full focus:outline-none font-black text-[var(--text)]" 
                        placeholder="+244 ..."
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Gênero</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-4 flex items-center border border-transparent focus-within:border-angola-red/30">
                       <select 
                        value={newGender} 
                        onChange={(e) => setNewGender(e.target.value)} 
                        className="bg-transparent w-full focus:outline-none font-black text-[var(--text)] appearance-none"
                       >
                         <option value="MASCULINO">Masculino</option>
                         <option value="FEMININO">Feminino</option>
                         <option value="OUTRO">Outro</option>
                       </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Província</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-4 flex items-center border border-transparent focus-within:border-angola-red/30">
                       <select 
                        value={newProvince} 
                        onChange={(e) => setNewProvince(e.target.value)} 
                        className="bg-transparent w-full focus:outline-none font-black text-[var(--text)] appearance-none"
                       >
                         <option value="">Seleccione...</option>
                         <option value="Bengo">Bengo</option>
                         <option value="Benguela">Benguela</option>
                         <option value="Bié">Bié</option>
                         <option value="Cabinda">Cabinda</option>
                         <option value="Cuando Cubango">Cuando Cubango</option>
                         <option value="Cuanza Norte">Cuanza Norte</option>
                         <option value="Cuanza Sul">Cuanza Sul</option>
                         <option value="Cunene">Cunene</option>
                         <option value="Huambo">Huambo</option>
                         <option value="Huíla">Huíla</option>
                         <option value="Luanda">Luanda</option>
                         <option value="Lunda Norte">Lunda Norte</option>
                         <option value="Lunda Sul">Lunda Sul</option>
                         <option value="Malanje">Malanje</option>
                         <option value="Moxico">Moxico</option>
                         <option value="Namibe">Namibe</option>
                         <option value="Uíge">Uíge</option>
                         <option value="Zaire">Zaire</option>
                       </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Município</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-4 flex items-center border border-transparent focus-within:border-angola-red/30">
                       <MapPin size={18} className="text-gray-400 mr-3" />
                       <input 
                        type="text" 
                        value={newMunicipality} 
                        onChange={(e) => setNewMunicipality(e.target.value)} 
                        className="bg-transparent w-full focus:outline-none font-black text-[var(--text)]" 
                        placeholder="Ex: Viana"
                       />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Sobre mim (Descrição)</label>
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-3xl p-4 flex items-start border border-transparent focus-within:border-angola-red/30">
                      <textarea 
                      value={newDescription} 
                      onChange={(e) => setNewDescription(e.target.value)} 
                      rows={3}
                      className="bg-transparent w-full focus:outline-none font-medium text-[var(--text)] resize-none" 
                      placeholder="Fale um pouco sobre você ou seus serviços..."
                      />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsEditProfileOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 text-[var(--text)] font-black rounded-2xl">Cancelar</button>
                   <button type="submit" className="flex-1 py-4 bg-angola-red text-white font-black rounded-2xl shadow-xl shadow-angola-red/20 uppercase tracking-widest text-xs">Guardar Alterações</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Service Detail Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setSelectedService(null)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-[var(--bg)] rounded-t-[48px] h-[92vh] overflow-y-auto relative z-10 shadow-2xl"
            >
              <div className="sticky top-0 bg-[var(--bg)]/80 backdrop-blur-md p-6 flex items-center justify-between z-20">
                <button onClick={() => setSelectedService(null)} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-2xl text-[var(--text)] transition-transform active:scale-90 shadow-sm"><ChevronRight className="rotate-180" size={20}/></button>
                <div className="flex gap-2">
                  <button className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-2xl text-[var(--text)] shadow-sm"><Share2 size={18}/></button>
                </div>
              </div>
              
              <div className="px-6 space-y-8">
                <div className="aspect-[4/5] bg-gray-100 dark:bg-zinc-900 rounded-[40px] overflow-hidden shadow-inner">
                  <img src={selectedService.imagens[0]} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-angola-red bg-angola-red/5 dark:bg-angola-red/10 px-3 py-1.5 rounded-full italic uppercase tracking-widest">{selectedService.categoria}</span>
                    <div className="flex items-center gap-1 text-sm font-black text-angola-yellow">
                      <Star size={16} className="fill-current" />
                      {selectedService.avaliacoesMedia || '4.8'}
                    </div>
                  </div>
                  <h2 className="text-3xl font-extrabold font-display leading-[1.1] tracking-tight">{selectedService.titulo}</h2>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 font-bold">
                    <MapPin size={16} className="text-angola-red" />
                    {selectedService.localizacao}
                  </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-zinc-900 rounded-[32px] border border-[var(--border)] space-y-4">
                  <p className="text-sm text-[var(--text)]/80 leading-relaxed font-medium">
                    {selectedService.descricao}
                  </p>
                  {selectedService.infoAdicional && (
                    <div className="pt-3 border-t border-[var(--border)]">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Informações Extra</p>
                      <p className="text-xs text-[var(--text)]/70 font-bold">{selectedService.infoAdicional}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 py-6 border-y border-[var(--border)]">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-zinc-800" />
                  <div className="flex-1">
                    <h5 className="font-black text-base">Especialista Facilitou</h5>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Verificado em Angola</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => {
                        const tel = selectedService.telefone || '900000000';
                        window.location.href = `tel:${tel}`;
                      }}
                      className="w-12 h-12 bg-angola-red text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20"
                    >
                      <Phone size={20}/>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => {
                        const wa = selectedService.whatsapp || selectedService.telefone || '900000000';
                        window.open(`https://wa.me/${wa}`, '_blank');
                      }}
                      className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20"
                    >
                      <MessageCircle size={20}/>
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-4 pb-32">
                  <h4 className="font-black text-lg">Avaliações Locais</h4>
                  <div className="space-y-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-[32px] space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-widest">Maria Bem-Vinda</span>
                        <div className="flex gap-0.5 text-angola-yellow"><Star size={12} className="fill-current" /> <Star size={12} className="fill-current" /> <Star size={12} className="fill-current" /> <Star size={12} className="fill-current" /> <Star size={12} className="fill-current" /></div>
                      </div>
                      <p className="text-sm text-gray-500 italic font-medium leading-relaxed">"O serviço foi excelente. Muito profissional e rápido em Luanda!"</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[var(--bg)]/90 backdrop-blur-xl border-t border-[var(--border)] p-8 flex items-center justify-between gap-6 z-30">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Investimento</span>
                  <span className="text-angola-red font-black text-xl">{selectedService.preco ? `Kz ${selectedService.preco}` : 'Orcamento'}</span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (!user) return setIsAuthModalOpen(true);
                    try {
                      const otherData = await api.profiles.get(selectedService.userId);
                      setOtherUser(otherData);
                      setActiveChatId(selectedService.userId);
                      setSelectedService(null);
                      setActiveTab('chat');
                    } catch (e) {
                      alert('Erro ao carregar dados do prestador');
                    }
                  }}
                  className="btn-primary flex-1 py-5 shadow-2xl"
                >
                  Contactar Agora
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Other Modals (Create Listing, Auth) follow similar pattern... */}


      {/* Create Listing Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsCreateModalOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100% '}}
              className="w-full max-w-md bg-[var(--card)] text-[var(--text)] rounded-t-[40px] p-8 pb-12 relative z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mx-auto" />
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold font-display text-[var(--text)]">Criar Anúncio</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400">Fechar</button>
              </div>
              
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                if (isPublishing) return;
                
                const formData = new FormData(e.currentTarget);
                const finalCategory = createCategory === 'Outro' ? customCategory : createCategory;
                
                if (!finalCategory) {
                  alert('Por favor selecione ou escreva uma categoria');
                  return;
                }

                setIsPublishing(true);
                const newService = {
                  userId: user?.id || '',
                  titulo: formData.get('titulo') as string,
                  categoria: finalCategory,
                  localizacao: formData.get('localizacao') as string,
                  preco: formData.get('preco') as string,
                  descricao: formData.get('descricao') as string,
                  telefone: formData.get('telefone') as string,
                  whatsapp: formData.get('whatsapp') as string,
                  infoAdicional: formData.get('infoAdicional') as string,
                  imagens: adImage ? [adImage] : ['https://images.unsplash.com/photo-1581578731548-c64695ce6958?w=400&auto=format&fit=crop&q=60'], 
                  avaliacoesMedia: 5.0
                };

                try {
                  const created = await api.services.create(newService);
                  setServices([created, ...services]);
                  setIsCreateModalOpen(false);
                  // Reset form states
                  setAdImage(null);
                  setCreateCategory('');
                  setCustomCategory('');
                } catch (err) {
                  alert('Erro ao publicar anúncio. Tente novamente.');
                } finally {
                  setIsPublishing(false);
                }
              }}>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Título do Serviço</label>
                      <input name="titulo" type="text" placeholder="Ex: Lavandaria Express" className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none" required />
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</label>
                      <select 
                        name="categoria" 
                        value={createCategory}
                        onChange={(e) => setCreateCategory(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none appearance-none" 
                        required
                      >
                         <option value="">Seleccione...</option>
                         {CATEGORIES.map(c => <option key={c.id} value={c.name} className="bg-[var(--card)] text-[var(--text)]">{c.name}</option>)}
                      </select>
                      
                      {createCategory === 'Outro' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                          <input 
                            type="text" 
                            placeholder="Escreva a sua categoria..." 
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-angola-red/20 outline-none border border-angola-red/30" 
                            required
                          />
                        </motion.div>
                      )}
                   </div>

                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localização</label>
                      <input name="localizacao" type="text" placeholder="Ex: Luanda, Benfica" className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none" required />
                   </div>

                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preço (Opcional)</label>
                      <input name="preco" type="text" placeholder="Ex: 2.500" className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none" />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Telefone</label>
                        <input name="telefone" type="tel" placeholder="9xx xxx xxx" className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp</label>
                        <input name="whatsapp" type="tel" placeholder="9xx xxx xxx" className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none" />
                     </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informações Adicionais</label>
                      <input name="infoAdicional" type="text" placeholder="Ex: Atendo aos fins de semana" className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none" />
                   </div>

                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</label>
                      <textarea name="descricao" rows={3} placeholder="Descreva o que você oferece..." className="w-full bg-gray-100 dark:bg-zinc-800 text-[var(--text)] rounded-xl p-4 focus:ring-2 ring-brand/20 outline-none resize-none" required />
                   </div>

                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fotos</label>
                      <div className="flex gap-3 flex-wrap">
                        {adImage && (
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden group">
                            <img src={adImage} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setAdImage(null)}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                        <input 
                          type="file" 
                          id="ad-photo" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setAdImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label 
                          htmlFor="ad-photo" 
                          className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Camera size={20} />
                          <span className="text-[8px] font-black uppercase mt-1">Carregar</span>
                        </label>
                      </div>
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isPublishing}
                  className={`btn-primary w-full py-4 text-lg font-black uppercase tracking-widest ${isPublishing ? 'opacity-50' : ''}`}
                >
                  {isPublishing ? 'A Publicar...' : 'Publicar Anúncio'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setIsAuthModalOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100% '}}
              className="w-full max-w-md bg-[var(--card)] text-[var(--text)] rounded-t-[32px] p-8 relative z-10 space-y-6"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mx-auto" />
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold font-display text-[var(--text)]">
                  {authMode === 'login' ? 'Bem-vindo de volta' : 'Criar Conta'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {authMode === 'login' ? 'Entre com seu email e senha' : 'Preencha os dados para se cadastrar'}
                </p>
              </div>

              {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-3 rounded-xl text-xs font-medium text-center">{error}</div>}

              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                <div className="space-y-4">
                  {authMode === 'register' && (
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center px-4 py-3.5 focus-within:ring-2 ring-brand/20 border border-transparent focus-within:border-brand/30">
                        <User size={18} className="text-gray-400 mr-2" />
                        <input 
                          type="text" 
                          placeholder="Ex: João Manuel" 
                          className="bg-transparent w-full focus:outline-none font-bold text-[var(--text)]"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center px-4 py-3.5 focus-within:ring-2 ring-brand/20 border border-transparent focus-within:border-brand/30">
                      <Mail size={18} className="text-gray-400 mr-2" />
                      <input 
                        type="email" 
                        placeholder="seu@email.com" 
                        className="bg-transparent w-full focus:outline-none font-bold text-[var(--text)]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center px-4 py-3.5 focus-within:ring-2 ring-brand/20 border border-transparent focus-within:border-brand/30">
                      <Lock size={18} className="text-gray-400 mr-2" />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••" 
                        className="bg-transparent w-full focus:outline-none font-bold text-[var(--text)]"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 p-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                      <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center px-4 py-3.5 focus-within:ring-2 ring-brand/20 border border-transparent focus-within:border-brand/30">
                        <Lock size={18} className="text-gray-400 mr-2" />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••" 
                          className="bg-transparent w-full focus:outline-none font-bold text-[var(--text)]"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isAuthLoading}
                  className="btn-primary w-full py-4 text-lg font-bold mt-2 shadow-lg shadow-brand/20 disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       Processando...
                    </div>
                  ) : (
                    authMode === 'login' ? 'Entrar' : 'Criar Conta Grátis'
                  )}
                </button>

                {authLoadingLongerThanExpected && isAuthLoading && (
                  <div className="space-y-2">
                    <button 
                      type="button"
                      onClick={() => setIsAuthLoading(false)}
                      className="w-full text-[10px] font-black uppercase tracking-widest text-brand py-2 hover:opacity-80 transition-all"
                    >
                      Cancelar e Tentar Novamente
                    </button>
                  </div>
                )}
              </form>

              <div className="text-center">
                <button 
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                  className="text-brand text-sm font-bold"
                >
                  {authMode === 'login' ? 'Não tem uma conta? Registe-se' : 'Já tem uma conta? Entre'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}

const ServiceCard: React.FC<{ service: Service, onClick: () => void }> = ({ service, onClick }) => {
  return (
    <motion.div 
      onClick={onClick} 
      whileHover={{ y: -8, shadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      className="card-premium flex gap-5 lg:gap-8 lg:p-6 cursor-pointer group"
    >
      <div className="w-24 h-24 lg:w-36 lg:h-36 bg-gray-100 dark:bg-zinc-800 rounded-3xl overflow-hidden flex-shrink-0 relative">
        <img 
          src={service.imagens?.[0]} 
          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
          alt={service.titulo} 
        />
      </div>
      <div className="flex-1 space-y-2 py-1 lg:py-3">
        <div className="flex justify-between items-start">
          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.15em] text-angola-red bg-angola-red/5 dark:bg-angola-red/10 px-3 py-1.5 rounded-full">
            {service.categoria}
          </span>
          <div className="flex items-center gap-1 text-sm font-black text-angola-yellow">
            <Star size={14} className="fill-angola-yellow" />
            {service.avaliacoesMedia || '4.8'}
          </div>
        </div>
        <h4 className="font-black text-lg lg:text-2xl text-[var(--text)] leading-tight line-clamp-1 group-hover:text-angola-red transition-colors">{service.titulo}</h4>
        <div className="flex items-center gap-1.5 text-xs lg:text-sm text-gray-400 font-bold">
          <MapPin size={14} className="text-angola-red" />
          {service.localizacao}
        </div>
        <div className="pt-3 flex items-center justify-between">
          <span className="text-angola-red font-black text-base lg:text-xl">{service.preco ? `Kz ${service.preco}` : 'Orcamento'}</span>
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-[18px] bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 group-hover:bg-angola-red group-hover:text-white transition-all">
             <ChevronRight size={18}/>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DesktopNavItem({ icon: Icon, label, active, onClick, image }: { icon: any, label: string, active: boolean, onClick: () => void, image?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all font-bold ${active ? 'bg-angola-red/10 text-angola-red shadow-sm' : 'text-gray-400 hover:text-angola-red hover:bg-gray-50 dark:hover:bg-zinc-900 border border-transparent hover:border-[var(--border)]'}`}
    >
      {image ? (
        <div className={`w-8 h-8 rounded-xl overflow-hidden border-2 ${active ? 'border-angola-red' : 'border-transparent'}`}>
          <img src={image} className="w-full h-full object-cover" />
        </div>
      ) : (
        <Icon size={22} />
      )}
      <span className="text-base tracking-tight">{label}</span>
      {active && <motion.div layoutId="desktop-nav-indicator" className="w-1.5 h-1.5 rounded-full bg-angola-red ml-auto" />}
    </button>
  );
}

function NavItem({ icon: Icon, label, active, onClick, image }: { icon: any, label: string, active: boolean, onClick: () => void, image?: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 h-full relative"
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'text-angola-red bg-angola-red/5' : 'text-gray-400'}`}>
        {image ? (
          <div className={`w-7 h-7 rounded-[10px] overflow-hidden border-2 ${active ? 'border-angola-red' : 'border-transparent'}`}>
            <img src={image} className="w-full h-full object-cover" />
          </div>
        ) : (
          <Icon size={24} />
        )}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-angola-red' : 'text-gray-400'}`}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute -bottom-1 w-8 h-1 bg-angola-red rounded-full"
        />
      )}
    </button>
  );
}

function ProfileItem({ label, onClick, danger, icon: Icon }: { label: string, onClick?: () => void, danger?: boolean, icon?: any }) {
  return (
    <motion.button 
      whileHover={{ y: -2, backgroundColor: 'rgba(0,0,0,0.02)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center justify-between p-5 rounded-[24px] border border-[var(--border)] ${danger ? 'text-angola-red bg-red-50/10 dark:bg-red-500/5' : 'bg-[var(--card)] text-[var(--text)] shadow-sm'} transition-all`}
    >
      <div className="flex items-center gap-4">
        {Icon && <div className={`p-2.5 rounded-xl ${danger ? 'bg-angola-red text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 dark:bg-zinc-800 text-[var(--text)]'}`}><Icon size={20} /></div>}
        <span className="font-bold text-base tracking-tight">{label}</span>
      </div>
      <ChevronRight size={18} className={danger ? 'text-red-300' : 'text-gray-400'} />
    </motion.button>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
