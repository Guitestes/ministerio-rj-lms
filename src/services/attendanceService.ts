import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AttendanceRecord {
  class_id: string;
  user_id: string;
  event_date: string;
  status: 'present' | 'absent' | 'justified';
  notes?: string;
  recorded_by: string;
}

export const attendanceService = {
  async getClassesForProfessor(professorId: string) {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, course_id, courses(title)')
        .eq('instructor_id', professorId);

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(`Failed to fetch classes: ${error.message}`);
      return [];
    }
  },

  async getAttendanceForClassOnDate(classId: string, eventDate: string) {
    try {
      const { data, error } = await supabase
        .from('class_attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('event_date', eventDate);

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(`Failed to fetch attendance: ${error.message}`);
      return [];
    }
  },

  async saveAttendance(records: Partial<AttendanceRecord>[]) {
    try {
      // Supabase upsert is perfect for this. It will insert new records
      // and update existing ones based on the primary key or, in this case,
      // the specified `onConflict` columns.
      const { error } = await supabase
        .from('class_attendance')
        .upsert(records, { onConflict: 'class_id,user_id,event_date' });

      if (error) {
        // Check for a specific constraint error if the enum type is different
        if (error.message.includes('invalid input value for enum')) {
            toast.error('Status de frequência inválido. Use "present", "absent", ou "justified".');
            throw new Error('Invalid enum value for attendance status.');
        }
        throw error;
      }

      toast.success('Frequência salva com sucesso!');
      return true;
    } catch (error: any) {
      toast.error(`Falha ao salvar frequência: ${error.message}`);
      return false;
    }
  }
};
