import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText, BarChart3, Filter, Calendar, Users, GraduationCap, Award, Clock, DollarSign } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { toast } from 'sonner';

interface FilterOptions {
  courses: { id: string; title: string; segment_name: string }[];
  classes: { id: string; name: string; course_name: string }[];
  segments: { id: string; name: string; description: string }[];
  positions: { id: string; name: string; category: string }[];
}

const AdminReports = () => {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Filtros
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [periodType, setPeriodType] = useState<'daily' | 'monthly' | 'annual'>('monthly');
  const [evaluationType, setEvaluationType] = useState<string>('all');
  const [origin, setOrigin] = useState<string>('all');
  const [nature, setNature] = useState<string>('all');
  const [minFrequency, setMinFrequency] = useState<number>(75);
  const [courseType, setCourseType] = useState<'presencial' | 'online' | 'all'>('all');
  
  // Opções de filtro
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    courses: [],
    classes: [],
    segments: [],
    positions: []
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedCourse !== 'all') {
      loadClassesForCourse(selectedCourse);
    } else {
      // Limpar turmas quando "Todos os cursos" for selecionado
      setFilterOptions(prev => ({ ...prev, classes: [] }));
    }
  }, [selectedCourse]);

  const loadFilterOptions = async () => {
    try {
      const [courses, segments, positions] = await Promise.all([
        reportService.getCourses(),
        reportService.getCourseSegments(),
        reportService.getUserPositions()
      ]);
      
      setFilterOptions({
        courses,
        classes: [],
        segments,
        positions
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
      toast.error('Erro ao carregar opções de filtro');
    }
  };

  const loadClassesForCourse = async (courseId: string) => {
    try {
      const classes = await reportService.getClasses(courseId);
      setFilterOptions(prev => ({ ...prev, classes }));
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Erro ao carregar turmas');
    }
  };

  const reportTypes = {
    basic: [
      { value: 'quantitative_summary', label: 'Resumo Quantitativo', icon: BarChart3, description: 'Cursos, turmas, disciplinas e aulas por período' },
      { value: 'evaluation_results', label: 'Resultados de Avaliações', icon: GraduationCap, description: 'Avaliações de alunos, professores e instituição' },
      { value: 'academic_works', label: 'Trabalhos Acadêmicos', icon: FileText, description: 'Quantitativo de trabalhos por origem e natureza' },
      { value: 'certificates_summary', label: 'Certificados', icon: Award, description: 'Certificados internos e do Moodle' },
      { value: 'enrollment_by_position', label: 'Inscrições por Cargo', icon: Users, description: 'Inscrições segmentadas por cargo dos usuários' }
    ],
    tracking: [
      { value: 'class_tracking', label: 'Acompanhamento de Turmas', icon: Users, description: 'Status e progresso das turmas' },
      { value: 'students_per_class', label: 'Alunos por Turma', icon: Users, description: 'Listagem detalhada de alunos por turma' },
      { value: 'student_progress', label: 'Acompanhamento Discente', icon: BarChart3, description: 'Alunos que não iniciaram o treinamento' },
      { value: 'registered_students', label: 'Alunos Cadastrados', icon: Users, description: 'Todos os alunos cadastrados no sistema' },
      { value: 'dropout_students', label: 'Alunos Desistentes', icon: Users, description: 'Alunos com baixa frequência' }
    ],
    performance: [
      { value: 'trained_students', label: 'Alunos Treinados por Período', icon: GraduationCap, description: 'Cursos concluídos por trimestre/semestre' },
      { value: 'near_completion', label: 'Alunos em Fase de Conclusão', icon: Clock, description: 'Alunos com 80-99% de progresso' },
      { value: 'final_grades', label: 'Notas Finais', icon: GraduationCap, description: 'Avaliações e notas finais dos alunos' },
      { value: 'workload_by_class', label: 'Carga Horária por Turma', icon: Clock, description: 'Informações de carga horária das turmas' },
      { value: 'certification_report', label: 'Relatório de Certificação', icon: Award, description: 'Percentual de alunos certificados' }
    ],
    administrative: [
      { value: 'attendance_list', label: 'Lista de Presença', icon: Users, description: 'Controle de presença por curso/turma' },
      { value: 'tutor_payments', label: 'Pagamento de Tutores', icon: DollarSign, description: 'Pagamentos devidos aos tutores' },
      { value: 'statistical_report', label: 'Relatório Estatístico', icon: BarChart3, description: 'Estatísticas gerais do sistema' },
      { value: 'training_hours', label: 'Horas de Treinamento', icon: Clock, description: 'Total de horas presenciais e online' },
      { value: 'expense_report', label: 'Relatório de Gastos', icon: DollarSign, description: 'Gastos por disciplina/turma' }
    ]
  };

  // Helper function to convert "all" to null for API calls
  const getFilterValue = (value: string) => value === 'all' ? null : value;

  const generateReport = async () => {
    if (!selectedReport) {
      toast.error('Selecione um tipo de relatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: any[] = [];
      
      // Convert filter values
      const courseId = getFilterValue(selectedCourse);
      const classId = getFilterValue(selectedClass);
      const segment = getFilterValue(selectedSegment);
      const status = getFilterValue(selectedStatus);
      const evalType = getFilterValue(evaluationType);
      const originFilter = getFilterValue(origin);
      const natureFilter = getFilterValue(nature);

      switch (selectedReport) {
        case 'quantitative_summary':
          data = await reportService.getQuantitativeSummary(startDate, endDate, originFilter, natureFilter, periodType);
          break;
        case 'evaluation_results':
          data = await reportService.getEvaluationResults(startDate, endDate, evalType, courseId);
          break;
        case 'academic_works':
          data = await reportService.getAcademicWorksSummary(startDate, endDate, originFilter, natureFilter, periodType);
          break;
        case 'certificates_summary':
          data = await reportService.getCertificatesSummary(startDate, endDate, courseId, periodType);
          break;
        case 'enrollment_by_position':
          data = await reportService.getEnrollmentByPosition(startDate, endDate, courseId, periodType);
          break;
        case 'class_tracking':
          data = await reportService.getClassTrackingReport(courseId, segment, status);
          break;
        case 'students_per_class':
          data = await reportService.getStudentsPerClassReport(courseId, classId, segment, status);
          break;
        case 'dropout_students':
          data = await reportService.getDropoutStudents(classId, courseId, segment, minFrequency);
          break;
        case 'student_progress':
          data = await reportService.getStudentProgress(courseId, classId, segment);
          break;
        case 'registered_students':
          data = await reportService.getRegisteredStudents(courseId, classId, segment);
          break;
        case 'trained_students':
          data = await reportService.getTrainedStudentsByPeriod(startDate, endDate, periodType === 'monthly' ? 'trimester' : 'semester');
          break;
        case 'near_completion':
          data = await reportService.getStudentsNearCompletion(classId, courseId, segment);
          break;
        case 'final_grades':
          data = await reportService.getFinalGradesReport(courseId, classId, segment, startDate, endDate);
          break;
        case 'workload_by_class':
          data = await reportService.getWorkloadByClass(courseId, classId, segment, status);
          break;
        case 'certification_report':
          data = await reportService.getCertificationReport(courseId, segment, startDate, endDate, status);
          break;
        case 'attendance_list':
          data = await reportService.getAttendanceList(courseId, classId);
          break;
        case 'tutor_payments':
          data = await reportService.getTutorPayments(courseId, classId, undefined, startDate, endDate);
          break;
        case 'statistical_report':
          data = await reportService.getStatisticalReport(startDate, endDate);
          break;
        case 'training_hours':
          data = await reportService.getTrainingHoursReport(startDate, endDate, courseId, undefined, getFilterValue(courseType) as 'presencial' | 'online');
          break;
        case 'expense_report':
          data = await reportService.getExpenseReport(courseId, classId, startDate, endDate);
          break;
        default:
          throw new Error('Tipo de relatório não implementado');
      }

      setReportData(data);
      toast.success(`Relatório gerado com sucesso! ${data.length} registros encontrados.`);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Erro ao gerar relatório. Verifique os filtros e tente novamente.');
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          const stringValue = String(value || '');
          return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCourse('all');
    setSelectedClass('all');
    setSelectedSegment('all');
    setSelectedPosition('all');
    setSelectedStatus('all');
    setPeriodType('monthly');
    setEvaluationType('all');
    setOrigin('all');
    setNature('all');
    setMinFrequency(75);
    setCourseType('all');
  };

  const getSelectedReportInfo = () => {
    const allReports = [...reportTypes.basic, ...reportTypes.tracking, ...reportTypes.performance, ...reportTypes.administrative];
    return allReports.find(report => report.value === selectedReport);
  };

  const renderFilters = () => {
    const reportInfo = getSelectedReportInfo();
    if (!reportInfo) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros - {reportInfo.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Filtros de Data */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Tipo de Período */}
            {['quantitative_summary', 'academic_works', 'certificates_summary', 'enrollment_by_position'].includes(selectedReport) && (
              <div className="space-y-2">
                <Label htmlFor="period-type">Tipo de Período</Label>
                <Select value={periodType} onValueChange={(value: 'daily' | 'monthly' | 'annual') => setPeriodType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Curso */}
            <div className="space-y-2">
              <Label htmlFor="course-select">Curso</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os cursos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cursos</SelectItem>
                  {filterOptions.courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title} ({course.segment_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Turma */}
            {selectedCourse && selectedCourse !== 'all' && (
              <div className="space-y-2">
                <Label htmlFor="class-select">Turma</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {filterOptions.classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Segmento */}
            <div className="space-y-2">
              <Label htmlFor="segment-select">Segmento</Label>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os segmentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os segmentos</SelectItem>
                  {filterOptions.segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.name}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            {['class_tracking', 'students_per_class', 'workload_by_class', 'certification_report'].includes(selectedReport) && (
              <div className="space-y-2">
                <Label htmlFor="status-select">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tipo de Avaliação */}
            {selectedReport === 'evaluation_results' && (
              <div className="space-y-2">
                <Label htmlFor="evaluation-type">Tipo de Avaliação</Label>
                <Select value={evaluationType} onValueChange={setEvaluationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="institution">Instituição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Origem */}
            {['quantitative_summary', 'academic_works'].includes(selectedReport) && (
              <div className="space-y-2">
                <Label htmlFor="origin">Origem</Label>
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as origens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as origens</SelectItem>
                    <SelectItem value="internal">Interno</SelectItem>
                    <SelectItem value="moodle">Moodle</SelectItem>
                    <SelectItem value="external">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Natureza */}
            {['quantitative_summary', 'academic_works'].includes(selectedReport) && (
              <div className="space-y-2">
                <Label htmlFor="nature">Natureza</Label>
                <Select value={nature} onValueChange={setNature}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as naturezas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as naturezas</SelectItem>
                    <SelectItem value="assignment">Trabalho</SelectItem>
                    <SelectItem value="project">Projeto</SelectItem>
                    <SelectItem value="thesis">Tese</SelectItem>
                    <SelectItem value="exam">Exame</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Frequência Mínima */}
            {selectedReport === 'dropout_students' && (
              <div className="space-y-2">
                <Label htmlFor="min-frequency">Frequência Mínima (%)</Label>
                <Input
                  id="min-frequency"
                  type="number"
                  min="0"
                  max="100"
                  value={minFrequency}
                  onChange={(e) => setMinFrequency(Number(e.target.value))}
                />
              </div>
            )}

            {/* Tipo de Curso */}
            {selectedReport === 'training_hours' && (
              <div className="space-y-2">
                <Label htmlFor="course-type">Tipo de Curso</Label>
                <Select value={courseType} onValueChange={(value: 'presencial' | 'online' | 'all') => setCourseType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={generateReport} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>

            <Button 
              onClick={resetFilters} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Limpar Filtros
            </Button>

            {reportData.length > 0 && (
              <Button 
                onClick={exportToCSV} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Relatórios Avançados</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seleção de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básicos</TabsTrigger>
              <TabsTrigger value="tracking">Acompanhamento</TabsTrigger>
              <TabsTrigger value="performance">Desempenho</TabsTrigger>
              <TabsTrigger value="administrative">Administrativos</TabsTrigger>
            </TabsList>
            
            {Object.entries(reportTypes).map(([category, reports]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((report) => {
                    const Icon = report.icon;
                    const isSelected = selectedReport === report.value;
                    
                    return (
                      <Card 
                        key={report.value} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedReport(report.value)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Icon className={`h-5 w-5 mt-1 ${
                              isSelected ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <div className="flex-1">
                              <h3 className={`font-medium ${
                                isSelected ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {report.label}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {report.description}
                              </p>
                              {isSelected && (
                                <Badge className="mt-2">Selecionado</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {selectedReport && renderFilters()}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultados do Relatório</span>
              <Badge variant="secondary">{reportData.length} registros</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.keys(reportData[0]).map((header) => (
                      <th key={header} className="border border-gray-300 px-4 py-2 text-left font-medium text-sm">
                        {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm">
                          {typeof value === 'object' && value !== null ? (
                            <pre className="text-xs bg-gray-100 p-1 rounded">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            String(value || '-')
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReports;
