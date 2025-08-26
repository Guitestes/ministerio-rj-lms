import { supabase } from '@/integrations/supabase/client';

import type { CustomEvaluationForm } from '@/types/database';

export const customEvaluationService = {
  async createForm(courseId: string, formData: Partial<CustomEvaluationForm>): Promise<CustomEvaluationForm> {
    const { data, error } = await supabase
      .from('custom_evaluation_forms')
      .insert({
        course_id: courseId,
        form_name: formData.form_name,
        form_content: formData.form_content,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getFormsByCourse(courseId: string): Promise<CustomEvaluationForm[]> {
    const { data, error } = await supabase
      .from('custom_evaluation_forms')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateForm(formId: string, updates: Partial<CustomEvaluationForm>): Promise<CustomEvaluationForm> {
    const { data, error } = await supabase
      .from('custom_evaluation_forms')
      .update(updates)
      .eq('id', formId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteForm(formId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_evaluation_forms')
      .delete()
      .eq('id', formId);

    if (error) throw error;
  }
};