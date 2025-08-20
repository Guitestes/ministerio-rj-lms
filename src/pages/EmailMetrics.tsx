import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Mail, TrendingUp, Users, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { emailService } from '@/services/emailService';

interface EmailLog {
  id: string;
  recipients: string[];
  subject: string;
  template_id?: string;
  campaign_id?: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  sent_at: string;
  created_at: string;
}

interface EmailMetric {
  id: string;
  email_log_id: string;
  recipient_email: string;
  event_type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam' | 'unsubscribed';
  event_data?: any;
  timestamp: string;
}

interface EmailStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const EmailMetrics: React.FC = () => {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailMetrics, setEmailMetrics] = useState<EmailMetric[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalFailed: 0,
    totalPending: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadEmailData();
  }, []);

  const loadEmailData = async () => {
    try {
      setLoading(true);
      const [logs, metrics] = await Promise.all([
        emailService.getEmailLogs(100),
        emailService.getEmailMetrics(),
      ]);
      
      setEmailLogs(logs);
      setEmailMetrics(metrics);
      calculateStats(logs, metrics);
    } catch (error) {
      console.error('Erro ao carregar dados de email:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs: EmailLog[], metrics: EmailMetric[]) => {
    const totalSent = logs.filter(log => log.status === 'sent').length;
    const totalFailed = logs.filter(log => log.status === 'failed').length;
    const totalPending = logs.filter(log => log.status === 'pending').length;
    
    const delivered = metrics.filter(m => m.event_type === 'delivered').length;
    const opened = metrics.filter(m => m.event_type === 'opened').length;
    const clicked = metrics.filter(m => m.event_type === 'clicked').length;
    
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    
    setStats({
      totalSent,
      totalFailed,
      totalPending,
      deliveryRate,
      openRate,
      clickRate,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'default',
      failed: 'destructive',
      pending: 'secondary',
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const filteredLogs = emailLogs.filter(log => 
    log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.recipients.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const chartData = [
    { name: 'Enviados', value: stats.totalSent, color: '#0088FE' },
    { name: 'Falharam', value: stats.totalFailed, color: '#FF8042' },
    { name: 'Pendentes', value: stats.totalPending, color: '#FFBB28' },
  ];

  const metricsChartData = [
    { name: 'Taxa de Entrega', value: stats.deliveryRate },
    { name: 'Taxa de Abertura', value: stats.openRate },
    { name: 'Taxa de Clique', value: stats.clickRate },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando métricas de email...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Métricas de Email</h1>
        <Button onClick={loadEmailData}>Atualizar</Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Clique</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs">Logs de Email</TabsTrigger>
          <TabsTrigger value="metrics">Métricas Detalhadas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status dos Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxas de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Taxa']} />
                    <Bar dataKey="value" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por assunto ou destinatário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Logs de Email</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Destinatários</TableHead>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{log.subject}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {log.recipients.join(', ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.recipients.length} destinatário(s)
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(log.sent_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLogId(log.id)}
                        >
                          Ver Métricas
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas Detalhadas por Email</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Dados Adicionais</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailMetrics
                    .filter(metric => !selectedLogId || metric.email_log_id === selectedLogId)
                    .map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell>{metric.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{metric.event_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(metric.timestamp).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {metric.event_data ? (
                          <pre className="text-xs">
                            {JSON.stringify(metric.event_data, null, 2)}
                          </pre>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailMetrics;