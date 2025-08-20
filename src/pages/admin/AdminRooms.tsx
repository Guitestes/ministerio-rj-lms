import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash, RefreshCw } from "lucide-react";
import { roomService, type CreateRoomData, type UpdateRoomData, type Room } from "@/services/roomService";
import { toast } from "sonner";

const emptyForm: CreateRoomData = {
  name: "",
  location: "",
  capacity: undefined,
  description: "",
};

const AdminRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateRoomData>(emptyForm);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const data = await roomService.getAllRooms();
      setRooms(data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar salas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const openNewRoomDialog = () => {
    setEditingRoomId(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setFormData({
      name: room.name,
      location: room.location || "",
      capacity: room.capacity,
      description: room.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await roomService.deleteRoom(roomId);
      toast.success("Sala excluída");
      loadRooms();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao excluir sala");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRoomId) {
        const payload: UpdateRoomData = {
          name: formData.name.trim(),
          location: formData.location?.trim() || undefined,
          capacity: formData.capacity !== undefined && formData.capacity !== null ? Number(formData.capacity) : undefined,
          description: formData.description?.trim() || undefined,
        };
        await roomService.updateRoom(editingRoomId, payload);
        toast.success("Sala atualizada");
      } else {
        const payload: CreateRoomData = {
          name: formData.name.trim(),
          location: formData.location?.trim() || undefined,
          capacity: formData.capacity !== undefined && formData.capacity !== null ? Number(formData.capacity) : undefined,
          description: formData.description?.trim() || undefined,
        };
        await roomService.createRoom(payload);
        toast.success("Sala criada");
      }
      setIsDialogOpen(false);
      setFormData(emptyForm);
      setEditingRoomId(null);
      loadRooms();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao salvar sala");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Salas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRooms} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingRoomId(null);
              setFormData(emptyForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={openNewRoomDialog}>
                <Plus className="h-4 w-4 mr-2" /> Nova Sala
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-xl">
              <DialogHeader>
                <DialogTitle>{editingRoomId ? "Editar Sala" : "Nova Sala"}</DialogTitle>
                <DialogDescription>Preencha os dados da sala.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Local</Label>
                  <Input id="location" value={formData.location || ""} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidade</Label>
                  <Input id="capacity" type="number" min={0} value={formData.capacity ?? ""} onChange={(e) => setFormData({ ...formData, capacity: e.target.value === "" ? undefined : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" rows={3} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>{editingRoomId ? "Atualizar" : "Criar"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[140px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && rooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma sala cadastrada</TableCell>
              </TableRow>
            )}
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>{room.location || "-"}</TableCell>
                  <TableCell>{room.capacity ?? "-"}</TableCell>
                  <TableCell className="max-w-[400px] truncate" title={room.description || undefined}>{room.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditRoom(room)}>
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteRoom(room.id)}>
                        <Trash className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminRooms;