import { supabase } from '@/integrations/supabase/client';

import type { AudiovisualMaterial } from '@/types/database';

export const audiovisualMaterialService = {
  async uploadMaterial(lessonId: string, file: File): Promise<AudiovisualMaterial> {
    const filePath = `materials/${lessonId}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audiovisual_materials')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('audiovisual_materials')
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('audiovisual_materials')
      .insert({
        lesson_id: lessonId,
        file_url: publicUrl,
        file_type: file.type,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMaterialsByLesson(lessonId: string): Promise<AudiovisualMaterial[]> {
    const { data, error } = await supabase
      .from('audiovisual_materials')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async deleteMaterial(materialId: string): Promise<void> {
    const { data: material, error: fetchError } = await supabase
      .from('audiovisual_materials')
      .select('file_url')
      .eq('id', materialId)
      .single();

    if (fetchError) throw fetchError;

    const filePath = material.file_url.split('/').slice(-2).join('/');

    const { error: deleteError } = await supabase.storage
      .from('audiovisual_materials')
      .remove([filePath]);

    if (deleteError) throw deleteError;

    const { error } = await supabase
      .from('audiovisual_materials')
      .delete()
      .eq('id', materialId);

    if (error) throw error;
  }
};