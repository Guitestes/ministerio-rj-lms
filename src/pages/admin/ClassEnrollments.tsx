import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentService } from '@/services/enrollmentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

const ClassEnrollments = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEnrollments = async () => {
    if (!classId) return;
    setIsLoading(true);
    const data = await enrollmentService.getEnrollmentsForClass(classId);
    setEnrollments(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEnrollments();
  }, [classId]);

  const handleStatusChange = async (enrollmentId: string, status: string) => {
    const success = await enrollmentService.updateEnrollmentStatus(enrollmentId, status);
    if (success) {
      fetchEnrollments(); // Refresh the list
    }
  };

  if (isLoading) {
    return <div>Loading enrollments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Matrículas da Turma</h1>
        <Button onClick={() => navigate(-1)} variant="outline">
          Voltar
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Alunos Matriculados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>{enrollment.profile.name}</TableCell>
                  <TableCell>{enrollment.profile.email}</TableCell>
                  <TableCell>{enrollment.status}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">Alterar Status</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleStatusChange(enrollment.id, 'active')}>
                          Ativo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(enrollment.id, 'locked')}>
                          Trancar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(enrollment.id, 'cancelled')}>
                          Cancelar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(enrollment.id, 'withdrawn')}>
                          Desistente
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleStatusChange(enrollment.id, 'inactive')}>
                          Inativo/Evadido
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassEnrollments;
