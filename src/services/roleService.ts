import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

export type UserRole = 'admin' | 'professor' | 'student';

interface RoleServiceConfig {
  adminEmails: string[];
  professorEmails: string[];
}

// Configuração centralizada de papéis
const ROLE_CONFIG: RoleServiceConfig = {
  adminEmails: [
    'guigasprogramador@gmail.com',
    'admin@example.com',
    'maria.silva@professor.com',
    'joao.santos@professor.com'
  ],
  professorEmails: [
    // Adicione emails de professores aqui quando necessário
  ]
};

class RoleService {
  private static instance: RoleService;
  private roleUpdateInProgress = new Set<string>();
  private lastRoleCheck = new Map<string, number>();
  private readonly ROLE_CHECK_COOLDOWN = 5 * 60 * 1000; // 5 minutos

  private constructor() {}

  static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService();
    }
    return RoleService.instance;
  }

  /**
   * Determina o papel correto baseado no email do usuário
   */
  private determineRoleByEmail(email: string): UserRole {
    if (ROLE_CONFIG.adminEmails.includes(email.toLowerCase())) {
      return 'admin';
    }
    if (ROLE_CONFIG.professorEmails.includes(email.toLowerCase())) {
      return 'professor';
    }
    return 'student';
  }

  /**
   * Verifica se o usuário tem o papel correto e atualiza se necessário
   */
  async ensureCorrectRole(user: User): Promise<UserRole> {
    if (!user?.email) {
      return 'student';
    }

    const userId = user.id;
    const now = Date.now();
    const lastCheck = this.lastRoleCheck.get(userId) || 0;

    // Evitar verificações muito frequentes
    if (now - lastCheck < this.ROLE_CHECK_COOLDOWN) {
      return user.role as UserRole;
    }

    // Evitar múltiplas atualizações simultâneas para o mesmo usuário
    if (this.roleUpdateInProgress.has(userId)) {
      return user.role as UserRole;
    }

    const expectedRole = this.determineRoleByEmail(user.email);
    
    // Se o papel já está correto, não fazer nada
    if (user.role === expectedRole) {
      this.lastRoleCheck.set(userId, now);
      return expectedRole;
    }

    // Atualizar papel se necessário
    try {
      this.roleUpdateInProgress.add(userId);
      await this.updateUserRole(userId, expectedRole);
      this.lastRoleCheck.set(userId, now);
      return expectedRole;
    } catch (error) {
      console.error(`Erro ao atualizar papel do usuário ${userId}:`, error);
      return user.role as UserRole;
    } finally {
      this.roleUpdateInProgress.delete(userId);
    }
  }

  /**
   * Atualiza o papel do usuário no Supabase
   */
  private async updateUserRole(userId: string, role: UserRole): Promise<void> {
    // Primeiro, atualizar diretamente na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Falha ao atualizar papel na tabela profiles: ${profileError.message}`);
    }

    // Se for professor ou admin, garantir entrada na tabela professor_details
    if (role === 'professor' || role === 'admin') {
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
      // Se não for professor nem admin, remover da tabela professor_details
      const { error: deleteError } = await supabase
        .from('professor_details')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.warn('Aviso: Não foi possível remover de professor_details:', deleteError);
      }
    }
  }

  /**
   * Verifica se o usuário é administrador
   */
  isAdmin(user: User | null): boolean {
    if (!user) return false;
    
    // Verificar papel atual
    if (user.role === 'admin') {
      return true;
    }
    
    // Verificar por email como fallback
    return ROLE_CONFIG.adminEmails.includes(user.email.toLowerCase());
  }

  /**
   * Verifica se o usuário é professor
   */
  isProfessor(user: User | null): boolean {
    if (!user) return false;
    
    // Admins também têm privilégios de professor
    if (this.isAdmin(user)) {
      return true;
    }
    
    return user.role === 'professor' || 
           ROLE_CONFIG.professorEmails.includes(user.email.toLowerCase());
  }

  /**
   * Verifica se o usuário é estudante
   */
  isStudent(user: User | null): boolean {
    if (!user) return false;
    return user.role === 'student';
  }

  /**
   * Obtém o papel padrão para novos usuários
   */
  getDefaultRole(email: string): UserRole {
    return this.determineRoleByEmail(email);
  }

  /**
   * Limpa o cache de verificações de papel
   */
  clearCache(): void {
    this.lastRoleCheck.clear();
    this.roleUpdateInProgress.clear();
  }
}

export const roleService = RoleService.getInstance();
export default roleService;