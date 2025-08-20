import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { moduleService, lessonProgressService, documentService, certificateService } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Lesson, Module, CourseDocument } from "@/types/index";
import VideoPlayer from "@/components/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Award, ChevronRight, FileText, ClipboardCheck, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AcademicWorkSubmission } from "@/components/aluno/AcademicWorkSubmission";
import { AcademicWorksList } from "@/components/aluno/AcademicWorksList";

// Interfaces aninhadas para maior clareza
namespace CoursePlayerInterfaces {
  export interface LessonAttachment {
    id: string;
    lessonId: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedAt?: string;
  }

  export interface QuizData {
    title: string;
    description?: string;
    timeLimit?: number;
    passingScore: number;
    questions: any[]; // Manter genérico para simplicidade
  }

  export interface ExtendedLesson extends Lesson {
    attachments?: LessonAttachment[];
    isCompleted: boolean;
  }

  export interface ExtendedModule extends Module {
    lessons: ExtendedLesson[];
    hasQuiz?: boolean;
    quizData?: QuizData;
  }

  export interface CourseState {
    modules: ExtendedModule[];
    selectedModule: ExtendedModule | null;
    selectedLesson: ExtendedLesson | null;
    courseName: string;
    courseDocuments: CourseDocument[];
    progress: number;
    userId: string | null;
    classId: string | null;
    isEligibleForCertificate: boolean;
    certificateId: string | null;
    loading: boolean;
    error: string | null;
  }
}

// Usando as interfaces definidas
type CourseState = CoursePlayerInterfaces.CourseState;
type ExtendedModule = CoursePlayerInterfaces.ExtendedModule;
type ExtendedLesson = CoursePlayerInterfaces.ExtendedLesson;

const CoursePlayer = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<CourseState>({
    modules: [],
    selectedModule: null,
    selectedLesson: null,
    courseName: '',
    courseDocuments: [],
    progress: 0,
    userId: null,
    classId: null,
    isEligibleForCertificate: false,
    certificateId: null,
    loading: true,
    error: null,
  });

  const [showCongratulations, setShowCongratulations] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [refreshDocuments, setRefreshDocuments] = useState(0);

  const updateState = useCallback((updates: Partial<CourseState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const loadCourseData = useCallback(async (userId: string) => {
    if (!courseId) return;

    try {
      // Carregar dados essenciais em paralelo
      const [courseDetails, modulesData, documentsData, classEnrollment] = await Promise.all([
        supabase.from('courses').select('title').eq('id', courseId).single(),
        moduleService.getModulesByCourseId(courseId, userId),
        documentService.getDocumentsByCourse(courseId),
        supabase.from('enrollments').select('class_id').eq('user_id', userId).eq('course_id', courseId).maybeSingle()
      ]);

      if (courseDetails.error) throw new Error('Curso não encontrado.');
      
      const { totalLessons, completedLessonsCount } = countLessons(modulesData);
      const progress = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

      const { firstModule, firstLesson } = selectFirstAvailableLesson(modulesData);

      updateState({
        courseName: courseDetails.data.title,
        modules: modulesData as ExtendedModule[],
        courseDocuments: documentsData,
        classId: classEnrollment.data?.class_id || null,
        progress,
        selectedModule: firstModule,
        selectedLesson: firstLesson,
        loading: false,
      });

      if (progress === 100) {
        const cert = await certificateService.getCertificates(userId, courseId);
        if (cert && cert.length > 0) {
          updateState({ isEligibleForCertificate: true, certificateId: cert[0].id });
        } else {
          updateState({ isEligibleForCertificate: true });
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados do curso:', error);
      updateState({ error: error.message || 'Falha ao carregar o curso.', loading: false });
    }
  }, [courseId, updateState]);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      updateState({ loading: true, error: null });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("Você precisa estar logado para acessar esta página.");
        navigate('/login');
        return;
      }
      updateState({ userId: user.id });
      loadCourseData(user.id);
    };
    checkUserAndLoadData();
  }, [courseId, loadCourseData, navigate, updateState]);

  const countLessons = (modules: Module[]) => {
    let total = 0;
    let completed = 0;
    modules.forEach(m => {
      total += m.lessons?.length || 0;
      completed += m.lessons?.filter(l => (l as ExtendedLesson).isCompleted).length || 0;
    });
    return { totalLessons: total, completedLessonsCount: completed };
  };

  const selectFirstAvailableLesson = (modules: Module[]) => {
    const firstModule = modules.find(m => m.lessons && m.lessons.length > 0) || null;
    const firstLesson = firstModule?.lessons?.[0] || null;
    return { firstModule, firstLesson };
  };

  const handleSelectLesson = (module: ExtendedModule, lesson: ExtendedLesson) => {
    updateState({ selectedModule: module, selectedLesson: lesson });
  };

  const handleMarkAsCompleted = async () => {
    if (!state.selectedLesson || !courseId || !state.userId) return;

    const { selectedLesson, userId, modules } = state;

    try {
      await lessonProgressService.markLessonAsCompleted(userId, selectedLesson.id);

      const updatedModules = modules.map(m => ({
        ...m,
        lessons: m.lessons.map(l => l.id === selectedLesson.id ? { ...l, isCompleted: true } : l)
      }));

      const { totalLessons, completedLessonsCount } = countLessons(updatedModules);
      const newProgress = Math.round((completedLessonsCount / totalLessons) * 100);

      updateState({
        modules: updatedModules,
        progress: newProgress,
        selectedLesson: { ...selectedLesson, isCompleted: true }
      });

      await supabase.from('enrollments').update({ progress: newProgress }).match({ user_id: userId, course_id: courseId });

      if (newProgress === 100) {
        updateState({ isEligibleForCertificate: true });
        setShowCongratulations(true);
        // Tenta gerar o certificado em background
        generateCertificate();
      }
      toast.success('Aula marcada como concluída!');
    } catch (error) {
      toast.error('Erro ao marcar aula como concluída.');
    }
  };

  const { canGoToPrevious, canGoToNext } = useMemo(() => {
    if (!state.selectedModule || !state.selectedLesson) return { canGoToPrevious: false, canGoToNext: false };
    const lessonIndex = state.selectedModule.lessons.findIndex(l => l.id === state.selectedLesson!.id);
    return {
      canGoToPrevious: lessonIndex > 0,
      canGoToNext: lessonIndex < state.selectedModule.lessons.length - 1
    };
  }, [state.selectedModule, state.selectedLesson]);

  const handlePreviousLesson = () => {
    if (!canGoToPrevious || !state.selectedModule || !state.selectedLesson) return;
    const lessonIndex = state.selectedModule.lessons.findIndex(l => l.id === state.selectedLesson!.id);
    updateState({ selectedLesson: state.selectedModule.lessons[lessonIndex - 1] });
  };

  const handleNextLesson = () => {
    if (!canGoToNext || !state.selectedModule || !state.selectedLesson) return;
    const lessonIndex = state.selectedModule.lessons.findIndex(l => l.id === state.selectedLesson!.id);
    updateState({ selectedLesson: state.selectedModule.lessons[lessonIndex + 1] });
  };

  const generateCertificate = async () => {
    if (!state.userId || !courseId) return null;
    try {
      const newCert = await certificateService.generateCertificate(state.userId, courseId);
      if (newCert) {
        updateState({ certificateId: newCert.id });
        toast.success('Certificado gerado com sucesso!');
        return newCert.id;
      }
      return null;
    } catch (error) {
      // O erro já é tratado no service, mas podemos adicionar um log aqui se necessário.
      console.error("Falha ao gerar certificado no CoursePlayer:", error);
      return null;
    }
  };

  const goToCertificate = async () => {
    let certId = state.certificateId;
    if (!certId && state.isEligibleForCertificate) {
      certId = await generateCertificate();
    }
    if (certId) {
      navigate(`/aluno/certificado/${certId}`);
    } else {
      toast.error('Não foi possível acessar o certificado. Tente novamente em alguns instantes.');
    }
  };

  // Renderização do componente
  if (state.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Carregando curso...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Dialog open={showCongratulations} onOpenChange={setShowCongratulations}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Award className="h-6 w-6 text-yellow-500" />Parabéns!</DialogTitle>
            <DialogDescription>Você concluiu o curso <strong>{state.courseName}</strong>!</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p>Você está elegível para receber seu certificado.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCongratulations(false)}>Fechar</Button>
            <Button onClick={goToCertificate}><Award className="mr-2 h-4 w-4" /> Ver Certificado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle>Módulos e Aulas</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1"><span>Progresso</span><span>{state.progress}%</span></div>
                <Progress value={state.progress} />
              </div>
              {state.progress === 100 && (
                <Alert className="mb-4 border-green-500 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Curso Concluído!</AlertTitle>
                  <AlertDescription>
                    Parabéns! <Button variant="link" className="p-0 h-auto" onClick={goToCertificate}>Clique aqui</Button> para ver seu certificado.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {state.modules.map((module) => (
                  <div key={module.id}>
                    <h3 className="font-semibold p-2 bg-muted rounded-t-md">{module.title}</h3>
                    <ul className="border border-t-0 rounded-b-md">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <button
                            onClick={() => handleSelectLesson(module, lesson)}
                            className={`w-full text-left p-2 text-sm flex justify-between items-center ${state.selectedLesson?.id === lesson.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                          >
                            {lesson.title}
                            {lesson.isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {state.courseDocuments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Documentos do Curso</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {state.courseDocuments.map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                        <FileText className="h-4 w-4 mr-2" />
                        {doc.documentName}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </aside>

        <main className="lg:col-span-3 space-y-6">
          {state.selectedLesson ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{state.selectedLesson.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">Módulo: {state.selectedModule?.title}</p>
                </CardHeader>
                <CardContent>
                  {state.selectedLesson.videoUrl ? (
                    <VideoPlayer url={state.selectedLesson.videoUrl} />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-muted rounded-md">
                      <p>Sem vídeo para esta aula.</p>
                    </div>
                  )}
                  {state.selectedLesson.content && (
                    <div className="prose max-w-none mt-4" dangerouslySetInnerHTML={{ __html: state.selectedLesson.content }} />
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handlePreviousLesson} disabled={!canGoToPrevious}>Aula Anterior</Button>
                <Button
                  onClick={handleMarkAsCompleted}
                  disabled={state.selectedLesson.isCompleted}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {state.selectedLesson.isCompleted ? <><CheckCircle className="mr-2 h-4 w-4" />Concluída</> : 'Marcar como Concluída'}
                </Button>
                <Button onClick={handleNextLesson} disabled={!canGoToNext}>Próxima Aula <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </div>

              {state.selectedLesson.attachments && state.selectedLesson.attachments.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Anexos da Aula</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {state.selectedLesson.attachments.map((att) => (
                        <li key={att.id}>
                          <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                            <FileText className="h-4 w-4 mr-2" />
                            {att.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {state.classId && state.userId && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Trabalhos Acadêmicos</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setShowDocumentForm(!showDocumentForm)}>
                        <Upload className="mr-2 h-4 w-4" />
                        {showDocumentForm ? 'Fechar Envio' : 'Enviar Trabalho'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showDocumentForm && (
                      <div className="mb-4">
                        <AcademicWorkSubmission
                          classId={state.classId}
                          userId={state.userId}
                          onUploadSuccess={() => {
                            setRefreshDocuments(prev => prev + 1);
                            setShowDocumentForm(false);
                            toast.success("Trabalho enviado com sucesso!");
                          }}
                        />
                      </div>
                    )}
                    <AcademicWorksList
                      classId={state.classId}
                      userId={state.userId}
                      key={refreshDocuments}
                    />
                  </CardContent>
                </Card>
              )}

            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <h2 className="text-xl font-semibold">Bem-vindo ao {state.courseName}</h2>
                <p className="text-muted-foreground">Selecione uma aula para começar.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default CoursePlayer;