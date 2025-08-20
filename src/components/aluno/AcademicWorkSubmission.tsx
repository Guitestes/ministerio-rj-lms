import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { academicWorkService } from '@/services/academicWorkService';
import { AcademicWork } from '@/types/index';
import { Trash2, FileText, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AcademicWorkSubmissionProps {
  classId: string;
  userId: string;
  onUploadSuccess?: () => void;
}

export const AcademicWorkSubmission = ({ classId, userId, onUploadSuccess }: AcademicWorkSubmissionProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');



  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast.warning('Por favor, forneça um título e selecione um arquivo.');
      return;
    }
    setIsUploading(true);
    try {
      await academicWorkService.uploadAcademicWork(classId, userId, selectedFile, title);
      toast.success('Trabalho enviado com sucesso!');
      setSelectedFile(null);
      setTitle('');
      const fileInput = document.getElementById('work-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      if (onUploadSuccess) onUploadSuccess(); // Notify parent component
    } catch (error) {
      toast.error('Falha no envio do trabalho.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };



  return (
    <div className="space-y-4">
      <h4 className="font-medium text-lg">Enviar Novo Documento</h4>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="work-title">Título do Documento</Label>
          <Input
            id="work-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Resumo do Capítulo 1, Exercício da Aula 3..."
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="work-file-upload">Selecionar Arquivo</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="work-file-upload" 
              type="file" 
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png"
            />
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || !selectedFile || !title.trim()}
              className="min-w-[100px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PDF, DOC, DOCX, TXT, RTF, JPG, PNG (máx. 10MB)
          </p>
        </div>
      </div>
    </div>
  );
};
