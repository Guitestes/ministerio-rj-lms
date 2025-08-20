import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash } from "lucide-react";
import { serviceProviderService, PriceTableItem } from '@/services/serviceProviderService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface PriceTableManagerProps {
  providerId: string;
}

const PriceTableManager = ({ providerId }: PriceTableManagerProps) => {
  const [items, setItems] = useState<PriceTableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceTableItem | undefined>(undefined);

  const fetchItems = async () => {
    setIsLoading(true);
    const data = await serviceProviderService.getPriceTableForProvider(providerId);
    setItems(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [providerId]);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      service_name: formData.get('service_name') as string,
      price: parseFloat(formData.get('price') as string),
      unit: formData.get('unit') as string,
    };

    if (editingItem) {
      await serviceProviderService.updatePriceTableItem(editingItem.id!, data);
    } else {
      await serviceProviderService.createPriceTableItem({ ...data, provider_id: providerId });
    }
    fetchItems();
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  const handleEdit = (item: PriceTableItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await serviceProviderService.deletePriceTableItem(id);
    fetchItems();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tabela de Preços</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingItem(undefined);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="service_name">Serviço</Label>
                    <Input id="service_name" name="service_name" defaultValue={editingItem?.service_name} required />
                  </div>
                  <div>
                    <Label htmlFor="price">Preço</Label>
                    <Input id="price" name="price" type="number" step="0.01" defaultValue={editingItem?.price} required />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unidade</Label>
                    <Input id="unit" name="unit" defaultValue={editingItem?.unit} />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.service_name}</TableCell>
                  <TableCell>{item.price}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id!)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceTableManager;
