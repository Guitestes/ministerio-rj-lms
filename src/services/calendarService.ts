import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/types/index';

export const calendarService = {
  async createEvent(eventData: Partial<Omit<CalendarEvent, 'id'>>): Promise<CalendarEvent> {
    // Validate required fields
    if (!eventData.title?.trim()) throw new Error('Title is required');
    if (!eventData.startTime) throw new Error('Start time is required');
    if (!eventData.endTime) throw new Error('End time is required');
    if (!eventData.courseId && !eventData.classId && !eventData.userId) {
      throw new Error('A target (Course, Class, or User) is required.');
    }

    // Validate time order
    if (new Date(eventData.startTime) >= new Date(eventData.endTime)) {
      throw new Error('End time must be after start time');
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: eventData.userId || null,
        class_id: eventData.classId || null,
        course_id: eventData.courseId || null,
        module_id: eventData.moduleId || null,
        room_id: eventData.roomId || null,
        title: eventData.title.trim(),
        description: eventData.description?.trim() || null,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
    
    return { 
      ...data, 
      classId: data.class_id, 
      courseId: data.course_id,
      moduleId: data.module_id,
      roomId: data.room_id,
      startTime: data.start_time, 
      endTime: data.end_time 
    };
  },

  async getEventsForClass(classId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        rooms(name, location),
        courses(title),
        modules(title),
        classes(name)
      `)
      .eq('class_id', classId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(e => ({ 
      ...e, 
      classId: e.class_id, 
      courseId: e.course_id,
      moduleId: e.module_id,
      roomId: e.room_id,
      startTime: e.start_time, 
      endTime: e.end_time,
      room: e.rooms ? { id: e.room_id, name: e.rooms.name, location: e.rooms.location } : undefined,
      courseName: e.courses?.title,
      moduleName: e.modules?.title,
      className: e.classes?.name,
    }));
  },

  async getEventsForUser(userId: string): Promise<CalendarEvent[]> {
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('user_id', userId);

    if (enrollmentsError) throw enrollmentsError;
    if (!enrollments) return [];

    const classIds = enrollments.map(e => e.class_id);

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        rooms(name, location),
        courses(title),
        modules(title),
        classes(name)
      `)
      .in('class_id', classIds)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(e => ({ 
      ...e, 
      classId: e.class_id, 
      courseId: e.course_id,
      moduleId: e.module_id,
      roomId: e.room_id,
      startTime: e.start_time, 
      endTime: e.end_time,
      room: e.rooms ? { id: e.room_id, name: e.rooms.name, location: e.rooms.location } : undefined,
      courseName: e.courses?.title,
      moduleName: e.modules?.title,
      className: e.classes?.name,
    }));
  },

  async updateEvent(eventId: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    // Validate required fields if provided
    if (eventData.title !== undefined && !eventData.title?.trim()) {
      throw new Error('Title is required');
    }

    // Validate time order if both times are provided
    if (eventData.startTime && eventData.endTime) {
      if (new Date(eventData.startTime) >= new Date(eventData.endTime)) {
        throw new Error('End time must be after start time');
      }
    }

    const updateData: any = {};
    
    // Only include fields that are defined
    if (eventData.courseId !== undefined) updateData.course_id = eventData.courseId || null;
    if (eventData.moduleId !== undefined) updateData.module_id = eventData.moduleId || null;
    if (eventData.roomId !== undefined) updateData.room_id = eventData.roomId || null;
    if (eventData.title !== undefined) updateData.title = eventData.title.trim();
    if (eventData.description !== undefined) updateData.description = eventData.description?.trim() || null;
    if (eventData.startTime !== undefined) updateData.start_time = eventData.startTime;
    if (eventData.endTime !== undefined) updateData.end_time = eventData.endTime;
    if (eventData.location !== undefined) updateData.location = eventData.location?.trim() || null;

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
    
    return { 
      ...data, 
      classId: data.class_id, 
      courseId: data.course_id,
      moduleId: data.module_id,
      roomId: data.room_id,
      startTime: data.start_time, 
      endTime: data.end_time 
    };
  },

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  },

  async getEventTargetsForCourse(courseId: string): Promise<{ target_id: string, target_name: string, target_type: 'class' | 'student' }[]> {
    try {
      const targets: { target_id: string, target_name: string, target_type: 'class' | 'student' }[] = [];
      
      // Get all classes for this course
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('course_id', courseId);
      
      if (classesError) {
        console.error('Error fetching classes:', classesError);
      } else if (classes) {
        classes.forEach(cls => {
          targets.push({
            target_id: cls.id,
            target_name: cls.name,
            target_type: 'class'
          });
        });
      }
      
      // Get all students enrolled in classes of this course
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          profiles!inner(id, name)
        `)
        .eq('course_id', courseId);
      
      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
      } else if (enrollments) {
        // Remove duplicates by user_id
        const uniqueStudents = new Map();
        enrollments.forEach(enrollment => {
          if (enrollment.profiles && !uniqueStudents.has(enrollment.user_id)) {
            const profile = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
            if (profile) {
              uniqueStudents.set(enrollment.user_id, {
                target_id: profile.id,
                target_name: profile.name,
                target_type: 'student' as const
              });
            }
          }
        });
        targets.push(...Array.from(uniqueStudents.values()));
      }
      
      return targets;
    } catch (error) {
      console.error('Error fetching event targets:', error);
      throw new Error('Failed to fetch event targets.');
    }
  },

  async getEventsForProfessor(professorId: string): Promise<CalendarEvent[]> {
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id')
      .eq('instructor_id', professorId);

    if (classesError) throw classesError;
    if (!classes || classes.length === 0) return [];

    const classIds = classes.map(c => c.id);

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        status,
        courses(title),
        classes(name)
      `)
      .in('class_id', classIds)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(e => ({
      ...e,
      startTime: e.start_time,
      endTime: e.end_time,
      courseName: e.courses?.title,
      className: e.classes?.name,
    }));
  },

  // New methods for room scheduling features
  async getEventsForRoom(roomId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        rooms(name, location),
        courses(title),
        modules(title),
        classes(name)
      `)
      .eq('room_id', roomId);

    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('end_time', endDate);

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data.map(e => ({ 
      ...e, 
      classId: e.class_id, 
      courseId: e.course_id,
      moduleId: e.module_id,
      roomId: e.room_id,
      startTime: e.start_time, 
      endTime: e.end_time,
      room: e.rooms ? { id: e.room_id, name: e.rooms.name, location: e.rooms.location } : undefined,
      courseName: e.courses?.title,
      moduleName: e.modules?.title,
      className: e.classes?.name,
    }));
  },

  async getEventsForCourse(courseId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        rooms(name, location),
        courses(title),
        modules(title),
        classes(name)
      `)
      .eq('course_id', courseId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(e => ({ 
      ...e, 
      classId: e.class_id, 
      courseId: e.course_id,
      moduleId: e.module_id,
      roomId: e.room_id,
      startTime: e.start_time, 
      endTime: e.end_time,
      room: e.rooms ? { id: e.room_id, name: e.rooms.name, location: e.rooms.location } : undefined,
      courseName: e.courses?.title,
      moduleName: e.modules?.title,
      className: e.classes?.name,
    }));
  },

  async getEventsForModule(moduleId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        rooms(name, location),
        courses(title),
        modules(title),
        classes(name)
      `)
      .eq('module_id', moduleId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(e => ({ 
      ...e, 
      classId: e.class_id, 
      courseId: e.course_id,
      moduleId: e.module_id,
      roomId: e.room_id,
      startTime: e.start_time, 
      endTime: e.end_time,
      room: e.rooms ? { id: e.room_id, name: e.rooms.name, location: e.rooms.location } : undefined,
      courseName: e.courses?.title,
      moduleName: e.modules?.title,
      className: e.classes?.name,
    }));
  },
};
