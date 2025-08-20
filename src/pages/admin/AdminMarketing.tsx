
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Mail, 
  TrendingUp, 
  Target, 
  BarChart3, 
  PlusCircle,
  UserPlus,
  MessageSquare,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import emailService from '@/services/emailService';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Adicionar imports necessários para tabela e dialogs
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

// Funções para gerenciar leads
async function fetchLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function createLead(leadData: any) {
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function updateLead(id: string, leadData: any) {
  const { data, error } = await supabase
    .from('leads')
    .update(leadData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function deleteLead(id: string) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Componente de formulário para leads
const LeadForm = ({ lead, onSubmit, onCancel }: { lead?: any; onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    position: lead?.position || '',
    source: lead?.source || '',
    status: lead?.status || 'new',
    notes: lead?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => handleChange('company', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="position">Cargo</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => handleChange('position', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="source">Origem</Label>
          <Select value={formData.source} onValueChange={(value) => handleChange('source', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Google Ads">Google Ads</SelectItem>
              <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
              <SelectItem value="Site">Site</SelectItem>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              <SelectItem value="Evento">Evento</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Novo</SelectItem>
              <SelectItem value="contacted">Contatado</SelectItem>
              <SelectItem value="qualified">Qualificado</SelectItem>
              <SelectItem value="converted">Convertido</SelectItem>
              <SelectItem value="lost">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {lead ? 'Atualizar' : 'Criar'} Lead
        </Button>
      </div>
    </form>
  );
};

// Componente de Gestão de Campanhas
const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Buscar campanhas
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      toast({ title: 'Erro ao carregar campanhas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Criar campanha
  const createCampaign = async (campaignData: any) => {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([campaignData])
        .select()
        .single();
      
      if (error) throw error;
      setCampaigns(prev => [data, ...prev]);
      toast({ title: 'Campanha criada com sucesso!' });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast({ title: 'Erro ao criar campanha', variant: 'destructive' });
    }
  };

  // Atualizar campanha
  const updateCampaign = async (id: string, campaignData: any) => {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update(campaignData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === id ? data : campaign
      ));
      toast({ title: 'Campanha atualizada com sucesso!' });
      setEditingCampaign(null);
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      toast({ title: 'Erro ao atualizar campanha', variant: 'destructive' });
    }
  };

  // Deletar campanha
  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      toast({ title: 'Campanha deletada com sucesso!' });
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast({ title: 'Erro ao deletar campanha', variant: 'destructive' });
    }
  };

  // Filtrar campanhas baseado nos filtros
  const filteredCampaigns = campaigns.filter((campaign: any) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (campaign.description && campaign.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  React.useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Campanhas</h2>
          <p className="text-muted-foreground">Crie e gerencie suas campanhas de marketing</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Controles de busca e filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="advertising">Publicidade</SelectItem>
                  <SelectItem value="content">Conteúdo</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Campanhas */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {campaign.type === 'email' ? 'Email' :
                         campaign.type === 'social' ? 'Social Media' :
                         campaign.type === 'ads' ? 'Anúncios' : campaign.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={campaign.status === 'active' ? 'default' : 
                                campaign.status === 'paused' ? 'secondary' : 'destructive'}
                      >
                        {campaign.status === 'active' ? 'Ativa' :
                         campaign.status === 'paused' ? 'Pausada' :
                         campaign.status === 'completed' ? 'Concluída' : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {campaign.budget ? `R$ ${campaign.budget.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {campaign.start_date ? format(new Date(campaign.start_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {campaign.end_date ? format(new Date(campaign.end_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCampaign(campaign)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja deletar esta campanha?')) {
                              deleteCampaign(campaign.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Criar/Editar Campanha */}
      <Dialog open={isCreateDialogOpen || !!editingCampaign} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingCampaign(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
          </DialogHeader>
          <CampaignForm
            campaign={editingCampaign}
            onSubmit={editingCampaign ? 
              (data) => updateCampaign(editingCampaign.id, data) : 
              createCampaign
            }
            onCancel={() => {
              setIsCreateDialogOpen(false);
              setEditingCampaign(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Formulário de Campanha
const CampaignForm = ({ campaign, onSubmit, onCancel }: {
  campaign?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    type: campaign?.type || 'email',
    status: campaign?.status || 'draft',
    budget: campaign?.budget || '',
    start_date: campaign?.start_date || '',
    end_date: campaign?.end_date || '',
    target_audience: campaign?.target_audience || '',
    goals: campaign?.goals || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Campanha</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email Marketing</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="ads">Anúncios Pagos</SelectItem>
              <SelectItem value="content">Marketing de Conteúdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descreva os objetivos e estratégia da campanha..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="paused">Pausada</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Orçamento (R$)</Label>
          <Input
            id="budget"
            type="number"
            step="0.01"
            value={formData.budget}
            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Data de Início</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Data de Fim</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target_audience">Público-Alvo</Label>
        <Input
          id="target_audience"
          value={formData.target_audience}
          onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
          placeholder="Ex: Estudantes universitários, Profissionais de TI..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goals">Objetivos</Label>
        <Textarea
          id="goals"
          value={formData.goals}
          onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
          placeholder="Ex: Aumentar conversões em 20%, Gerar 100 leads qualificados..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {campaign ? 'Atualizar' : 'Criar'} Campanha
        </Button>
      </div>
    </form>
  );
};

// Componente de Analytics Dashboard
const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  // Buscar dados de analytics
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Buscar métricas de leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString());
      
      if (leadsError) throw leadsError;

      // Buscar métricas de campanhas
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .gte('created_at', new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString());
      
      if (campaignsError) throw campaignsError;

      // Buscar métricas de email
      const { data: emailData, error: emailError } = await supabase
        .from('email_templates')
        .select('*');
      
      if (emailError) throw emailError;

      // Processar dados
      const totalLeads = leadsData?.length || 0;
      const qualifiedLeads = leadsData?.filter(lead => lead.status === 'qualified').length || 0;
      const activeCampaigns = campaignsData?.filter(campaign => campaign.status === 'active').length || 0;
      const totalCampaigns = campaignsData?.length || 0;
      const emailTemplates = emailData?.length || 0;

      // Agrupar leads por data
      const leadsGrouped = leadsData?.reduce((acc: any, lead: any) => {
        const date = format(new Date(lead.created_at), 'dd/MM');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};

      // Agrupar leads por status
      const leadsByStatus = leadsData?.reduce((acc: any, lead: any) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Agrupar campanhas por tipo
      const campaignsByType = campaignsData?.reduce((acc: any, campaign: any) => {
        acc[campaign.type] = (acc[campaign.type] || 0) + 1;
        return acc;
      }, {}) || {};

      setAnalyticsData({
        totalLeads,
        qualifiedLeads,
        activeCampaigns,
        totalCampaigns,
        emailTemplates,
        leadsGrouped,
        leadsByStatus,
        campaignsByType,
        conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0'
      });
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      toast({ title: 'Erro ao carregar analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics e Relatórios</h2>
          <p className="text-muted-foreground">Visualize métricas e performance de marketing</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.qualifiedLeads || 0} qualificados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Leads para qualificados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.activeCampaigns || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {analyticsData?.totalCampaigns || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates de Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.emailTemplates || 0}</div>
            <p className="text-xs text-muted-foreground">
              Templates criados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Leads por Data */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analyticsData?.leadsGrouped || {}).map(([date, count]: [string, any]) => (
                <div key={date} className="flex items-center justify-between">
                  <span className="text-sm">{date}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(analyticsData?.leadsGrouped || {}).map(v => Number(v) || 0))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Leads por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analyticsData?.leadsByStatus || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {status === 'new' ? 'Novo' :
                     status === 'contacted' ? 'Contatado' :
                     status === 'qualified' ? 'Qualificado' :
                     status === 'converted' ? 'Convertido' : status}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(analyticsData?.leadsByStatus || {}).map(v => Number(v) || 0))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Campanhas por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Campanhas por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analyticsData?.campaignsByType || {}).map(([type, count]: [string, any]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {type === 'email' ? 'Email' :
                     type === 'social' ? 'Social Media' :
                     type === 'ads' ? 'Anúncios' :
                     type === 'content' ? 'Conteúdo' : type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(analyticsData?.campaignsByType || {}).map(v => Number(v) || 0))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo de Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Taxa de Qualificação</span>
                <span className="font-medium">{analyticsData?.conversionRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Leads por Dia</span>
                <span className="font-medium">
                  {analyticsData?.totalLeads ? (analyticsData.totalLeads / parseInt(dateRange)).toFixed(1) : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Campanhas Ativas</span>
                <span className="font-medium">{analyticsData?.activeCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Templates Disponíveis</span>
                <span className="font-medium">{analyticsData?.emailTemplates}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente de Email Marketing
const EmailMarketingManagement = () => {
  const [activeEmailTab, setActiveEmailTab] = useState('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [emailLists, setEmailLists] = useState<any[]>([]);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingList, setEditingList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  // Buscar templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      toast({ title: 'Erro ao carregar templates', variant: 'destructive' });
    }
  };

  // Buscar listas de email
  const fetchEmailLists = async () => {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmailLists(data || []);
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
      toast({ title: 'Erro ao carregar listas', variant: 'destructive' });
    }
  };

  // Testar conexão SendGrid
  const testSendGridConnection = async () => {
    setIsTestingConnection(true);
    try {
      const isConnected = await emailService.testEmailConnection();
      setConnectionStatus(isConnected ? 'connected' : 'error');
      toast({
        title: isConnected ? 'Conexão bem-sucedida!' : 'Erro na conexão',
        description: isConnected 
          ? 'SendGrid está configurado corretamente' 
          : 'Verifique a chave da API do SendGrid',
        variant: isConnected ? 'default' : 'destructive'
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: 'Erro na conexão',
        description: 'Falha ao testar conexão com SendGrid',
        variant: 'destructive'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Enviar email de campanha
  const sendCampaignEmail = async (templateId: string, listId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      const emailList = emailLists.find(l => l.id === listId);
      
      if (!template || !emailList) {
        toast({
          title: 'Erro',
          description: 'Template ou lista não encontrados',
          variant: 'destructive'
        });
        return;
      }

      // Buscar assinantes da lista
      const { data: subscribers, error } = await supabase
        .from('email_list_subscribers')
        .select('email, name')
        .eq('email_list_id', listId)
        .eq('status', 'active');

      if (error || !subscribers || subscribers.length === 0) {
        toast({
          title: 'Erro',
          description: 'Nenhum assinante ativo encontrado na lista',
          variant: 'destructive'
        });
        return;
      }

      await emailService.sendBulkEmail(
        subscribers.map(sub => ({ email: sub.email, name: sub.name })),
        template.subject,
        template.content
      );

      toast({
        title: 'Email enviado!',
        description: `Campanha enviada para ${subscribers.length} destinatários`,
      });
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Falha ao enviar campanha de email',
        variant: 'destructive'
      });
    }
  };

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchEmailLists()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Criar template
  const createTemplate = async (templateData: any) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([templateData])
        .select()
        .single();
      
      if (error) throw error;
      setTemplates(prev => [data, ...prev]);
      toast({ title: 'Template criado com sucesso!' });
      setIsCreateTemplateOpen(false);
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast({ title: 'Erro ao criar template', variant: 'destructive' });
    }
  };

  // Criar lista de email
  const createEmailList = async (listData: any) => {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .insert([listData])
        .select()
        .single();
      
      if (error) throw error;
      setEmailLists(prev => [data, ...prev]);
      toast({ title: 'Lista criada com sucesso!' });
      setIsCreateListOpen(false);
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      toast({ title: 'Erro ao criar lista', variant: 'destructive' });
    }
  };

  // Editar template
  const updateTemplate = async (templateData: any) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .update(templateData)
        .eq('id', editingTemplate.id)
        .select()
        .single();
      
      if (error) throw error;
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data : t));
      toast({ title: 'Template atualizado com sucesso!' });
      setEditingTemplate(null);
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      toast({ title: 'Erro ao atualizar template', variant: 'destructive' });
    }
  };

  // Excluir template
  const deleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Template excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast({ title: 'Erro ao excluir template', variant: 'destructive' });
    }
  };

  // Editar lista de email
  const updateEmailList = async (listData: any) => {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .update(listData)
        .eq('id', editingList.id)
        .select()
        .single();
      
      if (error) throw error;
      setEmailLists(prev => prev.map(l => l.id === editingList.id ? data : l));
      toast({ title: 'Lista atualizada com sucesso!' });
      setEditingList(null);
    } catch (error) {
      console.error('Erro ao atualizar lista:', error);
      toast({ title: 'Erro ao atualizar lista', variant: 'destructive' });
    }
  };

  // Excluir lista de email
  const deleteEmailList = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista?')) return;
    
    try {
      const { error } = await supabase
        .from('email_lists')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setEmailLists(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Lista excluída com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir lista:', error);
      toast({ title: 'Erro ao excluir lista', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Marketing</h2>
          <p className="text-muted-foreground">Gerencie templates e listas de email</p>
        </div>
      </div>

      <Tabs value={activeEmailTab} onValueChange={setActiveEmailTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="lists">Listas de Email</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas de Email</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Templates de Email</h3>
            <Button onClick={() => setIsCreateTemplateOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(template.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingTemplate(template)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Listas de Email</h3>
            <Button onClick={() => setIsCreateListOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nova Lista
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLists.map((list) => (
                      <TableRow key={list.id}>
                        <TableCell className="font-medium">{list.name}</TableCell>
                        <TableCell>{list.description}</TableCell>
                        <TableCell>{list.subscriber_count || 0}</TableCell>
                        <TableCell>
                          {format(new Date(list.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingList(list)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteEmailList(list.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Status da Conexão SendGrid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Configuração SendGrid
                <Button 
                  onClick={testSendGridConnection}
                  disabled={isTestingConnection}
                  variant={connectionStatus === 'connected' ? 'default' : 'outline'}
                >
                  {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm">
                  {connectionStatus === 'connected' ? 'Conectado ao SendGrid' :
                   connectionStatus === 'error' ? 'Erro na conexão' : 'Status desconhecido'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Enviar Campanha */}
          <Card>
            <CardHeader>
              <CardTitle>Enviar Campanha de Email</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignSender 
                templates={templates}
                emailLists={emailLists}
                onSendCampaign={sendCampaignEmail}
                disabled={connectionStatus !== 'connected'}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para criar template */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Criar Template de Email</DialogTitle>
          </DialogHeader>
          <EmailTemplateForm
            onSubmit={createTemplate}
            onCancel={() => setIsCreateTemplateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para criar lista */}
      <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Lista de Email</DialogTitle>
          </DialogHeader>
          <EmailListForm
            onSubmit={createEmailList}
            onCancel={() => setIsCreateListOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar template */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Template de Email</DialogTitle>
          </DialogHeader>
          <EmailTemplateForm
            template={editingTemplate}
            onSubmit={updateTemplate}
            onCancel={() => setEditingTemplate(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar lista */}
      <Dialog open={!!editingList} onOpenChange={(open) => !open && setEditingList(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Lista de Email</DialogTitle>
          </DialogHeader>
          <EmailListForm
            list={editingList}
            onSubmit={updateEmailList}
            onCancel={() => setEditingList(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Formulário para templates de email
const EmailTemplateForm = ({ template, onSubmit, onCancel }: {
  template?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    type: template?.type || 'newsletter',
    content: template?.content || '',
    html_content: template?.html_content || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Template</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="promotional">Promocional</SelectItem>
              <SelectItem value="transactional">Transacional</SelectItem>
              <SelectItem value="welcome">Boas-vindas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Assunto</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo (Texto)</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          rows={6}
          placeholder="Conteúdo em texto simples..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="html_content">Conteúdo HTML</Label>
        <Textarea
          id="html_content"
          value={formData.html_content}
          onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
          rows={8}
          placeholder="<html>...</html>"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {template ? 'Atualizar' : 'Criar'} Template
        </Button>
      </div>
    </form>
  );
};

// Formulário para listas de email
const CampaignSender = ({ templates, emailLists, onSendCampaign, disabled }: {
  templates: any[];
  emailLists: any[];
  onSendCampaign: (templateId: string, listId: string) => void;
  disabled: boolean;
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendCampaign = async () => {
    if (!selectedTemplate || !selectedList) {
      toast({
        title: 'Erro',
        description: 'Selecione um template e uma lista de email',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    try {
      await onSendCampaign(selectedTemplate, selectedList);
      setSelectedTemplate('');
      setSelectedList('');
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="template-select">Template de Email</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="list-select">Lista de Email</Label>
          <Select value={selectedList} onValueChange={setSelectedList} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma lista" />
            </SelectTrigger>
            <SelectContent>
              {emailLists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name} ({list.subscriber_count || 0} assinantes)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTemplate && selectedList && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Prévia da Campanha</h4>
          <div className="text-sm text-muted-foreground">
            <p><strong>Template:</strong> {templates.find(t => t.id === selectedTemplate)?.name}</p>
            <p><strong>Lista:</strong> {emailLists.find(l => l.id === selectedList)?.name}</p>
            <p><strong>Destinatários:</strong> {emailLists.find(l => l.id === selectedList)?.subscriber_count || 0}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleSendCampaign}
          disabled={disabled || !selectedTemplate || !selectedList || isSending}
          className="min-w-[120px]"
        >
          {isSending ? 'Enviando...' : 'Enviar Campanha'}
        </Button>
      </div>
    </div>
  );
};

const EmailListForm = ({ list, onSubmit, onCancel }: {
  list?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: list?.name || '',
    description: list?.description || '',
    tags: list?.tags || ''
  });
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Buscar contatos da lista
  const fetchContacts = async () => {
    if (!list?.id) return;
    
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('email_list_subscribers')
        .select('*')
        .eq('email_list_id', list.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      toast({ title: 'Erro ao carregar contatos', variant: 'destructive' });
    } finally {
      setLoadingContacts(false);
    }
  };

  // Adicionar email individual
  const addSingleEmail = async () => {
    if (!newEmail || !list?.id) return;
    
    try {
      const { error } = await supabase
        .from('email_list_subscribers')
        .insert({
          email_list_id: list.id,
          email: newEmail,
          name: newName || null,
          status: 'active'
        });
      
      if (error) throw error;
      
      setNewEmail('');
      setNewName('');
      toast({ title: 'Email adicionado com sucesso!' });
      fetchContacts();
    } catch (error: any) {
      console.error('Erro ao adicionar email:', error);
      if (error.code === '23505') {
        toast({ title: 'Este email já está na lista', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao adicionar email', variant: 'destructive' });
      }
    }
  };

  // Adicionar emails em lote
  const addBulkEmails = async () => {
    if (!bulkEmails || !list?.id) return;
    
    const emailLines = bulkEmails.split('\n').filter(line => line.trim());
    const emailsToAdd = [];
    
    for (const line of emailLines) {
      const parts = line.split(',').map(p => p.trim());
      const email = parts[0];
      const name = parts[1] || null;
      
      if (email && email.includes('@')) {
        emailsToAdd.push({
          email_list_id: list.id,
          email,
          name,
          status: 'active'
        });
      }
    }
    
    if (emailsToAdd.length === 0) {
      toast({ title: 'Nenhum email válido encontrado', variant: 'destructive' });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('email_list_subscribers')
        .insert(emailsToAdd);
      
      if (error) throw error;
      
      setBulkEmails('');
      toast({ title: `${emailsToAdd.length} emails adicionados com sucesso!` });
      fetchContacts();
    } catch (error) {
      console.error('Erro ao adicionar emails em lote:', error);
      toast({ title: 'Erro ao adicionar emails em lote', variant: 'destructive' });
    }
  };

  // Remover contato
  const removeContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('email_list_subscribers')
        .delete()
        .eq('id', contactId);
      
      if (error) throw error;
      
      toast({ title: 'Contato removido com sucesso!' });
      fetchContacts();
    } catch (error) {
      console.error('Erro ao remover contato:', error);
      toast({ title: 'Erro ao remover contato', variant: 'destructive' });
    }
  };

  React.useEffect(() => {
    if (showContacts && list?.id) {
      fetchContacts();
    }
  }, [showContacts, list?.id]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Lista</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Descreva o propósito desta lista..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="newsletter, clientes, prospects"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {list ? 'Atualizar' : 'Criar'} Lista
          </Button>
        </div>
      </form>

      {/* Seção de gerenciamento de contatos (apenas para listas existentes) */}
      {list?.id && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Gerenciar Contatos</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowContacts(!showContacts)}
            >
              {showContacts ? 'Ocultar' : 'Mostrar'} Contatos
            </Button>
          </div>

          {showContacts && (
            <div className="space-y-4">
              {/* Adicionar email individual */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Adicionar Email Individual</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="email@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    type="email"
                  />
                  <Input
                    placeholder="Nome (opcional)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Button onClick={addSingleEmail} disabled={!newEmail}>
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Adicionar emails em lote */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Adicionar Emails em Lote</h4>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Digite um email por linha. Formato: email@exemplo.com,Nome (opcional)\nExemplo:\njoao@exemplo.com,João Silva\nmaria@exemplo.com,Maria Santos\ncarlos@exemplo.com"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    rows={5}
                  />
                  <Button onClick={addBulkEmails} disabled={!bulkEmails}>
                    Adicionar Emails em Lote
                  </Button>
                </div>
              </div>

              {/* Lista de contatos */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Contatos da Lista ({contacts.length})</h4>
                {loadingContacts ? (
                  <div className="text-center py-4">Carregando contatos...</div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhum contato adicionado ainda
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Adicionado em</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell>{contact.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                                {contact.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeContact(contact.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente principal de gestão de leads
const LeadsManagement = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const queryClient = useQueryClient();

  // Query para buscar leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads
  });

  // Filtrar leads baseado nos filtros
  const filteredLeads = leads.filter((lead: any) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Mutation para criar lead
  const createLeadMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-metrics'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Lead criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar lead', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation para atualizar lead
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-metrics'] });
      setEditingLead(null);
      toast({ title: 'Lead atualizado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation para deletar lead
  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-metrics'] });
      toast({ title: 'Lead removido com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover lead', description: error.message, variant: 'destructive' });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { label: 'Novo', variant: 'secondary' as const },
      contacted: { label: 'Contatado', variant: 'default' as const },
      qualified: { label: 'Qualificado', variant: 'default' as const },
      converted: { label: 'Convertido', variant: 'default' as const },
      lost: { label: 'Perdido', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gestão de Leads (CRM)</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Lead</DialogTitle>
                </DialogHeader>
                <LeadForm
                  onSubmit={(data) => createLeadMutation.mutate(data)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Controles de busca e filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="contacted">Contatado</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                  <SelectItem value="advertising">Publicidade</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead: any) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone || '-'}</TableCell>
                      <TableCell>{lead.company || '-'}</TableCell>
                      <TableCell>{lead.source || '-'}</TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>{format(new Date(lead.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Dialog open={editingLead?.id === lead.id} onOpenChange={(open) => !open && setEditingLead(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingLead(lead)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Editar Lead</DialogTitle>
                              </DialogHeader>
                              <LeadForm
                                lead={editingLead}
                                onSubmit={(data) => updateLeadMutation.mutate({ id: lead.id, data })}
                                onCancel={() => setEditingLead(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja remover este lead?')) {
                                deleteLeadMutation.mutate(lead.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum lead encontrado</p>
                      <p className="text-sm">Clique em "Novo Lead" para começar</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Função para buscar métricas do dashboard
async function fetchMarketingMetrics() {
  const { data: leadsData } = await supabase.from('leads').select('id, status');
  const totalLeads = leadsData?.length || 0;
  const convertedLeads = leadsData?.filter(l => l.status === 'converted').length || 0;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  const { data: campaignsData } = await supabase.from('marketing_campaigns').select('id, status');
  const activeCampaigns = campaignsData?.filter(c => c.status === 'active').length || 0;

  const { data: metricsData } = await supabase.from('campaign_metrics').select('revenue, cost');
  const totalRevenue = metricsData?.reduce((sum, m) => sum + (m.revenue || 0), 0) || 0;
  const totalCost = metricsData?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;
  const roi = totalCost > 0 ? (((totalRevenue - totalCost) / totalCost) * 100).toFixed(1) : '0.0';

  return {
    totalLeads,
    convertedLeads,
    conversionRate,
    activeCampaigns,
    totalRevenue,
    totalCost,
    roi
  };
}

const AdminMarketing = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Query para buscar métricas
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['marketing-metrics'],
    queryFn: fetchMarketingMetrics
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Marketing & CRM</h1>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="email">Email Marketing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground">+12% desde o mês passado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.conversionRate || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">+2.1% desde o mês passado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.activeCampaigns || 0}</div>
                <p className="text-xs text-muted-foreground">3 novas esta semana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROI</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.roi || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">+5.2% desde o mês passado</p>
              </CardContent>
            </Card>
          </div>

          {/* Seção de atividades recentes e campanhas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Atividades Recentes */}
            <Card>
              <CardHeader>
                <CardTitle>Atividades Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Novo lead: João Silva</p>
                      <p className="text-xs text-muted-foreground">Há 2 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Email enviado: Newsletter Janeiro</p>
                      <p className="text-xs text-muted-foreground">Há 1 hora</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Campanha pausada: Google Ads</p>
                      <p className="text-xs text-muted-foreground">Há 3 horas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campanhas Recentes */}
            <Card>
              <CardHeader>
                <CardTitle>Campanhas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Newsletter Janeiro</p>
                      <p className="text-sm text-muted-foreground">Email • Enviada</p>
                    </div>
                    <Badge variant="default">98% entrega</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Google Ads - Curso React</p>
                      <p className="text-sm text-muted-foreground">PPC • Ativa</p>
                    </div>
                    <Badge variant="secondary">45 leads</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Facebook - Webinar</p>
                      <p className="text-sm text-muted-foreground">Social • Agendada</p>
                    </div>
                    <Badge variant="outline">Em breve</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance das Campanhas - Últimos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mr-2" />
                Gráfico de performance será implementado aqui
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <LeadsManagement />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignManagement />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <EmailMarketingManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AdminMarketing;
