import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { userService } from "@/services/userService";

interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_professor: boolean;
}

const AdminRoleManager = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await userService.getUsersWithRoles();
      setUsers(usersData);
    } catch (error) {
      toast.error("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, role: 'admin' | 'professor', enabled: boolean) => {
    const originalUsers = [...users];

    // Optimistically update UI
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, [role === 'admin' ? 'is_admin' : 'is_professor']: enabled } : u
    );
    setUsers(updatedUsers);

    const userToUpdate = updatedUsers.find(u => u.id === userId);
    if (!userToUpdate) return;

    try {
      await userService.setUserRoles(userId, userToUpdate.is_admin, userToUpdate.is_professor);
      toast.success(`Roles for ${userToUpdate.name} updated successfully!`);
    } catch (error: any) {
      toast.error(`Error updating roles: ${error.message}`);
      // Revert UI on error
      setUsers(originalUsers);
    }
  };

  const filteredUsers = useMemo(() =>
    users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Funções</CardTitle>
          <CardDescription>
            Atribua ou remova as funções de Administrador e Professor para os usuários da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="search-user">Filtrar por nome ou email</Label>
            <Input
              id="search-user"
              placeholder="Digite para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Professor</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
                ) : filteredUsers.length > 0 ? filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={user.is_professor}
                        onCheckedChange={(checked) => handleRoleChange(user.id, 'professor', checked)}
                        aria-label={`Toggle professor role for ${user.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={user.is_admin}
                        onCheckedChange={(checked) => handleRoleChange(user.id, 'admin', checked)}
                        aria-label={`Toggle admin role for ${user.name}`}
                      />
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center">Nenhum usuário encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRoleManager;
