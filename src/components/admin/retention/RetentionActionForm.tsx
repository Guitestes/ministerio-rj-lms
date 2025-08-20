import { useState, useEffect } from 'react';
import { retentionService } from '@/services/retentionService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export const RetentionActionForm = ({ student, isOpen, onClose }) => {
  const { user: adminUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [actionType, setActionType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setIsLoadingHistory(true);
      retentionService.getRetentionActionsForUser(student.user_id)
        .then(setHistory)
        .finally(() => setIsLoadingHistory(false));
    }
  }, [isOpen, student]);

  const handleSubmit = async () => {
    if (!actionType || !notes.trim()) {
      toast.error("Por favor, selecione um tipo de ação e adicione uma nota.");
      return;
    }
    setIsSubmitting(true);
    await retentionService.createRetentionAction({
      user_id: student.user_id,
      admin_id: adminUser.id,
      action_type: actionType,
      notes: notes,
    });
    setIsSubmitting(false);
    onClose(); // Close the modal after submission
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Ação de Retenção</DialogTitle>
          <DialogDescription>
            Aluno: {student.profile.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Histórico de Ações</h4>
            {isLoadingHistory ? <p>Carregando histórico...</p> : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {history.length > 0 ? history.map(action => (
                  <div key={action.id} className="text-sm border p-2 rounded-md">
                    <p><strong>Ação:</strong> {action.action_type}</p>
                    <p><strong>Nota:</strong> {action.notes}</p>
                    <p className="text-xs text-muted-foreground">
                      Por: {action.admin.name} em {new Date(action.action_date).toLocaleString()}
                    </p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>}
              </div>
            )}
          </div>
          <hr />
          <div>
            <h4 className="font-semibold mb-2">Nova Ação</h4>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Ação</Label>
                <Select onValueChange={setActionType} value={actionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email Enviado">Email Enviado</SelectItem>
                    <SelectItem value="Contato Telefônico">Contato Telefônico</SelectItem>
                    <SelectItem value="Reunião Agendada">Reunião Agendada</SelectItem>
                    <SelectItem value="Plano de Ação Criado">Plano de Ação Criado</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Ação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RetentionActionForm;
