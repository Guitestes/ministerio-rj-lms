import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { toast } from 'sonner';

/**
 * Serviço para buscar usuários diretamente da tabela de perfis
 * Esta abordagem contorna as limitações de permissão da API de autenticação
 */
export const directProfileService = {
  /**
   * Busca todos os perfis diretamente da tabela profiles
   */
  async getAllProfiles(): Promise<User[]> {
    console.log('🔍 DirectProfileService: Iniciando busca de perfis...');
    
    try {
      // Tentativa 1: Usar a função get_all_users (para administradores)
      console.log('📋 Tentativa 1: Usando função get_all_users');
      const { data: usersData, error: rpcError } = await supabase
        .rpc('get_all_users');
      
      if (!rpcError && usersData && usersData.length > 0) {
        console.log('✅ Função get_all_users bem-sucedida:', usersData.length, 'usuários encontrados');
        return usersData.map((user: any) => ({
          id: user.id,
          name: user.name || 'Usuário',
          email: user.email || '',
          role: user.role || 'student',
          avatarUrl: user.avatar_url || '',
          createdAt: user.created_at || new Date().toISOString()
        }));
      } else {
        console.log('⚠️ Função get_all_users falhou ou usuário não é admin:', rpcError);
      }

      // Tentativa 2: Consulta direta na tabela profiles
      console.log('📋 Tentativa 2: Consulta direta na tabela profiles');
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, avatar_url')
        .order('created_at', { ascending: false });
      
      if (!profilesError && profiles && profiles.length > 0) {
        console.log('✅ Consulta direta bem-sucedida:', profiles.length, 'perfis encontrados');
        return profiles.map(profile => ({
          id: profile.id,
          name: profile.name || 'Usuário',
          email: profile.email || '',
          role: profile.role || 'student',
          avatarUrl: profile.avatar_url || '',
          createdAt: profile.created_at || new Date().toISOString()
        }));
      } else {
        console.error('❌ Erro na consulta direta:', profilesError);
      }

      // Tentativa 3: Consulta apenas do próprio usuário
      console.log('📋 Tentativa 3: Consultando apenas o próprio perfil');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: ownProfile, error: ownError } = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (!ownError && ownProfile) {
          console.log('✅ Perfil próprio encontrado');
          return [{
            id: ownProfile.id,
            name: ownProfile.name || 'Usuário',
            email: ownProfile.email || '',
            role: ownProfile.role || 'student',
            avatarUrl: ownProfile.avatar_url || '',
            createdAt: ownProfile.created_at || new Date().toISOString()
          }];
        } else {
          console.error('❌ Erro ao buscar próprio perfil:', ownError);
        }
      }

      console.log('⚠️ Todas as tentativas falharam');
      return [];
    } catch (error) {
      console.error('💥 Erro geral no directProfileService:', error);
      throw error;
    }
  }
};
