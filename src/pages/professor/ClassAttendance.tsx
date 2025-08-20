import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceService } from '@/services/attendanceService';
import { enrollmentService } from '@/services/enrollmentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ClassAttendance = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'justified'>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      attendanceService.getClassesForProfessor(user.id).then(setClasses);
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      setIsLoading(true);
      enrollmentService.getEnrollmentsForClass(selectedClass).then(enrollments => {
        setStudents(enrollments);
        // Pre-fill attendance with 'present' for all students
        const initialAttendance: Record<string, 'present' | 'absent' | 'justified'> = {};
        enrollments.forEach(e => {
          initialAttendance[e.user_id] = 'present';
        });
        setAttendance(initialAttendance);
        setIsLoading(false);
      });
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && eventDate) {
      setIsLoading(true);
      attendanceService.getAttendanceForClassOnDate(selectedClass, eventDate).then(records => {
        if (records.length > 0) {
          const loadedAttendance: Record<string, 'present' | 'absent' | 'justified'> = {};
          records.forEach(r => {
            loadedAttendance[r.user_id] = r.status;
          });
          setAttendance(prev => ({ ...prev, ...loadedAttendance }));
        }
        setIsLoading(false);
      });
    }
  }, [selectedClass, eventDate]);

  const handleAttendanceChange = (userId: string, status: 'present' | 'absent' | 'justified') => {
    setAttendance(prev => ({ ...prev, [userId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!user || !selectedClass || !eventDate) return;

    const recordsToSave = students.map(student => ({
      class_id: selectedClass,
      user_id: student.user_id,
      event_date: eventDate,
      status: attendance[student.user_id] || 'present',
      recorded_by: user.id,
    }));

    await attendanceService.saveAttendance(recordsToSave);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Registro de Frequência</h1>
      <Card>
        <CardHeader>
          <CardTitle>Selecione a Turma e a Data</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="w-1/2">
            <Label>Turma</Label>
            <Select onValueChange={setSelectedClass} value={selectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.courses.title} - {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-1/2">
            <Label>Data da Aula</Label>
            <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <p>Carregando...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => (
                    <TableRow key={student.user_id}>
                      <TableCell>{student.profile.name}</TableCell>
                      <TableCell>
                        <RadioGroup
                          value={attendance[student.user_id] || 'present'}
                          onValueChange={(status) => handleAttendanceChange(student.user_id, status as any)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="present" id={`present-${student.user_id}`} />
                            <Label htmlFor={`present-${student.user_id}`}>Presente</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="absent" id={`absent-${student.user_id}`} />
                            <Label htmlFor={`absent-${student.user_id}`}>Ausente</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="justified" id={`justified-${student.user_id}`} />
                            <Label htmlFor={`justified-${student.user_id}`}>Justificado</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Button onClick={handleSaveAttendance} className="mt-4">Salvar Frequência</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassAttendance;
