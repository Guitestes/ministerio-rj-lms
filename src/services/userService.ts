import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { toast } from 'sonner';

// Tipos para os dados do formulário, mantendo consistência
interface UserFormData {
  name: string;
  email: string;
  role: 'admin' | 'student' | 'professor';
  password?: string;
}

export const userService = {
  /**
   * Busca todos os perfis de usuário.
   * A visibilidade é controlada pelas Políticas de Segurança a Nível de Linha (RLS) no Supabase.
   * Admins podem ver todos, enquanto outros usuários podem ter uma visão limitada.
   */
  async getUsers(): Promise<User[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, created_at, avatar_url');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Não foi possível carregar os usuários.');
      return [];
    }

    // Mapeia os perfis para o tipo User, garantindo que todos os campos tenham valores padrão.
    return profiles.map(profile => ({
      id: profile.id,
      name: profile.name || 'Nome não definido',
      email: profile.email || 'Email não disponível',
      role: profile.role || 'student',
      avatarUrl: profile.avatar_url || '',
      createdAt: profile.created_at || new Date().toISOString(),
    }));
  },

  /**
   * Cria um novo usuário no sistema de autenticação do Supabase.
   * Um trigger no banco de dados (`handle_new_user`) criará o perfil correspondente.
   */
  async createUser(userData: UserFormData): Promise<User | null> {
    if (!userData.password || userData.password.length < 6) {
      toast.error('A senha é obrigatória e deve ter no mínimo 6 caracteres.');
      throw new Error('Senha inválida.');
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.name,
          role: userData.role,
        },
      },
    });

    if (signUpError) {
      console.error('Erro ao criar usuário na autenticação:', signUpError);
      toast.error(`Erro ao criar usuário: ${signUpError.message}`);
      return null;
    }

    if (!signUpData.user) {
        toast.error('A criação do usuário não retornou os dados esperados.');
        return null;
    }

    // A trigger `handle_new_user` deve ter criado o perfil.
    // Vamos buscar o perfil recém-criado para retornar os dados completos.
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signUpData.user.id)
        .single();

    if (profileError || !profile) {
        console.error('Erro ao buscar o perfil do novo usuário:', profileError);
        toast.warning('Usuário criado, mas houve um problema ao buscar o perfil.');
        // Retorna os dados básicos mesmo que o perfil não seja encontrado imediatamente
        return {
            id: signUpData.user.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            avatarUrl: '',
            createdAt: signUpData.user.created_at || new Date().toISOString(),
        };
    }

    toast.success(`Usuário ${profile.name} criado com sucesso!`);
    return {
        id: profile.id,
        name: profile.name || 'Nome não definido',
        email: profile.email || 'Email não disponível',
        role: profile.role || 'student',
        avatarUrl: profile.avatar_url || '',
        createdAt: profile.created_at || new Date().toISOString(),
    };
  },

  /**
   * Atualiza os dados de um usuário.
   * A atualização ocorre principalmente na tabela 'profiles'.
   */
  async updateUser(userId: string, userData: Partial<UserFormData>): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: userData.name,
        role: userData.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error(`Falha ao atualizar usuário: ${error.message}`);
      return null;
    }

    toast.success(`Usuário ${data.name} atualizado com sucesso!`);
    return {
        id: data.id,
        name: data.name || 'Nome não definido',
        email: data.email || 'Email não disponível',
        role: data.role || 'student',
        avatarUrl: data.avatar_url || '',
        createdAt: data.created_at || new Date().toISOString(),
    };
  },

  /**
   * Deleta um usuário e todos os seus dados associados.
   * Esta operação é irreversível e deve ser usada com cuidado.
   * Chama uma função de banco de dados (`delete_user_data`) para garantir que a operação seja atômica.
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_user_data', {
      user_id_to_delete: userId,
    });

    if (error) {
      console.error('Erro ao deletar usuário:', error);
      toast.error(`Falha ao deletar usuário: ${error.message}`);
      throw new Error(`Falha ao deletar usuário: ${error.message}`);
    }

    toast.success('Usuário e todos os seus dados foram excluídos com sucesso.');
  },

  /**
   * Funções para gerenciamento de papéis, mantendo a compatibilidade.
   */
  async getUsersWithRoles(): Promise<{ id: string, name: string, email: string, is_admin: boolean, is_professor: boolean }[]> {
    const { data, error } = await supabase.rpc('get_users_with_roles');
    if (error) {
      toast.error(`Falha ao buscar usuários com papéis: ${error.message}`);
      throw error;
    }
    return data;
  },

  async setUserRoles(userId: string, isAdmin: boolean, isProfessor: boolean): Promise<void> {
    // Determinar o papel baseado nos parâmetros
    const role = isAdmin ? 'admin' : (isProfessor ? 'professor' : 'student');
    
    // Atualizar diretamente na tabela profiles
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    
    if (error) {
      toast.error(`Falha ao atualizar papel: ${error.message}`);
      throw error;
    }
    
    // Gerenciar tabela professor_details
    if (isProfessor || isAdmin) {
      // Verificar se já existe um registro para este usuário
      const { data: existingRecord } = await supabase
        .from('professor_details')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existingRecord) {
        // Atualizar registro existente
        const { error: updateError } = await supabase
          .from('professor_details')
          .update({
            bio: 'Professor bio placeholder.',
            specialization: 'Specialization placeholder.',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        if (updateError) {
          console.warn('Aviso: Não foi possível atualizar professor_details:', updateError);
        }
      } else {
        // Criar novo registro
        const { error: insertError } = await supabase
          .from('professor_details')
          .insert({
            user_id: userId,
            bio: 'Professor bio placeholder.',
            specialization: 'Specialization placeholder.'
          });
        
        if (insertError) {
          console.warn('Aviso: Não foi possível criar professor_details:', insertError);
        }
      }
    } else {
      // Remover da tabela professor_details se não for professor nem admin
      const { error: deleteError } = await supabase
        .from('professor_details')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.warn('Aviso: Não foi possível remover de professor_details:', deleteError);
      }
    }
  },
};
