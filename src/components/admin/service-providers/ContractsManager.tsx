import { useState, useEffect } from 'react';
import { serviceProviderService } from '@/services/serviceProviderService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

// Define a type for the contract for better type safety
type Contract = {
  id: string;
  title: string;
  description: string;
  value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'terminated';
  document_url?: string;
  [key: string]: any; // Allow other properties
};

const ContractForm = ({ contract, providerId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: contract?.title || '',
    description: contract?.description || '',
    value: contract?.value || 0,
    start_date: contract?.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '',
    end_date: contract?.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
    status: contract?.status || 'active',
    document_url: contract?.document_url || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
      setFormData(prev => ({ ...prev, status: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = {
        ...formData,
        value: parseFloat(formData.value),
        provider_id: providerId
    };
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título do Contrato</Label>
        <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="value">Valor</Label>
            <Input id="value" name="value" type="number" value={formData.value} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={handleSelectChange} value={formData.status}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="terminated">Terminado</SelectItem>
                </SelectContent>
            </Select>
          </div>
      </div>
       <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Data de Início</Label>
            <Input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">Data de Fim</Label>
            <Input id="end_date" name="end_date" type="date" value={formData.end_date} onChange={handleChange} />
          </div>
      </div>
       <div className="space-y-2">
        <Label htmlFor="document_url">URL do Documento</Label>
        <Input id="document_url" name="document_url" value={formData.document_url} onChange={handleChange} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{contract ? 'Salvar Alterações' : 'Criar Contrato'}</Button>
      </DialogFooter>
    </form>
  );
};


const ContractsManager = ({ providerId }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const fetchContracts = async () => {
    setIsLoading(true);
    const data = await serviceProviderService.getContractsForProvider(providerId);
    setContracts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (providerId) fetchContracts();
  }, [providerId]);

  const handleModalClose = () => {
      setIsModalOpen(false);
      setEditingContract(null);
  }

  const handleFormSubmit = async (data) => {
    if (editingContract) {
      await serviceProviderService.updateContract(editingContract.id, data);
    } else {
      await serviceProviderService.createContract(data);
    }
    fetchContracts();
    handleModalClose();
  };

  const handleEdit = (contract: Contract) => {
      setEditingContract(contract);
      setIsModalOpen(true);
  }

  const handleDelete = async (contractId: string) => {
      if(window.confirm('Tem certeza que deseja excluir este contrato?')) {
          await serviceProviderService.deleteContract(contractId);
          fetchContracts();
      }
  }

  if (isLoading) return <p>Loading contracts...</p>;

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => { setEditingContract(null); setIsModalOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Novo Contrato
            </Button>
        </div>

        {contracts.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum contrato encontrado.</p>}

        <div className="grid gap-4 md:grid-cols-2">
            {contracts.map(contract => (
              <Card key={contract.id}>
                <CardHeader>
                  <CardTitle>{contract.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Status:</strong> <span className="capitalize">{contract.status}</span></p>
                  <p><strong>Valor:</strong> R$ {contract.value.toFixed(2)}</p>
                  <p><strong>Vigência:</strong> {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}</p>
                   {contract.document_url && <a href={contract.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver Documento</a>}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(contract)}><Edit className="mr-2 h-4 w-4"/> Editar</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(contract.id)}><Trash2 className="mr-2 h-4 w-4"/> Excluir</Button>
                </CardFooter>
              </Card>
            ))}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
                </DialogHeader>
                <ContractForm
                    contract={editingContract}
                    providerId={providerId}
                    onSubmit={handleFormSubmit}
                    onCancel={handleModalClose}
                />
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default ContractsManager;
