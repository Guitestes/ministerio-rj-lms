import { supabase } from '@/integrations/supabase/client';
import { CustomForm, FormField, FormSubmission, SubmissionAnswer } from '@/types/index';

export const formService = {
  async getFormForCourse(courseId: string): Promise<CustomForm | null> {
    try {
      // Buscar formulário básico com tratamento especial para erro 406
      let formData, formError;
      
      try {
        const result = await supabase
          .from('custom_forms')
          .select('*')
          .eq('course_id', courseId)
          .single();
        
        formData = result.data;
        formError = result.error;
      } catch (fetchError) {
        // Tratar erro de rede ou erro 406
        console.error('Erro de rede ao buscar formulário:', fetchError);
        // Tentar novamente com uma abordagem mais robusta
        const retryResult = await supabase
          .from('custom_forms')
          .select('id, course_id, title, description, is_active, created_at, updated_at')
          .eq('course_id', courseId)
          .limit(1);
          
        if (retryResult.data && retryResult.data.length > 0) {
          formData = retryResult.data[0];
          formError = retryResult.error;
        } else {
          throw fetchError; // Repropagar o erro original se a tentativa falhar
        }
      }

      if (formError) {
        if (formError.code === 'PGRST116') return null; // No form for this course
        console.error('Erro ao buscar formulário:', formError);
        return null;
      }
      if (!formData) return null;

      // Buscar campos do formulário separadamente
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formData.id)
        .order('order_number', { ascending: true });

      if (fieldsError) {
        console.error('Erro ao buscar campos do formulário:', fieldsError);
      }

      const fields = (fieldsData || []).map(f => ({
        id: f.id,
        formId: f.form_id,
        label: f.label,
        fieldType: f.field_type,
        options: f.options,
        isRequired: f.is_required,
        order: f.order_number,
      }));

      return { 
        ...formData, 
        courseId: formData.course_id, 
        fields 
      };
    } catch (error) {
      console.error('Erro geral ao buscar formulário:', error);
      // Limpar cache de erros para evitar bloqueios futuros
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('error') || key.includes('form')) {
            localStorage.removeItem(key);
          }
        });
      }
      return null;
    }
  },

  async saveForm(form: Partial<CustomForm>): Promise<CustomForm> {
    const { id, courseId, title, fields } = form;

    // Upsert form
    const { data: formData, error: formError } = await supabase
      .from('custom_forms')
      .upsert({ id, course_id: courseId, title, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (formError) throw formError;

    // Upsert fields
    if (fields) {
      const fieldPromises = fields.map(field =>
        supabase.from('form_fields').upsert({
          id: field.id,
          form_id: formData.id,
          label: field.label,
          field_type: field.fieldType,
          options: field.options,
          is_required: field.isRequired,
          order_number: field.order,
        })
      );
      await Promise.all(fieldPromises);
    }

    return this.getFormForCourse(formData.course_id) as Promise<CustomForm>;
  },

  async submitForm(submission: Omit<FormSubmission, 'id' | 'submittedAt'>): Promise<void> {
    const { formId, userId, answers } = submission;

    const { data: submissionData, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({ form_id: formId, user_id: userId })
      .select()
      .single();
    if (submissionError) throw submissionError;

    const answerPromises = answers.map(answer =>
      supabase.from('submission_answers').insert({
        submission_id: submissionData.id,
        field_id: answer.fieldId,
        answer_text: answer.answerText,
      })
    );
    await Promise.all(answerPromises);
  },

  async getSubmissionsForForm(formId: string): Promise<FormSubmission[]> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*, submission_answers(*, form_fields(label))')
      .eq('form_id', formId);

    if (error) throw error;

    return data.map(s => ({
        ...s,
        formId: s.form_id,
        userId: s.user_id,
        submittedAt: s.submitted_at,
        answers: s.submission_answers.map(a => ({
            ...a,
            submissionId: a.submission_id,
            fieldId: a.field_id,
            answerText: a.answer_text,
            label: a.form_fields.label,
        }))
    }));
  },
};
