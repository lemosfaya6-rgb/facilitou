import { createClient } from '@supabase/supabase-js';

// Fallback para valores fornecidos no chat caso os segredos não estejam configurados
const DEFAULT_URL = 'https://mwyssozviszlgsvruggj.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eXNzb3p2aXN6bGdzdnJ1Z2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzc5MjcsImV4cCI6MjA5MjUxMzkyN30.Fqa3R0fiVtqyTqFFIJj8F19r-59fPPHJ1Z2E3toGhnU';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || DEFAULT_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Limpa a URL: remove espaços, barras finais e o sufixo /rest/v1 que o usuário pode ter colado por engano
const supabaseUrl = rawUrl.trim().replace(/\/$/, '').replace(/\/rest\/v1$/, '');
const supabaseAnonKey = rawKey.trim();

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('ERRO: VITE_SUPABASE_URL não configurada corretamente nos Secrets.');
}

if (supabaseUrl === DEFAULT_URL) {
  console.warn('AVISO: O app está usando as credenciais Supabase PADRÃO. Para usar seu próprio banco, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas definições.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
