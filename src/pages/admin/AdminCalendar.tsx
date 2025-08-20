import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, PlusCircle } from 'lucide-react';
import { classService, courseService, calendarService } from '@/services/api';
import { toast } from 'sonner';
import { Course } from '@/types';

interface ClassRow {
  id: string;
  name: string;
  courseName?: string;
  instructorName?: string;
  startDate?: string;
  endDate?: string;
}

type Target = { target_id: string, target_name: string, target_type: 'class' | 'student' };

const AdminCalendar = () => {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the event creation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
  });

  // Fetch all courses for the selector
  useEffect(() => {
    courseService.getCourses().then(setCourses).catch(() => toast.error("Failed to load courses."));
  }, []);

  // Fetch targets when a course is selected
  useEffect(() => {
    if (selectedCourse) {
      calendarService.getEventTargetsForCourse(selectedCourse)
        .then(setTargets)
        .catch(() => toast.error("Failed to load targets for the selected course."));
    } else {
      setTargets([]);
    }
  }, [selectedCourse]);


  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try to load all classes with course info
        const all = await classService.getAllClasses();
        if (all && all.length) {
          setClasses(
            all.map((c: any) => ({
              id: c.id,
              name: c.name,
              courseName: c.courseName,
              instructorName: c.instructorName,
              startDate: c.startDate,
              endDate: c.endDate,
            }))
          );
        } else {
          // Fallback: gather classes per course (older APIs)
          const courses = await courseService.getCoursesForAdmin?.();
          if (courses && Array.isArray(courses)) {
            const result: ClassRow[] = [];
            for (const course of courses) {
              const cls = await classService.getClassesForCourse(course.id);
              cls.forEach((c: any) =>
                result.push({
                  id: c.id,
                  name: c.name,
                  courseName: course.title,
                  instructorName: c.instructorName,
                  startDate: c.startDate,
                  endDate: c.endDate,
                })
              );
            }
            setClasses(result);
          } else {
            setClasses([]);
          }
        }
      } catch (e: any) {
        console.error(e);
        setError('Falha ao carregar turmas para o calendário.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedTarget || !eventData.title || !eventData.startTime || !eventData.endTime) {
      toast.error("Please fill all fields.");
      return;
    }

    const targetInfo = targets.find(t => t.target_id === selectedTarget);
    if (!targetInfo) {
      toast.error("Invalid target selected.");
      return;
    }

    try {
      await calendarService.createEvent({
        title: eventData.title,
        description: eventData.description,
        startTime: new Date(eventData.startTime).toISOString(),
        endTime: new Date(eventData.endTime).toISOString(),
        courseId: selectedCourse,
        classId: targetInfo.target_type === 'class' ? targetInfo.target_id : undefined,
        userId: targetInfo.target_type === 'student' ? targetInfo.target_id : undefined,
      });
      toast.success("Event created successfully!");
      setIsModalOpen(false);
      // Optionally, refresh the list of classes/events if needed
    } catch (error: any) {
      toast.error(`Failed to create event: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Calendário (Admin)</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Criar Evento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Novo Evento no Calendário</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateEvent}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Curso</Label>
                  <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                    <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Para (Turma ou Aluno)</Label>
                  <Select onValueChange={setSelectedTarget} value={selectedTarget} disabled={!selectedCourse}>
                    <SelectTrigger><SelectValue placeholder="Selecione o alvo do evento" /></SelectTrigger>
                    <SelectContent>
                      {targets.map(t => <SelectItem key={t.target_id} value={t.target_id}>{t.target_name} ({t.target_type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Evento</Label>
                  <Input id="title" value={eventData.title} onChange={e => setEventData({...eventData, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" value={eventData.description} onChange={e => setEventData({...eventData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Início</Label>
                    <Input id="startTime" type="datetime-local" value={eventData.startTime} onChange={e => setEventData({...eventData, startTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Fim</Label>
                    <Input id="endTime" type="datetime-local" value={eventData.endTime} onChange={e => setEventData({...eventData, endTime: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar Evento</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Turmas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Carregando turmas...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>{cls.courseName || '-'}</TableCell>
                      <TableCell>{cls.name}</TableCell>
                      <TableCell>{cls.instructorName || '-'}</TableCell>
                      <TableCell>{cls.startDate ? new Date(cls.startDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{cls.endDate ? new Date(cls.endDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link to={`/admin/class/${cls.id}/events`}>
                            <CalendarIcon className="h-4 w-4 mr-2" /> Gerenciar Eventos
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma turma encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCalendar;