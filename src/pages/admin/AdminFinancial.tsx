import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import Papa from 'papaparse';

import financialService, { NewFinancialTransaction } from '@/services/financialService';
import { userService } from '@/services/userService';
import { serviceProviderService } from '@/services/serviceProviderService';

import { FinancialTransaction, Scholarship, ProfileScholarship } from '@/types/financial';
import { User } from '@/types';
import { ServiceProvider } from '@/services/serviceProviderService';
import { PlusCircle, Trash2, Upload } from 'lucide-react';

type ProfileScholarshipWithNames = ProfileScholarship & { profiles: { name: string }, scholarships: { name: string }};

// Interfaces for CSV parsing to avoid 'any'
interface TransactionCsvRow {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  due_date: string;
  user_email?: string;
  provider_name?: string;
}

interface ScholarshipCsvRow {
    user_email: string;
    scholarship_name: string;
    start_date: string;
    end_date?: string;
}

// Main Component
const AdminFinancial: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Gestão Financeira</h1>
        <Tabs defaultValue="transactions">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="scholarships">Bolsas de Estudo</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions">
                <TransactionsTab />
            </TabsContent>
            <TabsContent value="scholarships">
                <ScholarshipsTab />
            </TabsContent>
        </Tabs>
    </div>
  );
};

// Transactions Tab Component
const TransactionsTab: React.FC = () => {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [providers, setProviders] = useState<ServiceProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
    const [transactionData, setTransactionData] = useState<Partial<NewFinancialTransaction>>({ type: 'expense', status: 'pending' });
    const [entityType, setEntityType] = useState<'user' | 'provider'>('user');
    const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [transData, usersData, providersData] = await Promise.all([
                financialService.getFinancialTransactions(),
                userService.getUsers(),
                serviceProviderService.getServiceProviders(),
            ]);
            setTransactions(transData);
            setUsers(usersData);
            setProviders(providersData);
        } catch (error) { toast.error("Failed to fetch transaction data."); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDeleteTransaction = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;
        try {
            await financialService.deleteFinancialTransaction(id);
            toast.success('Transaction deleted!');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete transaction.');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setTransactionData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSelectChange = (name: string, value: string) => setTransactionData(p => ({ ...p, [name]: value }));

    const handleEntitySelectChange = (value: string) => {
        const entityUpdates = entityType === 'user'
            ? { profileId: value, providerId: undefined }
            : { providerId: value, profileId: undefined };
        setTransactionData(p => ({ ...p, ...entityUpdates }));
    };

    const handleEditClick = (transaction: FinancialTransaction) => {
        setEditingTransaction(transaction);
        setTransactionData({
            ...transaction,
            profileId: transaction.profileId,
            providerId: transaction.providerId,
        });
        if (transaction.profileId) setEntityType('user');
        if (transaction.providerId) setEntityType('provider');
        setIsSingleDialogOpen(true);
    };

    const handleDialogClose = () => {
        setEditingTransaction(null);
        setTransactionData({ type: 'expense', status: 'pending' });
        setIsSingleDialogOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionData.description || !transactionData.amount || !transactionData.dueDate || (!transactionData.profileId && !transactionData.providerId)) {
            toast.error('Please fill all required fields.'); return;
        }

        try {
            if (editingTransaction) {
                await financialService.updateFinancialTransaction(editingTransaction.id, transactionData);
                toast.success('Transaction updated!');
            } else {
                await financialService.createFinancialTransaction(transactionData as NewFinancialTransaction);
                toast.success('Transaction created!');
            }
            handleDialogClose();
            fetchData();
        } catch (err) {
            toast.error(editingTransaction ? 'Failed to update transaction.' : 'Failed to create transaction.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setCsvFile(e.target.files[0]);
    };

    const handleBatchSubmit = async () => {
        if (!csvFile) { toast.error("Please select a CSV file."); return; }
        setIsUploading(true);
        const userEmailMap = new Map(users.map(u => [u.email, u.id]));
        const providerNameMap = new Map(providers.map(p => [p.name, p.id]));
        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const newTransactions = (results.data as TransactionCsvRow[]).map((row): NewFinancialTransaction | null => {
                        const profileId = row.user_email ? userEmailMap.get(row.user_email) : undefined;
                        const providerId = row.provider_name ? providerNameMap.get(row.provider_name) : undefined;
                        if (!profileId && !providerId) return null;
                        return {
                            description: row.description, amount: parseFloat(row.amount), type: row.type,
                            status: row.status, dueDate: new Date(row.due_date).toISOString(),
                            profileId: profileId, providerId: providerId,
                        };
                    }).filter((t): t is NewFinancialTransaction => t !== null && !isNaN(t.amount));

                    if(newTransactions.length === 0) {
                        toast.error("No valid transactions found in file.");
                        setIsUploading(false); return;
                    }
                    await financialService.createBatchTransactions(newTransactions);
                    toast.success(`${newTransactions.length} transactions imported!`);
                    setIsBatchDialogOpen(false); setCsvFile(null);
                    if(fileInputRef.current) fileInputRef.current.value = "";
                    fetchData();
                } catch (error) { toast.error("Error during batch import."); }
                finally { setIsUploading(false); }
            },
            error: () => { toast.error("Failed to parse CSV."); setIsUploading(false); }
        });
    };

    if (isLoading) return <div>Loading transactions...</div>;

    return (
        <div className="mt-4">
            <div className="flex justify-end gap-2 mb-4">
                <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}><DialogTrigger asChild><Button variant="outline"><Upload className="mr-2 h-4 w-4" />Importar Lote</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Importar Transações</DialogTitle></DialogHeader><div><p className="text-sm text-muted-foreground mb-2">CSV com colunas: `description`, `amount`, `type`, `status`, `due_date`, e `user_email` ou `provider_name`.</p><Input type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} /></div><DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose><Button onClick={handleBatchSubmit} disabled={isUploading}>{isUploading ? "Importando..." : "Importar"}</Button></DialogFooter></DialogContent></Dialog>
                <Dialog open={isSingleDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); else setIsSingleDialogOpen(true); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setIsSingleDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Nova Transação</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="entityType" className="text-right">Tipo de Entidade</Label>
                                    <Select value={entityType} onValueChange={(v: 'user' | 'provider') => setEntityType(v)} disabled={!!editingTransaction}>
                                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">Usuário</SelectItem>
                                            <SelectItem value="provider">Fornecedor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="entity" className="text-right">Entidade</Label>
                                    <Select onValueChange={handleEntitySelectChange} value={transactionData.profileId || transactionData.providerId} disabled={!!editingTransaction}>
                                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>
                                            {entityType === 'user' ? users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>) : providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">Descrição</Label>
                                    <Input id="description" name="description" value={transactionData.description || ''} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">Valor</Label>
                                    <Input id="amount" type="number" value={transactionData.amount || ''} onChange={(e) => setTransactionData(p => ({...p, amount: parseFloat(e.target.value)}))} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type" className="text-right">Tipo</Label>
                                    <Select value={transactionData.type} onValueChange={v => handleSelectChange('type', v)}>
                                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Receita</SelectItem>
                                            <SelectItem value="expense">Despesa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="status" className="text-right">Status</Label>
                                    <Select value={transactionData.status} onValueChange={v => handleSelectChange('status', v)}>
                                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pendente</SelectItem>
                                            <SelectItem value="paid">Pago</SelectItem>
                                            <SelectItem value="overdue">Atrasado</SelectItem>
                                            <SelectItem value="canceled">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="dueDate" className="text-right">Data de Vencimento</Label>
                                    <Input id="dueDate" type="date" value={transactionData.dueDate ? new Date(transactionData.dueDate).toISOString().split('T')[0] : ''} onChange={(e) => setTransactionData(p => ({...p, dueDate: new Date(e.target.value).toISOString()}))} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={handleDialogClose}>Cancelar</Button>
                                <Button type="submit">{editingTransaction ? 'Salvar Alterações' : 'Criar'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length > 0 ? transactions.map(t => (
                            <TableRow key={t.id}>
                                <TableCell>{t.description}</TableCell>
                                <TableCell>R$ {t.amount.toFixed(2)}</TableCell>
                                <TableCell>{t.type === 'income' ? 'Receita' : 'Despesa'}</TableCell>
                                <TableCell>{t.status}</TableCell>
                                <TableCell>{new Date(t.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(t)}>Editar</Button>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteTransaction(t.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">Nenhuma transação.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

// Scholarships Tab Component
const ScholarshipsTab: React.FC = () => {
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [profileScholarships, setProfileScholarships] = useState<ProfileScholarshipWithNames[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
    const [newScholarship, setNewScholarship] = useState<Partial<Omit<Scholarship, 'id' | 'createdAt' | 'updatedAt'>>>({});
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [newAssignment, setNewAssignment] = useState<Partial<Omit<ProfileScholarship, 'id' | 'createdAt'>>>({});
    const [isBatchAssignDialogOpen, setIsBatchAssignDialogOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [scholarshipsData, assignmentsData, usersData] = await Promise.all([
                financialService.getScholarships(), financialService.getProfileScholarships(), userService.getUsers(),
            ]);
            setScholarships(scholarshipsData);
            setProfileScholarships(assignmentsData as ProfileScholarshipWithNames[]);
            setUsers(usersData.filter(u => u.role === 'student'));
        } catch (error) { toast.error("Failed to fetch scholarship data."); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleTypeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newScholarship.name || newScholarship.discountPercentage === undefined) { toast.error("Name and discount are required."); return; }
        try {
            await financialService.createScholarship(newScholarship as Omit<Scholarship, 'id' | 'createdAt' | 'updatedAt'>);
            toast.success("Scholarship type created!");
            setIsTypeDialogOpen(false); setNewScholarship({}); fetchData();
        } catch (error) { toast.error("Failed to create scholarship type."); }
    };

    const handleTypeDelete = async (id: string) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await financialService.deleteScholarship(id);
            toast.success("Scholarship type deleted."); fetchData();
        } catch (error) { toast.error("Failed to delete type."); }
    };

    const handleAssignmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAssignment.profileId || !newAssignment.scholarshipId || !newAssignment.startDate) { toast.error("All fields required."); return; }
        try {
            await financialService.assignScholarshipToProfile(newAssignment as Omit<ProfileScholarship, 'id' | 'createdAt'>);
            toast.success("Scholarship assigned!");
            setIsAssignDialogOpen(false); setNewAssignment({}); fetchData();
        } catch (error) { toast.error("Failed to assign scholarship."); }
    };

    const handleAssignmentDelete = async (id: string) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await financialService.removeScholarshipFromProfile(id);
            toast.success("Assignment removed."); fetchData();
        } catch (error) { toast.error("Failed to remove assignment."); }
    };

    const handleBatchAssignSubmit = () => {
        if (!csvFile) { toast.error("Please select a CSV file."); return; }
        setIsUploading(true);
        const userEmailMap = new Map(users.map(u => [u.email, u.id]));
        const scholarshipNameMap = new Map(scholarships.map(s => [s.name, s.id]));
        Papa.parse(csvFile, {
            header: true, skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const newAssignments = (results.data as ScholarshipCsvRow[]).map((row) => {
                        const profileId = userEmailMap.get(row.user_email);
                        const scholarshipId = scholarshipNameMap.get(row.scholarship_name);
                        if (!profileId || !scholarshipId) return null;
                        return {
                            profileId, scholarshipId,
                            startDate: new Date(row.start_date).toISOString(),
                            endDate: row.end_date ? new Date(row.end_date).toISOString() : undefined,
                        };
                    }).filter(a => a !== null) as Omit<ProfileScholarship, 'id' | 'createdAt'>[];

                    if (newAssignments.length === 0) {
                        toast.error("No valid assignments found in file.");
                        setIsUploading(false); return;
                    }
                    await financialService.assignBatchScholarships(newAssignments);
                    toast.success(`${newAssignments.length} scholarships assigned!`);
                    setIsBatchAssignDialogOpen(false); setCsvFile(null);
                    if(fileInputRef.current) fileInputRef.current.value = "";
                    fetchData();
                } catch (error) { toast.error("Error during batch assignment."); }
                finally { setIsUploading(false); }
            },
            error: () => { toast.error("Failed to parse CSV."); setIsUploading(false); }
        });
    };

    if (isLoading) return <div>Loading scholarships...</div>;

    return (
        <div className="mt-4">
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2"><h2 className="text-xl font-semibold">Tipos de Bolsas</h2><Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}><DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Novo Tipo</Button></DialogTrigger><DialogContent>
<DialogHeader>
<DialogTitle>Novo Tipo de Bolsa</DialogTitle>
</DialogHeader>
<form onSubmit={handleTypeSubmit}>
<div className="grid gap-4 py-4">
<div className="grid grid-cols-4 items-center gap-4">
<Label htmlFor="name" className="text-right">Nome</Label>
<Input id="name" value={newScholarship.name || ''} onChange={e => setNewScholarship(p => ({...p, name: e.target.value}))} className="col-span-3" />
</div>
<div className="grid grid-cols-4 items-center gap-4">
<Label htmlFor="discountPercentage" className="text-right">% Desconto</Label>
<Input id="discountPercentage" type="number" value={newScholarship.discountPercentage || ''} onChange={e => setNewScholarship(p => ({...p, discountPercentage: parseFloat(e.target.value)}))} className="col-span-3" />
</div>
<div className="grid grid-cols-4 items-center gap-4">
<Label htmlFor="description" className="text-right">Descrição</Label>
<Input id="description" value={newScholarship.description || ''} onChange={e => setNewScholarship(p => ({...p, description: e.target.value}))} className="col-span-3" />
</div>
</div>
<DialogFooter>
<Button type="submit">Criar</Button>
</DialogFooter>
</form>
</DialogContent></Dialog></div>
                <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>% Desconto</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{scholarships.length > 0 ? scholarships.map(s => (<TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.discountPercentage}%</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleTypeDelete(s.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan={3} className="text-center">Nenhum tipo de bolsa.</TableCell></TableRow>}</TableBody></Table></div>
            </div>
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold">Alunos Bolsistas</h2>
                    <div className="flex gap-2">
                        <Dialog open={isBatchAssignDialogOpen} onOpenChange={setIsBatchAssignDialogOpen}><DialogTrigger asChild><Button variant="outline"><Upload className="mr-2 h-4 w-4" />Importar Lote</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Importar Associações</DialogTitle></DialogHeader><div><p className="text-sm text-muted-foreground mb-2">CSV com colunas: `user_email`, `scholarship_name`, `start_date` (YYYY-MM-DD), `end_date` (opcional).</p><Input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} ref={fileInputRef} /></div><DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose><Button onClick={handleBatchAssignSubmit} disabled={isUploading}>{isUploading ? "Importando..." : "Importar"}</Button></DialogFooter></DialogContent></Dialog>
                        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}><DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Associar Bolsa</Button></DialogTrigger><DialogContent>
<DialogHeader>
<DialogTitle>Associar Bolsa</DialogTitle>
</DialogHeader>
<form onSubmit={handleAssignmentSubmit}>
<div className="grid gap-4 py-4">
<div className="grid grid-cols-4 items-center gap-4">
<Label htmlFor="profileId" className="text-right">Aluno</Label>
<Select onValueChange={v => setNewAssignment(p => ({...p, profileId: v}))}>
<SelectTrigger className="col-span-3">
<SelectValue placeholder="Selecione o aluno" />
</SelectTrigger>
<SelectContent>
{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="grid grid-cols-4 items-center gap-4">
<Label htmlFor="scholarshipId" className="text-right">Bolsa</Label>
<Select onValueChange={v => setNewAssignment(p => ({...p, scholarshipId: v}))}>
<SelectTrigger className="col-span-3">
<SelectValue placeholder="Selecione a bolsa" />
</SelectTrigger>
<SelectContent>
{scholarships.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="grid grid-cols-4 items-center gap-4">
<Label htmlFor="startDate" className="text-right">Início</Label>
<Input id="startDate" type="date" value={newAssignment.startDate ? new Date(newAssignment.startDate).toISOString().split('T')[0] : ''} onChange={e => setNewAssignment(p => ({...p, startDate: new Date(e.target.value).toISOString()}))} className="col-span-3" />
</div>
<div className="grid grid-cols-4 items-center gap-4">
<Label htmlFor="endDate" className="text-right">Fim</Label>
<Input id="endDate" type="date" value={newAssignment.endDate ? new Date(newAssignment.endDate).toISOString().split('T')[0] : ''} onChange={e => setNewAssignment(p => ({...p, endDate: new Date(e.target.value).toISOString()}))} className="col-span-3" />
</div>
</div>
<DialogFooter>
<Button type="submit">Associar</Button>
</DialogFooter>
</form>
</DialogContent></Dialog>
                    </div>
                </div>
                <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Bolsa</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{profileScholarships.length > 0 ? profileScholarships.map(ps => (<TableRow key={ps.id}><TableCell>{ps.profiles?.name || 'N/A'}</TableCell><TableCell>{ps.scholarships?.name || 'N/A'}</TableCell><TableCell>{new Date(ps.startDate).toLocaleDateString()}</TableCell><TableCell>{ps.endDate ? new Date(ps.endDate).toLocaleDateString() : 'N/A'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleAssignmentDelete(ps.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center">Nenhum aluno bolsista.</TableCell></TableRow>}</TableBody></Table></div>
            </div>
        </div>
    );
};

export default AdminFinancial;
