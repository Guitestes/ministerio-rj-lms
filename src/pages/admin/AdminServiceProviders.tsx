import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowLeft } from "lucide-react";
import { serviceProviderService, ServiceProvider } from '@/services/serviceProviderService';
import ServiceProvidersTable from '@/components/admin/service-providers/ServiceProvidersTable';
import ServiceProviderForm from '@/components/admin/service-providers/ServiceProviderForm';
import ContractsManager from '@/components/admin/service-providers/ContractsManager';
import PriceTableManager from '@/components/admin/service-providers/PriceTableManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminServiceProviders = () => {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | undefined>(undefined);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  const fetchProviders = async () => {
    setIsLoading(true);
    const data = await serviceProviderService.getServiceProviders();
    setProviders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleFormSubmit = async (data: ServiceProvider) => {
    if (editingProvider) {
      await serviceProviderService.updateServiceProvider(editingProvider.id!, data);
    } else {
      await serviceProviderService.createServiceProvider(data);
    }
    fetchProviders();
    setIsDialogOpen(false);
    setEditingProvider(undefined);
  };

  const handleEdit = (provider: ServiceProvider) => {
    setEditingProvider(provider);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await serviceProviderService.deleteServiceProvider(id);
    fetchProviders();
    if (selectedProvider?.id === id) {
      setSelectedProvider(null);
    }
  };

  const handleSelectProvider = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
  };

  if (selectedProvider) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setSelectedProvider(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para a Lista
        </Button>
        <Tabs defaultValue="contracts">
          <TabsList>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="prices">Tabela de Preços</TabsTrigger>
          </TabsList>
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>Contratos de {selectedProvider.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ContractsManager providerId={selectedProvider.id!} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="prices">
            <PriceTableManager providerId={selectedProvider.id!} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Prestadores de Serviço</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingProvider(undefined);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Prestador
            </Button>
          </DialogTrigger>
          <ServiceProviderForm
            initialData={editingProvider}
            onSubmit={handleFormSubmit}
          />
        </Dialog>
      </div>

      <Card>
        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <ServiceProvidersTable
            providers={providers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSelect={handleSelectProvider}
          />
        )}
      </Card>
    </div>
  );
};

export default AdminServiceProviders;
