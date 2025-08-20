import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { academicWorkService } from '@/services/academicWorkService';
import { AcademicWork } from '@/types/index';
import { Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface AcademicWorksListProps {
  classId: string;
  userId: string;
  onRefresh?: () => void;
}

export const AcademicWorksList = ({ classId, userId, onRefresh }: AcademicWorksListProps) => {
  const [works, setWorks] = useState<AcademicWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorks = useCallback(async () => {
    if (!classId || !userId) return;
    setIsLoading(true);
    try {
      const userWorks = await academicWorkService.getMyAcademicWorks(classId, userId);
      setWorks(userWorks);
    } catch (error) {
      toast.error('Erro ao buscar seus trabalhos acadêmicos.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [classId, userId]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  // Expor função de refresh para componente pai
  useEffect(() => {
    if (onRefresh) {
      onRefresh = fetchWorks;
    }
  }, [fetchWorks, onRefresh]);

  const handleDelete = async (workId: string) => {
    try {
      await academicWorkService.deleteAcademicWork(workId);
      toast.success('Trabalho removido com sucesso!');
      fetchWorks(); // Refresh the list
    } catch (error) {
      toast.error('Falha ao remover o trabalho.');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-lg">Meus Documentos Enviados</h4>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Carregando documentos...</p>
          </div>
        </div>
      ) : works.length > 0 ? (
        <div className="space-y-3">
          {works.map((work) => (
            <div key={work.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <a 
                    href={work.documentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {work.title}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enviado em: {new Date(work.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => handleDelete(work.id)}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum documento enviado ainda.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Use o botão "Enviar Documento" para adicionar seus trabalhos.
          </p>
        </div>
      )}
    </div>
  );
};