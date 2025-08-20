import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RetentionAction {
  user_id: string;
  admin_id: string;
  action_type: string;
  notes?: string;
}

export const retentionService = {
  async createRetentionAction(actionData: RetentionAction): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('retention_actions')
        .insert(actionData);
      if (error) throw error;
      toast.success('Ação de retenção registrada com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Error creating retention action:', error);
      toast.error(`Falha ao registrar ação: ${error.message}`);
      return false;
    }
  },

  async getRetentionActionsForUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('retention_actions')
        .select('*, admin:profiles!admin_id(name)')
        .eq('user_id', userId)
        .order('action_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching retention actions:', error);
      toast.error(`Falha ao buscar histórico de ações: ${error.message}`);
      return [];
    }
  }
};
