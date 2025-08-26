export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  courseName: string;
  userName: string;
  courseHours?: number;
  issueDate: string;
  expiryDate?: string;
  certificateUrl?: string;
  certificateHtml?: string;
}

export interface Class {
  id: string;
  courseId: string;
  name: string;
  instructorId?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  courseId: string;
  classId?: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  duration?: string;
  videoUrl?: string;
  content?: string;
  order: number;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  enrolledAt: string;
  completedAt?: string;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}

export interface Profile {
  id: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  website?: string;
  cpf?: string;
  academicBackground?: string;
  professionalExperience?: string;
  qualifications?: Record<string, any>;
  teachingSpecialties?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  website?: string;
  createdAt: string;
}

export interface RecentCertificate {
  id: string;
  userId: string;
  courseId: string;
  issueDate: string;
  courseName: string;
  userName: string;
}

// Interfaces para dados da administração
export interface CourseForAdmin {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  instructor: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  status?: string;
  professor_id?: string;
  expiry_date?: string;
  enrolledCount: number; // Contagem de matrículas
  modulesCount: number; // Contagem de módulos
}

// Create data interfaces
export interface CreateCourseData {
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  instructor: string;
}

export interface CreateModuleData {
  title: string;
  description?: string;
  order: number;
}

export interface CreateLessonData {
  title: string;
  description?: string;
  duration?: string;
  videoUrl?: string;
  content?: string;
  order: number;
}

export interface CreateEnrollmentData {
  courseId: string;
}

export interface CreateLessonProgressData {
  lessonId: string;
  completed: boolean;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  instructor: string;
  enrolledCount: number;
  rating: number;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
  isEnrolled: boolean;
  progress: number;
  professorId?: string;
  status?: string;
  expiryDate?: string;
  syllabus?: string;
  bibliography?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  duration?: string;
  videoUrl?: string;
  content?: string;
  order: number;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  enrolledAt: string;
  completedAt?: string;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}



export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  website?: string;
  createdAt: string;
}

export interface RecentCertificate {
  id: string;
  userId: string;
  courseId: string;
  issueDate: string;
  courseName: string;
  userName: string;
}

// Interfaces para dados da administração
export interface CourseForAdmin {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  instructor: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  status?: string;
  professor_id?: string;
  expiry_date?: string;
  enrolledCount: number; // Contagem de matrículas
  modulesCount: number; // Contagem de módulos
}

// Create data interfaces
export interface CreateCourseData {
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  instructor: string;
}

export interface CreateModuleData {
  title: string;
  description?: string;
  order: number;
}

export interface CreateLessonData {
  title: string;
  description?: string;
  duration?: string;
  videoUrl?: string;
  content?: string;
  order: number;
}

export interface CreateEnrollmentData {
  courseId: string;
}

export interface CreateLessonProgressData {
  lessonId: string;
  completed: boolean;
}
