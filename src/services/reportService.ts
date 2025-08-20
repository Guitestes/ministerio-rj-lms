import { supabase } from '@/integrations/supabase/client';

export const reportService = {
  async getDocumentIssuanceSummary(startDate: string | null, endDate: string | null, status: string | null) {
    const { data, error } = await supabase.rpc('reports.get_document_issuance_summary', {
      start_date_param: startDate,
      end_date_param: endDate,
      status_param: status,
    });

    if (error) {
      console.error('Error fetching document issuance summary:', error);
      throw new Error('Não foi possível buscar o relatório de emissão de documentos.');
    }

    return data;
  },

  async getStudentsPerClass(classId: string, status: string) {
    const { data, error } = await supabase.rpc('reports.get_students_per_class', {
      class_id_param: classId,
      status_param: status,
    });

    if (error) {
      console.error('Error fetching students per class:', error);
      throw new Error('Não foi possível buscar o relatório de alunos por turma.');
    }

    return data;
  },

  async getStudentAttendanceSummary(classId: string) {
    const { data, error } = await supabase.rpc('reports.get_student_attendance_summary', {
      class_id_param: classId,
    });

    if (error) {
      console.error('Error fetching student attendance summary:', error);
      throw new Error('Não foi possível buscar o relatório de frequência.');
    }

    return data;
  },

  async getRetentionByCohort() {
    const { data, error } = await supabase.rpc('reports.get_retention_by_cohort');

    if (error) {
      console.error('Error fetching retention by cohort:', error);
      throw new Error('Não foi possível buscar o relatório de retenção por cohort.');
    }

    return data;
  },

  async getStudentRiskProfile(classId: string) {
    const { data, error } = await supabase.rpc('reports.get_student_risk_profile', {
      p_class_id: classId,
    });

    if (error) {
      console.error('Error fetching student risk profile:', error);
      throw new Error('Não foi possível buscar o relatório de risco de evasão.');
    }

    return data;
  },
};
