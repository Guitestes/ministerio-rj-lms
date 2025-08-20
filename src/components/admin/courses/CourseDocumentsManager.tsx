import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { X, Upload, File as FileIcon, AlertCircle } from 'lucide-react';
import { CourseDocument } from '@/types';
import { documentService } from '@/services/documentService';
import { validateFile, STORAGE_BUCKETS } from '@/utils/storage';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CourseDocumentsManagerProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CourseDocumentsManager = ({ courseId, isOpen, onClose }: CourseDocumentsManagerProps) => {
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [courseId, isOpen]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await documentService.getDocumentsByCourse(courseId);
      setDocuments(docs);
    } catch (error) {
      toast.error('Erro ao carregar documentos.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setFile(null);
    
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      try {
        validateFile(selectedFile, STORAGE_BUCKETS.DOCUMENTOS);
        setFile(selectedFile);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'Arquivo inválido');
        // Clear the file input
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!file || fileError) return;
    setIsUploading(true);
    try {
      const newDocument = await documentService.uploadCourseDocument(courseId, file);
      setDocuments([...documents, newDocument]);
      setFile(null);
      setFileError(null);
      toast.success('Documento enviado com sucesso!');
    } catch (error) {
      toast.error('Falha no upload do documento.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este documento?')) return;
    
    try {
      await documentService.deleteCourseDocument(documentId);
      setDocuments(documents.filter(d => d.id !== documentId));
      toast.success('Documento deletado com sucesso!');
    } catch (error) {
      toast.error('Falha ao deletar o documento.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Documentos do Curso</DialogTitle>
        </DialogHeader>
        {isLoading ? <p>Carregando...</p> : (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Documentos Atuais</h4>
              <ul className="space-y-2 mt-2">
                {documents.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between p-2 border rounded">
                    <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                      <FileIcon className="h-4 w-4" />
                      <span>{doc.documentName}</span>
                    </a>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
                {documents.length === 0 && <p className="text-muted-foreground">Nenhum documento encontrado.</p>}
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Enviar Novo Documento</h4>
              <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                  <Input 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
                  />
                  <Button onClick={handleUpload} disabled={isUploading || !file || !!fileError}>
                    {isUploading ? 'Enviando...' : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                {fileError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{fileError}</AlertDescription>
                  </Alert>
                )}
                {file && !fileError && (
                  <Alert>
                    <FileIcon className="h-4 w-4" />
                    <AlertDescription>
                      Arquivo selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDocumentsManager;
