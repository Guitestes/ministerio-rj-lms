import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestService } from '@/services/requestService';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { toast } from 'sonner';

const statusVariant = {
  open: "secondary",
  in_progress: "default",
  resolved: "outline",
  closed: "destructive",
};

export const RequestDetailsModal = ({ request, isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState(request?.status || '');

  if (!request) return null;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await requestService.addComment(request.id, user.id, newComment);
      toast.success("Comentário adicionado");
      setNewComment('');
      onUpdate(); // Refresh the request data
    } catch (e) {
      // service handles toast
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await requestService.updateRequest(request.id, { status: newStatus });
      toast.success("Status da solicitação atualizado");

      // Se o status for 'Resolvido' e o tipo for 'Trancamento', execute a ação
      if (newStatus === 'resolved' && request.request_type === 'Trancamento') {
        await requestService.executeAction(request.id);
      }

      onUpdate();
    } catch (e) {
      // service handles toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{request.subject}</DialogTitle>
          <DialogDescription>
            Solicitado por {request.user?.name} em {new Date(request.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="flex items-center gap-4">
            <Badge variant={statusVariant[request.status] || 'default'}>{request.status}</Badge>
            <span className="text-sm text-muted-foreground">{request.request_type}</span>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Descrição</h3>
            <p className="text-sm bg-muted p-3 rounded-md">{request.description || "Nenhuma descrição fornecida."}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Histórico de Comentários</h3>
            <div className="space-y-3">
              {request.comments?.map(comment => (
                <div key={comment.id} className="text-sm bg-muted p-3 rounded-md">
                  <p className="font-bold">{comment.author?.name}</p>
                  <p>{comment.comment}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
              ))}
              {request.comments?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-comment">Adicionar Comentário</Label>
            <Textarea
              id="new-comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Digite seu comentário aqui..."
            />
            <Button onClick={handleAddComment} size="sm">Adicionar</Button>
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Label>Mudar Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleStatusUpdate}>Atualizar Status</Button>
          </div>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDetailsModal;
