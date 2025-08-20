import { Class } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export interface CreateClassData {
  courseId: string;
  name: string;
  instructorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateClassData {
  name?: string;
  instructorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ClassWithDetails extends Class {
  instructorName?: string;
  courseName?: string;
}

export const classService = {
  // Get all classes for a specific course
  async getClassesForCourse(courseId: string): Promise<ClassWithDetails[]> {
    if (!courseId) return [];
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          instructor:profiles!classes_instructor_id_fkey(id, name)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id || '',
        courseId: c.course_id || '',
        name: c.name || '',
        instructorId: c.instructor_id || undefined,
        instructorName: c.instructor?.name || undefined,
        startDate: c.start_date || undefined,
        endDate: c.end_date || undefined,
        createdAt: c.created_at || '',
        updatedAt: c.updated_at || '',
      }));
    } catch (error) {
      console.error('Error fetching classes for course:', error);
      throw new Error('Failed to fetch classes for course');
    }
  },

  // Get a single class by ID
  async getClassById(classId: string): Promise<ClassWithDetails | null> {
    if (!classId) return null;
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          instructor:profiles!classes_instructor_id_fkey(id, name)
        `)
        .eq('id', classId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      return {
        id: data.id || '',
        courseId: data.course_id || '',
        name: data.name || '',
        instructorId: data.instructor_id || undefined,
        instructorName: data.instructor?.name || undefined,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        createdAt: data.created_at || '',
        updatedAt: data.updated_at || '',
      };
    } catch (error) {
      console.error('Error fetching class by ID:', error);
      throw new Error('Failed to fetch class');
    }
  },

  // Create a new class
  async createClass(classData: CreateClassData): Promise<ClassWithDetails> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          course_id: classData.courseId,
          name: classData.name,
          instructor_id: classData.instructorId || null,
          start_date: classData.startDate || null,
          end_date: classData.endDate || null,
        })
        .select(`
          *,
          instructor:profiles!classes_instructor_id_fkey(id, name)
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        courseId: data.course_id,
        name: data.name,
        instructorId: data.instructor_id || undefined,
        instructorName: data.instructor?.name || undefined,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating class:', error);
      throw new Error('Failed to create class');
    }
  },

  // Update an existing class
  async updateClass(classId: string, classData: UpdateClassData): Promise<ClassWithDetails> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (classData.name !== undefined) updateData.name = classData.name;
      if (classData.instructorId !== undefined) updateData.instructor_id = classData.instructorId || null;
      if (classData.startDate !== undefined) updateData.start_date = classData.startDate || null;
      if (classData.endDate !== undefined) updateData.end_date = classData.endDate || null;

      const { data, error } = await supabase
        .from('classes')
        .update(updateData)
        .eq('id', classId)
        .select(`
          *,
          instructor:profiles!classes_instructor_id_fkey(id, name)
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        courseId: data.course_id,
        name: data.name,
        instructorId: data.instructor_id || undefined,
        instructorName: data.instructor?.name || undefined,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error updating class:', error);
      throw new Error('Failed to update class');
    }
  },

  // Delete a class
  async deleteClass(classId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting class:', error);
      throw new Error('Failed to delete class');
    }
  },

  // Get all classes (for admin overview)
  async getAllClasses(): Promise<ClassWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          instructor:profiles!classes_instructor_id_fkey(id, name),
          course:courses(id, title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id || '',
        courseId: c.course_id || '',
        courseName: c.course?.title || '',
        name: c.name || '',
        instructorId: c.instructor_id || undefined,
        instructorName: c.instructor?.name || undefined,
        startDate: c.start_date || undefined,
        endDate: c.end_date || undefined,
        createdAt: c.created_at || '',
        updatedAt: c.updated_at || '',
      }));
    } catch (error) {
      console.error('Error fetching all classes:', error);
      throw new Error('Failed to fetch classes');
    }
  }
};