import { supabase } from '@/integrations/supabase/client';

import type { MoodleIntegration, MoodleCertificate } from '@/types/database';

export interface MoodleCertificateResponse {
  courseName: string;
  issueDate: string;
  grade?: string;
  moodleCourseId: string;
}

export const moodleService = {
  async getIntegration(studentId: string, courseId: string): Promise<MoodleIntegration | null> {
    const { data, error } = await supabase
      .from('moodle_integrations')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async createIntegration(studentId: string, courseId: string, moodleUserId: string): Promise<MoodleIntegration> {
    const { data, error } = await supabase
      .from('moodle_integrations')
      .insert({
        student_id: studentId,
        course_id: courseId,
        moodle_user_id: moodleUserId,
        auto_enroll: true,
        last_sync: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async syncEnrollment(studentId: string, courseId: string): Promise<void> {
    const integration = await this.getIntegration(studentId, courseId);
    if (!integration || !integration.auto_enroll) return;

    // Lógica de sincronização com API Moodle (implementar chamada real à API Moodle aqui)
    // Por enquanto, simular sincronização
    console.log(`Sincronizando matrícula para student ${studentId} no curso Moodle ${courseId}`);

    const { error } = await supabase
      .from('moodle_integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', integration.id);

    if (error) throw error;
  },

  async getMoodleCertificates(userId: string): Promise<MoodleCertificateResponse[]> {
    // Implementar chamada real à API Moodle para obter certificados
    // Por enquanto, manter mock como fallback
    console.log(`Buscando certificados Moodle para user: ${userId}`);

    // Exemplo de integração futura com API Moodle
    // const response = await fetchMoodleAPI(`/certificates?userId=${userId}`);
    // return response.certificates;

    // Mock temporário
    return [
      {
        courseName: 'Curso Moodle Integrado',
        issueDate: new Date().toISOString(),
        grade: '90%',
        moodleCourseId: 'moodle-001',
      }
    ];
  }
};
