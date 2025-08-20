import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusVariant = {
  open: "secondary",
  in_progress: "default",
  resolved: "outline",
  closed: "destructive",
};

export const RequestsTable = ({ requests, onSelectRequest }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Assunto</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">{request.subject}</TableCell>
            <TableCell>{request.user?.name || 'N/A'}</TableCell>
            <TableCell>{request.request_type}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[request.status] || 'default'}>
                {request.status}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(request.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => onSelectRequest(request)}>
                Ver Detalhes
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default RequestsTable;
