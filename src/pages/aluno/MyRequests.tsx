import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestService } from "@/services/requestService";
import { useAuth } from "@/contexts/AuthContext";
import { PlusCircle } from "lucide-react";

interface AdminRequest {
  id: string;
  subject: string;
  request_type: string;
  status: string;
  created_at: string;
}

const MyRequests = () => {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyRequests = async () => {
      if (!user) {
        toast.error("Você precisa estar logado para ver suas solicitações.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await requestService.getRequestsForUser(user.id);
        setRequests(data);
      } catch (error) {
        console.error('Erro ao buscar solicitações:', error);
        toast.error('Erro ao carregar suas solicitações');
      } finally {
        setLoading(false);
      }
    };
    fetchMyRequests();
  }, [user]);

  const getStatusVariant = (status: string) => {
    if (!status) return 'outline';
    switch (status.toLowerCase()) {
      case 'pending':
      case 'aberto':
        return 'secondary';
      case 'in_progress':
      case 'em andamento':
        return 'warning';
      case 'resolved':
      case 'resolvido':
        return 'success';
      case 'closed':
      case 'fechado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Minhas Solicitações</h1>
        <Button onClick={() => navigate('/aluno/new-request')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
                <p className="text-muted-foreground">Você ainda não fez nenhuma solicitação.</p>
                <Button className="mt-4" onClick={() => navigate('/aluno/new-request')}>
                    Fazer minha primeira solicitação
                </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.subject}</TableCell>
                    <TableCell>{request.request_type}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(request.status)}>{request.status || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRequests;
