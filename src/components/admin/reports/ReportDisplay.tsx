import { useState } from 'react';
import { ReportKey } from '@/components/admin/ReportFilters';
import { ReportDataTable, ColumnDef } from './ReportDataTable';
import { ReportChart } from './ReportChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RetentionActionForm from '@/components/admin/retention/RetentionActionForm';

interface ReportDisplayProps {
  reportKey: ReportKey | 'none';
  data: any | null;
  isLoading: boolean;
  error: string | null;
}

// A specific component for the quantitative summary to show stats cards
const QuantitativeSummaryDisplay = ({ data }: { data: any }) => {
    if (!data || data.length === 0) return <p>Nenhum dado de resumo quantitativo.</p>;
    const summary = data[0];
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg bg-card">
                <h3 className="text-sm font-medium text-muted-foreground">Cursos</h3>
                <p className="text-2xl font-bold">{summary.course_count}</p>
            </div>
            <div className="p-4 border rounded-lg bg-card">
                <h3 className="text-sm font-medium text-muted-foreground">Turmas</h3>
                <p className="text-2xl font-bold">{summary.class_count}</p>
            </div>
            <div className="p-4 border rounded-lg bg-card">
                <h3 className="text-sm font-medium text-muted-foreground">Aulas</h3>
                <p className="text-2xl font-bold">{summary.lesson_count}</p>
            </div>
        </div>
    );
};


export function ReportDisplay({ reportKey, data, isLoading, error }: ReportDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleOpenModal = (student: any) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erro ao Gerar Relatório</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }

  if (reportKey === 'none' || !data) {
    return (
      <div className="text-center text-muted-foreground p-8 h-full flex items-center justify-center">
        <p>Selecione os filtros e clique em "Gerar Relatório" para ver os resultados.</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (reportKey) {
      case 'quantitative_summary':
        return <QuantitativeSummaryDisplay data={data} />;

      case 'enrollment_by_role': {
        const enrollmentColumns: ColumnDef<any>[] = [
          { accessorKey: 'user_role', header: 'Cargo' },
          { accessorKey: 'enrollment_count', header: 'Nº de Inscrições' },
        ];
        const chartData = data.map((d: any) => ({ name: d.user_role, value: Number(d.enrollment_count) }));
        return (
          <div className="space-y-6">
            <ReportChart data={chartData} chartType="pie" title="Inscrições por Cargo" categoryKey="name" valueKey="value" />
            <ReportDataTable columns={enrollmentColumns} data={data} />
          </div>
        );
      }
      case 'students_per_class': {
        const studentColumns: ColumnDef<any>[] = [
          { accessorKey: 'user_name', header: 'Nome do Aluno' },
          { accessorKey: 'enrollment_status', header: 'Status' },
          { accessorKey: 'progress', header: 'Progresso (%)' },
        ];
        return <ReportDataTable columns={studentColumns} data={data} />;
      }
      case 'final_grades': {
        const gradeColumns: ColumnDef<any>[] = [
          { accessorKey: 'user_name', header: 'Aluno' },
          { accessorKey: 'course_title', header: 'Curso' },
          { accessorKey: 'quiz_title', header: 'Avaliação' },
          { accessorKey: 'score', header: 'Nota' },
        ];
        return <ReportDataTable columns={gradeColumns} data={data} />;
      }
      case 'dropouts': {
        const dropoutColumns: ColumnDef<any>[] = [
          { accessorKey: 'profile.name', header: 'Nome do Aluno' },
          { accessorKey: 'status', header: 'Status da Matrícula' },
          { accessorKey: 'profile.email', header: 'Email' },
          {
            id: 'actions',
            header: 'Ações',
            cell: ({ row }) => (
              <Button variant="outline" size="sm" onClick={() => handleOpenModal(row.original)}>
                Registrar Ação
              </Button>
            ),
          },
        ];
        return <ReportDataTable columns={dropoutColumns} data={data} />;
      }
      case 'near_completion':
      case 'attendance_list': {
        const attendanceColumns: ColumnDef<any>[] = [
          { accessorKey: 'user_name', header: 'Nome do Aluno' },
          { accessorKey: 'present_count', header: 'Presenças' },
          { accessorKey: 'absent_count', header: 'Faltas' },
          { accessorKey: 'justified_absence_count', header: 'Faltas Justificadas' },
          {
            accessorKey: 'attendance_rate',
            header: 'Taxa de Frequência (%)',
            cell: ({ row }) => `${parseFloat(row.original.attendance_rate).toFixed(2)}%`,
          },
          {
            accessorKey: 'absence_rate',
            header: 'Taxa de Faltas (%)',
            cell: ({ row }) => `${parseFloat(row.original.absence_rate).toFixed(2)}%`,
          },
          {
            accessorKey: 'justified_absence_rate',
            header: 'Taxa de Faltas Justificadas (%)',
            cell: ({ row }) => `${parseFloat(row.original.justified_absence_rate).toFixed(2)}%`,
          },
        ];
        return <ReportDataTable columns={attendanceColumns} data={data} />;
      }
      case 'retention_by_cohort': {
        const retentionColumns: ColumnDef<any>[] = [
          { accessorKey: 'cohort', header: 'Cohort (Mês)' },
          { accessorKey: 'total_students', header: 'Total de Alunos' },
          { accessorKey: 'retention_rate_month_1', header: 'Retenção Mês 1 (%)' },
          { accessorKey: 'retention_rate_month_3', header: 'Retenção Mês 3 (%)' },
          { accessorKey: 'retention_rate_month_6', header: 'Retenção Mês 6 (%)' },
        ];
        const chartDataRetention = data.map((d: any) => ({
          name: d.cohort,
          'Retenção Mês 1': parseFloat(d.retention_rate_month_1),
          'Retenção Mês 3': parseFloat(d.retention_rate_month_3),
          'Retenção Mês 6': parseFloat(d.retention_rate_month_6),
        }));
        return (
          <div className="space-y-6">
            <ReportChart
              data={chartDataRetention}
              chartType="line"
              title="Taxa de Retenção por Cohort"
              categoryKey="name"
              valueKey={['Retenção Mês 1', 'Retenção Mês 3', 'Retenção Mês 6']}
            />
            <ReportDataTable columns={retentionColumns} data={data} />
          </div>
        );
      }
      case 'student_risk_profile': {
        const riskColumns: ColumnDef<any>[] = [
          {
            accessorKey: 'risk_score',
            header: 'Risco de Evasão (%)',
            cell: ({ row }) => {
              const score = parseFloat(row.original.risk_score);
              const color = score > 70 ? 'text-red-500' : score > 40 ? 'text-yellow-500' : 'text-green-500';
              return <span className={`font-bold ${color}`}>{score.toFixed(2)}%</span>;
            },
          },
          { accessorKey: 'user_name', header: 'Nome do Aluno' },
          {
            accessorKey: 'attendance_rate',
            header: 'Frequência (%)',
            cell: ({ row }) => `${parseFloat(row.original.attendance_rate).toFixed(2)}%`,
          },
          {
            accessorKey: 'average_grade',
            header: 'Média de Notas',
            cell: ({ row }) => `${parseFloat(row.original.average_grade).toFixed(2)}`,
          },
          { accessorKey: 'days_since_last_activity', header: 'Dias Inativo' },
        ];
        // Sort data by risk score descending
        const sortedData = [...data].sort((a, b) => b.risk_score - a.risk_score);
        return <ReportDataTable columns={riskColumns} data={sortedData} />;
      }
      case 'document_lifecycle':
      case 'document_issuance_summary': {
        const docColumns: ColumnDef<any>[] = [
          { accessorKey: 'document_type_br', header: 'Tipo de Documento' },
          { accessorKey: 'issuance_count', header: 'Quantidade Emitida' },
        ];
        const docChartData = data.map((d: any) => ({ name: d.document_type_br, value: Number(d.issuance_count) }));
        return (
          <div className="space-y-6">
            <ReportChart data={docChartData} chartType="pie" title="Documentos Emitidos por Tipo" categoryKey="name" valueKey="value" />
            <ReportDataTable columns={docColumns} data={data} />
          </div>
        );
      }

      default:
        return <p>Visualização para este tipo de relatório ainda não implementada.</p>;
    }
  };

  return (
    <div className="p-1">
      {renderContent()}
      {selectedStudent && (
        <RetentionActionForm
          student={selectedStudent}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
