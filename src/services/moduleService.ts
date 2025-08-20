import { Module, Lesson } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { requestQueue } from '@/utils/requestQueue';
import { cacheManager } from '@/utils/cacheManager';
import type { 
  ExtendedModule, 
  CreateModuleForm, 
  QuizData 
} from '@/types/professor';

export const moduleService = {
  async getAllModules(): Promise<Module[]> {
    try {
      // Primeiro, buscar todos os módulos
      const { data, error } = await supabase
        .from('modules')
        .select('id, title, description, order_number, course_id')
        .order('title', { ascending: true });

      if (error) throw error;
      if (!data) throw new Error('Nenhum módulo encontrado');

      // Para cada módulo, buscar suas aulas
      const modulesWithLessons = await Promise.all(data.map(async (module) => {
        try {
          // Buscar aulas para este módulo
          const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('id, module_id, title, description, duration, video_url, content, order_number')
            .eq('module_id', module.id)
            .order('order_number', { ascending: true });

          if (lessonsError) {
            console.error(`Erro ao buscar aulas para o módulo ${module.id}:`, lessonsError);
            return {
              id: module.id,
              title: module.title,
              description: module.description || '',
              order: module.order_number,
              courseId: module.course_id,
              lessons: []
            };
          }

          return {
            id: module.id,
            title: module.title,
            description: module.description || '',
            order: module.order_number,
            courseId: module.course_id,
            lessons: (lessons || []).map(lesson => ({
              id: lesson.id,
              moduleId: lesson.module_id,
              title: lesson.title,
              description: lesson.description || '',
              duration: lesson.duration || '',
              videoUrl: lesson.video_url || '',
              content: lesson.content || '',
              order: lesson.order_number,
              isCompleted: false
            }))
          };
        } catch (error) {
          console.error(`Erro ao processar módulo ${module.id}:`, error);
          return {
            id: module.id,
            title: module.title,
            description: module.description || '',
            order: module.order_number,
            courseId: module.course_id,
            lessons: []
          };
        }
      }));

      return modulesWithLessons;
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
      throw new Error('Falha ao buscar módulos');
    }
  },

  async getModulesByCourseId(courseId: string, userId?: string): Promise<Module[]> {
    if (!courseId) throw new Error('ID do curso é obrigatório');

    console.log(`DIAGNÓSTICO: Buscando módulos e aulas do curso ${courseId}...`);
    
    try {
      // Verificar se existe sistema de turmas e se o usuário está matriculado
      let userClassId: string | null = null;
      
      if (userId) {
        console.log(`DIAGNÓSTICO: Verificando matrícula do usuário ${userId} em turmas do curso ${courseId}...`);
        
        // Buscar as turmas deste curso
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id')
          .eq('course_id', courseId);

        if (!classesError && classes && classes.length > 0) {
          const classIds = classes.map(c => c.id);
          
          // Verificar se o usuário está matriculado em alguma dessas turmas
          const { data: enrollment, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('user_id', userId)
            .in('class_id', classIds)
            .maybeSingle();

          if (!enrollmentError && enrollment) {
            userClassId = enrollment.class_id;
            console.log(`DIAGNÓSTICO: Usuário matriculado na turma ${userClassId}`);
          } else {
            console.log(`DIAGNÓSTICO: Usuário não está matriculado em nenhuma turma deste curso`);
          }
        } else {
          console.log(`DIAGNÓSTICO: Curso não possui turmas ou erro ao buscar turmas:`, classesError);
        }
      }
      
      // Consulta simples aos módulos do curso (sem join para evitar 400 e bloqueio da rota)
      // Adicionando lógica de cache leve para evitar chamadas repetidas e timing issues
      const cacheKey = `modules_${courseId}`;
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        console.log('DIAGNÓSTICO: Retornando módulos do cache para o curso', courseId);
        return cached as Module[];
      }

      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, description, order_number, course_id')
        .eq('course_id', courseId)
        .order('order_number', { ascending: true });
      
      if (modulesError) {
        console.error(`DIAGNÓSTICO: Erro ao buscar módulos do curso ${courseId}:`, modulesError);
        return [];
      }
      
      if (!modules || modules.length === 0) {
        console.log('DIAGNÓSTICO: Nenhum módulo encontrado para o curso:', courseId);
        // Evitar cachear vazio para permitir novas tentativas
        return [];
      }
      
      console.log(`DIAGNÓSTICO: Encontrados ${modules.length} módulos. Buscando aulas...`);
      
      // Obter todas as aulas em uma única consulta
      const moduleIds = modules.map(m => m.id);
      console.log(`DIAGNÓSTICO: Buscando aulas para ${moduleIds.length} módulos de uma vez...`);
      
      const { data: allLessons, error: allLessonsError } = await supabase
        .from('lessons')
        .select('id, module_id, title, description, duration, video_url, content, order_number')
        .in('module_id', moduleIds)
        .order('order_number', { ascending: true });
        
      if (allLessonsError) {
        console.error(`DIAGNÓSTICO: Erro ao buscar todas as aulas:`, allLessonsError);
      } else {
        console.log(`DIAGNÓSTICO: Encontradas ${allLessons?.length || 0} aulas no total`);
      }
      
      // Agrupar aulas por módulo
      const lessonsByModule = new Map<string, any[]>();
      if (allLessons && Array.isArray(allLessons) && allLessons.length > 0) {
        allLessons.forEach(lesson => {
          if (!lessonsByModule.has(lesson.module_id)) {
            lessonsByModule.set(lesson.module_id, []);
          }
          lessonsByModule.get(lesson.module_id)!.push(lesson);
        });
      }
      
      // Montar a estrutura final
      const modulesWithLessons: Module[] = modules.map((module) => {
        const moduleLessons = lessonsByModule.get(module.id) || [];
        console.log(`DIAGNÓSTICO: Módulo ${module.title} (${module.id}) tem ${moduleLessons.length} aulas`);
        
        return {
          id: module.id,
          title: module.title,
          description: module.description || '',
          order: module.order_number,
          courseId: module.course_id,
          lessons: moduleLessons.map(lesson => ({
            id: lesson.id,
            moduleId: lesson.module_id,
            title: lesson.title,
            description: lesson.description || '',
            duration: lesson.duration || '',
            videoUrl: lesson.video_url || '',
            content: lesson.content || '',
            order: lesson.order_number,
            isCompleted: false
          }))
        };
      });

      const sorted = modulesWithLessons.sort((a, b) => a.order - b.order);
      cacheManager.set(cacheKey, sorted, 60); // cache por 60s
      return sorted;
    } catch (error) {
      console.error('DIAGNÓSTICO: Erro ao buscar módulos do curso:', error);
      // Retornar array vazio em vez de lançar erro para evitar quebrar a UI
      return [];
    }
  },

  async createModule(courseId: string, moduleData: CreateModuleForm): Promise<ExtendedModule> {
    if (!courseId) throw new Error('ID do curso é obrigatório');
    if (!moduleData?.title?.trim()) throw new Error('Título do módulo é obrigatório');

    try {
      const { data, error } = await supabase
        .from('modules')
        .insert({
          course_id: courseId,
          title: moduleData.title.trim(),
          description: moduleData.description?.trim() || '',
          order_number: moduleData.order,
          has_quiz: moduleData.hasQuiz || false,
          quiz_data: moduleData.quizData ? JSON.stringify(moduleData.quizData) : null,
          syllabus: moduleData.syllabus?.trim() || null,
          bibliography: moduleData.bibliography?.trim() || null
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Nenhum dado retornado após criar o módulo');

      // Limpar o cache para este curso
      cacheManager.remove(`modules_${courseId}`);

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        order: data.order_number,
        courseId: data.course_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        hasQuiz: data.has_quiz || false,
        quizData: data.quiz_data ? JSON.parse(data.quiz_data) : null,
        lessonsCount: 0,
        lessons: [],
        syllabus: data.syllabus || null,
        bibliography: data.bibliography || null
      };
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      throw new Error('Falha ao criar módulo');
    }
  },

  async updateModule(moduleId: string, moduleData: { 
    title?: string; 
    description?: string; 
    order?: number 
  }): Promise<void> {
    if (!moduleId) throw new Error('ID do módulo é obrigatório');

    const updates: Record<string, any> = {};
    
    if (moduleData.title !== undefined) {
      if (!moduleData.title.trim()) {
        throw new Error('Título do módulo não pode ficar vazio');
      }
      updates.title = moduleData.title.trim();
    }
    
    if (moduleData.description !== undefined) {
      updates.description = moduleData.description.trim();
    }
    
    if (moduleData.order !== undefined) {
      updates.order_number = moduleData.order;
    }

    try {
      // Primeiro, obter o módulo para saber o courseId
      const { data: moduleInfo, error: moduleError } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      if (!moduleInfo) throw new Error('Módulo não encontrado');

      const courseId = moduleInfo.course_id;

      // Atualizar o módulo
      const { error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', moduleId);

      if (error) throw error;

      // Limpar o cache para este curso
      cacheManager.remove(`modules_${courseId}`);
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      throw new Error('Falha ao atualizar módulo');
    }
  },

  async deleteModule(moduleId: string): Promise<void> {
    if (!moduleId) throw new Error('ID do módulo é obrigatório');

    try {
      // Primeiro, obter o módulo para saber o courseId
      const { data: moduleInfo, error: moduleError } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      if (!moduleInfo) throw new Error('Módulo não encontrado');

      const courseId = moduleInfo.course_id;

      // Excluir o módulo
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      // Limpar o cache para este curso
      cacheManager.remove(`modules_${courseId}`);
    } catch (error) {
      console.error('Erro ao excluir módulo:', error);
      throw new Error('Falha ao excluir módulo');
    }
  },

  // Novas funções para professores
  async getModuleById(moduleId: string): Promise<ExtendedModule> {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          lessons(count)
        `)
        .eq('id', moduleId)
        .single();

      if (error) {
        console.error('Erro ao buscar módulo:', error);
        throw new Error('Erro ao buscar módulo');
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        order: data.order_number,
        courseId: data.course_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        hasQuiz: data.has_quiz || false,
        quizData: data.quiz_data ? JSON.parse(data.quiz_data) : null,
        lessonsCount: data.lessons?.[0]?.count || 0,
        lessons: [],
        syllabus: data.syllabus || null,
        bibliography: data.bibliography || null
      };
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      throw new Error('Erro ao buscar módulo');
    }
  },

  async updateModuleExtended(moduleId: string, moduleData: Partial<CreateModuleForm>): Promise<ExtendedModule> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (moduleData.title) updateData.title = moduleData.title;
      if (moduleData.description !== undefined) updateData.description = moduleData.description;
      if (moduleData.order !== undefined) updateData.order_number = moduleData.order;
      if (moduleData.hasQuiz !== undefined) updateData.has_quiz = moduleData.hasQuiz;
      if (moduleData.quizData !== undefined) {
        updateData.quiz_data = moduleData.quizData ? JSON.stringify(moduleData.quizData) : null;
      }
      if (moduleData.syllabus !== undefined) updateData.syllabus = moduleData.syllabus?.trim() || null;
      if (moduleData.bibliography !== undefined) updateData.bibliography = moduleData.bibliography?.trim() || null;

      const { data, error } = await supabase
        .from('modules')
        .update(updateData)
        .eq('id', moduleId)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar módulo:', error);
        throw new Error('Erro ao atualizar módulo');
      }

      // Limpar o cache para este curso
      cacheManager.remove(`modules_${data.course_id}`);

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        order: data.order_number,
        courseId: data.course_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        hasQuiz: data.has_quiz || false,
        quizData: data.quiz_data ? JSON.parse(data.quiz_data) : null,
        lessonsCount: 0,
        lessons: [],
        syllabus: data.syllabus || null,
        bibliography: data.bibliography || null
      };
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      throw new Error('Erro ao atualizar módulo');
    }
  },

  async getModulesByCourseExtended(courseId: string): Promise<ExtendedModule[]> {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          lessons(count)
        `)
        .eq('course_id', courseId)
        .order('order_number', { ascending: true });

      if (error) {
        console.error('Erro ao buscar módulos:', error);
        throw new Error('Erro ao buscar módulos');
      }

      return data.map(module => ({
        id: module.id,
        title: module.title,
        description: module.description || '',
        order: module.order_number,
        courseId: module.course_id,
        createdAt: module.created_at,
        updatedAt: module.updated_at,
        hasQuiz: module.has_quiz || false,
        quizData: module.quiz_data ? JSON.parse(module.quiz_data) : null,
        lessonsCount: module.lessons?.[0]?.count || 0,
        lessons: [],
        syllabus: module.syllabus || null,
        bibliography: module.bibliography || null
      }));
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
      throw new Error('Erro ao buscar módulos');
    }
  },

  async updateModuleOrder(moduleId: string, newOrder: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ 
          order_number: newOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', moduleId);

      if (error) {
        console.error('Erro ao atualizar ordem do módulo:', error);
        throw new Error('Erro ao atualizar ordem do módulo');
      }
    } catch (error) {
      console.error('Erro ao atualizar ordem do módulo:', error);
      throw new Error('Erro ao atualizar ordem do módulo');
    }
  }
};
