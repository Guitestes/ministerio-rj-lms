import { supabase } from '@/integrations/supabase/client';

import type { LessonPlan } from '@/types/database';

export const lessonPlanService = {
  async createLessonPlan(lessonId: string, planData: Partial<LessonPlan>): Promise<LessonPlan> {
    const { data, error } = await supabase
      .from('lesson_plans')
      .insert({
        lesson_id: lessonId,
        content: planData.content,
        document_links: planData.document_links || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLessonPlan(lessonId: string): Promise<LessonPlan | null> {
    const { data, error } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async updateLessonPlan(planId: string, updates: Partial<LessonPlan>): Promise<LessonPlan> {
    const { data, error } = await supabase
      .from('lesson_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addDocumentLink(planId: string, link: string): Promise<LessonPlan> {
    const current = await this.getLessonPlanById(planId);
    if (!current) throw new Error('Plano de aula não encontrado');

    const newLinks = [...(current.document_links || []), link];

    return this.updateLessonPlan(planId, { document_links: newLinks });
  },

  async getLessonPlanById(planId: string): Promise<LessonPlan | null> {
    const { data, error } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
};