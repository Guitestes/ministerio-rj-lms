import { supabase } from '@/integrations/supabase/client';

// Interfaces para os relatórios
export interface QuantitativeSummary {
  period_label: string;
  total_courses: number;
  total_classes: number;
  total_lessons: number;
  total_completed_lessons: number;
  origin: string;
  nature: string;
}

export interface EvaluationResults {
  evaluation_type: string;
  course_name: string;
  class_name: string;
  average_rating: number;
  total_evaluations: number;
  rating_distribution: {
    rating_1: number;
    rating_2: number;
    rating_3: number;
    rating_4: number;
    rating_5: number;
  };
}

export interface AcademicWorksSummary {
  period_label: string;
  total_works: number;
  origin: string;
  nature: string;
  average_grade: number;
}

export interface CertificatesSummary {
  period_label: string;
  course_name: string;
  total_certificates: number;
  internal_certificates: number;
  moodle_certificates: number;
}

export interface EnrollmentByPosition {
  period_label: string;
  position_name: string;
  position_category: string;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
}

export interface ClassTrackingReport {
  class_id: string;
  class_name: string;
  course_name: string;
  segment_name: string;
  start_date: string;
  end_date: string;
  class_status: string;
  total_students: number;
  active_students: number;
  completed_students: number;
  not_started_students: number;
  near_completion_students: number;
  average_progress: number;
}

export interface StudentsPerClassReport {
  class_id: string;
  class_name: string;
  course_name: string;
  segment_name: string;
  student_name: string;
  student_email: string;
  position_name: string;
  enrolled_at: string;
  enrollment_status: string;
  progress: number;
  completed_at: string;
  progress_status: string;
}

export interface DropoutStudents {
  student_id: string;
  student_name: string;
  student_email: string;
  class_name: string;
  course_name: string;
  segment_name: string;
  enrollment_date: string;
  progress_percentage: number;
  last_access: string;
  position_name: string;
}

export interface TrainedStudentsByPeriod {
  period_label: string;
  student_id: string;
  student_name: string;
  completed_courses: number;
  total_hours: number;
  position_name: string;
}

export interface StudentsNearCompletion {
  student_id: string;
  student_name: string;
  student_email: string;
  class_name: string;
  course_name: string;
  segment_name: string;
  progress_percentage: number;
  remaining_percentage: number;
  estimated_completion_date: string;
  position_name: string;
}

export interface FinalGradesReport {
  student_id: string;
  student_name: string;
  course_name: string;
  class_name: string;
  segment_name: string;
  final_grade: number;
  grade_status: string;
  completion_date: string;
  position_name: string;
}

export interface WorkloadByClass {
  class_id: string;
  class_name: string;
  course_name: string;
  segment_name: string;
  total_students: number;
  course_workload_hours: number;
  total_workload_hours: number;
  average_progress: number;
  class_status: string;
}

export interface CertificationReport {
  course_name: string;
  segment_name: string;
  total_enrolled: number;
  total_completed: number;
  total_certified: number;
  certification_percentage: number;
  completion_percentage: number;
}

export interface AttendanceList {
  student_id: string;
  student_name: string;
  student_email: string;
  course_name: string;
  class_name: string;
  enrollment_date: string;
  attendance_percentage: number;
  total_lessons: number;
  attended_lessons: number;
  position_name: string;
}

export interface TutorPayments {
  tutor_id: string;
  tutor_name: string;
  course_name: string;
  class_name: string;
  total_lessons: number;
  total_evaluations: number;
  lesson_payment: number;
  evaluation_payment: number;
  total_payment: number;
  period_start: string;
  period_end: string;
}

export interface StatisticalReport {
  period: string;
  total_students: number;
  total_courses: number;
  total_classes: number;
  active_students: number;
  completed_courses: number;
}

export interface TrainingHoursReport {
  student_id?: string;
  student_name?: string;
  course_id?: string;
  course_name?: string;
  course_type: string; // 'presencial' | 'online'
  total_hours: number;
  completed_hours: number;
  progress_percentage: number;
  period: string;
}

export interface ExpenseReport {
  course_id: string;
  course_name: string;
  class_id: string;
  class_name: string;
  course_type: string;
  tutor_expenses: number;
  resource_expenses: number;
  total_expenses: number;
  period: string;
}

export const reportService = {
  // 3.1.3.1. Quantitativo de cursos, turmas, disciplinas e aulas
  async getQuantitativeSummary(
    startDate?: string,
    endDate?: string,
    origin?: string,
    nature?: string,
    periodType: 'daily' | 'monthly' | 'annual' = 'monthly'
  ): Promise<QuantitativeSummary[]> {
    const { data, error } = await supabase.rpc('get_quantitative_summary', {
      start_date_param: startDate,
      end_date_param: endDate,
      origin_param: origin,
      nature_param: nature,
      period_type: periodType
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.2. Resultado das avaliações
  async getEvaluationResults(
    startDate?: string,
    endDate?: string,
    evaluationType?: string,
    courseId?: string
  ): Promise<EvaluationResults[]> {
    const { data, error } = await supabase.rpc('get_evaluation_results', {
      start_date_param: startDate,
      end_date_param: endDate,
      evaluation_type_param: evaluationType,
      course_id_param: courseId
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.3. Quantitativo de trabalhos acadêmicos
  async getAcademicWorksSummary(
    startDate?: string,
    endDate?: string,
    origin?: string,
    nature?: string,
    periodType: 'daily' | 'monthly' | 'annual' = 'monthly'
  ): Promise<AcademicWorksSummary[]> {
    const { data, error } = await supabase.rpc('get_academic_works_summary', {
      start_date_param: startDate,
      end_date_param: endDate,
      origin_param: origin,
      nature_param: nature,
      period_type: periodType
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.4. Quantitativo de certificados
  async getCertificatesSummary(
    startDate?: string,
    endDate?: string,
    courseId?: string,
    periodType: 'daily' | 'monthly' | 'annual' = 'monthly'
  ): Promise<CertificatesSummary[]> {
    const { data, error } = await supabase.rpc('get_certificates_summary', {
      start_date_param: startDate,
      end_date_param: endDate,
      course_id_param: courseId,
      period_type: periodType
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.5. Quantitativo de inscritos por cargo
  async getEnrollmentByPosition(
    startDate?: string,
    endDate?: string,
    courseId?: string,
    periodType: 'daily' | 'monthly' | 'annual' = 'monthly'
  ): Promise<EnrollmentByPosition[]> {
    const { data, error } = await supabase.rpc('get_enrollment_by_position', {
      start_date_param: startDate,
      end_date_param: endDate,
      course_id_param: courseId,
      period_type: periodType
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.1. Relatórios para acompanhamento de turmas
  async getClassTrackingReport(
    courseId?: string,
    segment?: string,
    status?: string
  ): Promise<ClassTrackingReport[]> {
    let query = supabase
      .from('class_tracking_report')
      .select('*');

    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    if (segment) {
      query = query.eq('segment_name', segment);
    }
    if (status) {
      query = query.eq('class_status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.2. Quantidade de Alunos por Turma
  async getStudentsPerClassReport(
    courseId?: string,
    classId?: string,
    segment?: string,
    status?: string
  ): Promise<StudentsPerClassReport[]> {
    let query = supabase
      .from('students_per_class_report')
      .select('*');

    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (segment) {
      query = query.eq('segment_name', segment);
    }
    if (status) {
      query = query.eq('enrollment_status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.5. Alunos Desistentes
  async getDropoutStudents(
    classId?: string,
    courseId?: string,
    segment?: string,
    minFrequency: number = 75
  ): Promise<DropoutStudents[]> {
    const { data, error } = await supabase.rpc('get_dropout_students', {
      class_id_param: classId,
      course_id_param: courseId,
      segment_param: segment,
      min_frequency: minFrequency
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.6. Alunos Treinados por Período
  async getTrainedStudentsByPeriod(
    startDate?: string,
    endDate?: string,
    periodType: 'trimester' | 'semester' = 'trimester'
  ): Promise<TrainedStudentsByPeriod[]> {
    const { data, error } = await supabase.rpc('get_trained_students_by_period', {
      start_date_param: startDate,
      end_date_param: endDate,
      period_type: periodType
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.7. Alunos em Fase de Conclusão
  async getStudentsNearCompletion(
    classId?: string,
    courseId?: string,
    segment?: string,
    minProgress: number = 80,
    maxProgress: number = 99
  ): Promise<StudentsNearCompletion[]> {
    const { data, error } = await supabase.rpc('get_students_near_completion', {
      class_id_param: classId,
      course_id_param: courseId,
      segment_param: segment,
      min_progress: minProgress,
      max_progress: maxProgress
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.11. Avaliações - Nota Final
  async getFinalGradesReport(
    courseId?: string,
    classId?: string,
    segment?: string,
    startDate?: string,
    endDate?: string
  ): Promise<FinalGradesReport[]> {
    const { data, error } = await supabase.rpc('get_final_grades_report', {
      course_id_param: courseId,
      class_id_param: classId,
      segment_param: segment,
      start_date_param: startDate,
      end_date_param: endDate
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.12. Carga Horária - Turma
  async getWorkloadByClass(
    courseId?: string,
    classId?: string,
    segment?: string,
    status?: string
  ): Promise<WorkloadByClass[]> {
    const { data, error } = await supabase.rpc('get_workload_by_class', {
      course_id_param: courseId,
      class_id_param: classId,
      segment_param: segment,
      status_param: status
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.13. Certificação
  async getCertificationReport(
    courseId?: string,
    segment?: string,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<CertificationReport[]> {
    const { data, error } = await supabase.rpc('get_certification_report', {
      course_id_param: courseId,
      segment_param: segment,
      start_date_param: startDate,
      end_date_param: endDate,
      status_param: status
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.14. Lista de Presença
  async getAttendanceList(
    courseId?: string,
    classId?: string
  ): Promise<AttendanceList[]> {
    const { data, error } = await supabase.rpc('get_attendance_list', {
      course_id_param: courseId,
      class_id_param: classId
    });

    if (error) throw error;
    return data || [];
  },

  // 3.1.3.6.18. Pagamento de tutores
  async getTutorPayments(
    courseId?: string,
    classId?: string,
    tutorId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<TutorPayments[]> {
    const { data, error } = await supabase.rpc('get_tutor_payments', {
      course_id_param: courseId,
      class_id_param: classId,
      tutor_id_param: tutorId,
      start_date_param: startDate,
      end_date_param: endDate
    });

    if (error) throw error;
    return data || [];
  },

  // Relatórios adicionais e estatísticos
  async getStatisticalReport(
    startDate?: string,
    endDate?: string
  ): Promise<StatisticalReport[]> {
    const { data, error } = await supabase.rpc('get_statistical_report', {
      start_date_param: startDate,
      end_date_param: endDate
    });

    if (error) throw error;
    return data || [];
  },

  async getTrainingHoursReport(
    startDate?: string,
    endDate?: string,
    courseId?: string,
    studentId?: string,
    courseType?: 'presencial' | 'online'
  ): Promise<TrainingHoursReport[]> {
    const { data, error } = await supabase.rpc('get_training_hours_report', {
      start_date_param: startDate,
      end_date_param: endDate,
      course_id_param: courseId,
      student_id_param: studentId,
      course_type_param: courseType
    });

    if (error) throw error;
    return data || [];
  },

  async getExpenseReport(
    courseId?: string,
    classId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExpenseReport[]> {
    const { data, error } = await supabase.rpc('get_expense_report', {
      course_id_param: courseId,
      class_id_param: classId,
      start_date_param: startDate,
      end_date_param: endDate
    });

    if (error) throw error;
    return data || [];
  },

  // Funções auxiliares para filtros
  async getCourseSegments(): Promise<{ id: string; name: string; description: string }[]> {
    const { data, error } = await supabase
      .from('course_segments')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getUserPositions(): Promise<{ id: string; name: string; category: string }[]> {
    const { data, error } = await supabase
      .from('user_positions')
      .select('id, name, category')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getCourses(): Promise<{ id: string; title: string; segment_name: string }[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        course_segments(name)
      `)
      .eq('status', 'active')
      .order('title');

    if (error) throw error;
    return data?.map(course => ({
      id: course.id,
      title: course.title,
      segment_name: course.course_segments?.[0]?.name || 'Não informado'
    })) || [];
  },

  async getClasses(courseId?: string): Promise<{ id: string; name: string; course_name: string }[]> {
    let query = supabase
      .from('classes')
      .select(`
        id,
        name,
        courses(title)
      `);
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data, error } = await query.order('name');

    if (error) throw error;
    return data?.map(cls => ({
      id: cls.id,
      name: cls.name,
      course_name: cls.courses?.[0]?.title || 'Não informado'
    })) || [];
  },

  // Acompanhamento Discente - Alunos que não iniciaram o treinamento
  async getStudentProgress(
    courseId?: string,
    classId?: string,
    segment?: string
  ): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_student_progress', {
      course_id_param: courseId,
      class_id_param: classId,
      segment_param: segment
    });

    if (error) throw error;
    return data || [];
  },

  // Alunos Cadastrados - Todos os alunos cadastrados no sistema
  async getRegisteredStudents(
    courseId?: string,
    classId?: string,
    segment?: string
  ): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_registered_students', {
      course_id_param: courseId,
      class_id_param: classId,
      segment_param: segment
    });

    if (error) throw error;
    return data || [];
  }
};
