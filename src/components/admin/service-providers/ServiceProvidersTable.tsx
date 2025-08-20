import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServiceProvider } from "@/services/serviceProviderService";
import { MoreHorizontal, Edit, Trash, Eye } from "lucide-react";

interface ServiceProvidersTableProps {
  providers: ServiceProvider[];
  onEdit: (provider: ServiceProvider) => void;
  onDelete: (id: string) => void;
  onSelect: (provider: ServiceProvider) => void;
}

const ServiceProvidersTable = ({ providers, onEdit, onDelete, onSelect }: ServiceProvidersTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo de Serviço</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {providers.map((provider) => (
          <TableRow key={provider.id} onClick={() => onSelect(provider)} className="cursor-pointer">
            <TableCell>{provider.name}</TableCell>
            <TableCell>{provider.service_type}</TableCell>
            <TableCell>{provider.email}</TableCell>
            <TableCell>{provider.phone}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(provider); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(provider); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(provider.id!); }}>
                    <Trash className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ServiceProvidersTable;
