import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const enrollmentService = {
  async getEnrollmentsForClass(classId: string) {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          profile:profiles!user_id(name, email)
        `)
        .eq('class_id', classId);

      if (error) {
        throw error;
      }
      return data;
    } catch (error: any) {
      console.error('Erro ao buscar matrículas da turma:', error);
      toast.error(`Falha ao buscar matrículas: ${error.message}`);
      return [];
    }
  },

  async updateEnrollmentStatus(enrollmentId: string, status: string) {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status })
        .eq('id', enrollmentId);

      if (error) {
        throw error;
      }

      toast.success(`Matrícula atualizada para ${status} com sucesso!`);
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar status da matrícula:', error);
      toast.error(`Falha ao atualizar status da matrícula: ${error.message}`);
      return false;
    }
  },
};
