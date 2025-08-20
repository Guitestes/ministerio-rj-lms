import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Send, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Users, 
  List,
  Trash2
} from 'lucide-react';
import { 
  testSingleEmail, 
  testBulkEmail, 
  testEmailListManagement, 
  runAllEmailTests,
  cleanupTestData 
} from '@/utils/emailTestUtils';
import { emailService } from '@/services/emailService';

interface TestResult {
  success: boolean;
  error?: string;
  logId?: string;
  logIds?: string[];
  totalSent?: number;
  listId?: string;
  totalSubscribers?: number;
}

const EmailTesting: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [customEmail, setCustomEmail] = useState('');
  const [customSubject, setCustomSubject] = useState('Teste Personalizado - OneEduca');
  const [customContent, setCustomContent] = useState(`
<h2>Email de Teste Personalizado</h2>
<p>Este é um email de teste personalizado do sistema OneEduca.</p>
<p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
<p>Funcionalidade testada com sucesso!</p>
  `.trim());

  const runTest = async (testName: string, testFunction: () => Promise<TestResult>) => {
    setLoading(true);
    try {
      const result = await testFunction();
      setTestResults(prev => ({ ...prev, [testName]: result }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };

  const sendCustomEmail = async () => {
    if (!customEmail.trim()) {
      alert('Por favor, insira um email válido');
      return;
    }

    setLoading(true);
    try {
      const logId = await emailService.sendEmail({
        to: [{ email: customEmail.trim(), name: 'Teste Personalizado' }],
        subject: customSubject,
        content: customContent,
        campaignId: 'custom-test-' + Date.now()
      });

      setTestResults(prev => ({ 
        ...prev, 
        customEmail: { 
          success: !!logId, 
          logId: logId || undefined,
          error: !logId ? 'Falha no envio' : undefined
        } 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        customEmail: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    try {
      const results = await runAllEmailTests();
      setTestResults(prev => ({ ...prev, ...results }));
    } catch (error) {
      console.error('Erro ao executar todos os testes:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanup = async () => {
    setLoading(true);
    try {
      await cleanupTestData();
      setTestResults({});
      alert('Dados de teste removidos com sucesso!');
    } catch (error) {
      alert('Erro ao limpar dados de teste: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result?: TestResult) => {
    if (!result) return null;
    
    return (
      <Badge variant={result.success ? 'default' : 'destructive'}>
        {result.success ? (
          <><CheckCircle className="w-3 h-3 mr-1" /> Sucesso</>
        ) : (
          <><XCircle className="w-3 h-3 mr-1" /> Falha</>
        )}
      </Badge>
    );
  };

  const getResultDetails = (result?: TestResult) => {
    if (!result) return null;
    
    return (
      <div className="mt-2 text-sm text-muted-foreground">
        {result.success ? (
          <div className="space-y-1">
            {result.logId && <div>Log ID: {result.logId}</div>}
            {result.logIds && <div>Log IDs: {result.logIds.join(', ')}</div>}
            {result.totalSent && <div>Total enviados: {result.totalSent}</div>}
            {result.listId && <div>Lista ID: {result.listId}</div>}
            {result.totalSubscribers !== undefined && <div>Assinantes: {result.totalSubscribers}</div>}
          </div>
        ) : (
          <div className="text-red-600">Erro: {result.error}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Teste de Funcionalidades de Email</h1>
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
            Executar Todos os Testes
          </Button>
          <Button 
            onClick={cleanup} 
            disabled={loading}
            variant="outline"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Dados de Teste
          </Button>
        </div>
      </div>

      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          Esta página permite testar todas as funcionalidades do sistema de email marketing. 
          Os testes incluem envio individual, em lote, gerenciamento de listas e rastreamento de métricas.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="individual">Email Individual</TabsTrigger>
          <TabsTrigger value="bulk">Email em Lote</TabsTrigger>
          <TabsTrigger value="lists">Gerenciamento de Listas</TabsTrigger>
          <TabsTrigger value="custom">Teste Personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Teste de Email Individual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Testa o envio de um email individual com rastreamento de métricas.
              </p>
              
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => runTest('singleEmail', testSingleEmail)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar Email de Teste
                </Button>
                {getResultBadge(testResults.singleEmail)}
              </div>
              
              {getResultDetails(testResults.singleEmail)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teste de Email em Lote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Testa o envio de emails para múltiplos destinatários simultaneamente.
              </p>
              
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => runTest('bulkEmail', testBulkEmail)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar Emails em Lote
                </Button>
                {getResultBadge(testResults.bulkEmail)}
              </div>
              
              {getResultDetails(testResults.bulkEmail)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Teste de Gerenciamento de Listas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Testa a criação de listas, adição/remoção de assinantes e gerenciamento.
              </p>
              
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => runTest('listManagement', testEmailListManagement)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <List className="w-4 h-4 mr-2" />}
                  Testar Gerenciamento de Listas
                </Button>
                {getResultBadge(testResults.listManagement)}
              </div>
              
              {getResultDetails(testResults.listManagement)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Teste Personalizado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Email de Destino</label>
                  <Input
                    type="email"
                    placeholder="exemplo@email.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Assunto</label>
                  <Input
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Conteúdo HTML</label>
                  <Textarea
                    rows={8}
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <Button 
                  onClick={sendCustomEmail}
                  disabled={loading || !customEmail.trim()}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar Email Personalizado
                </Button>
                {getResultBadge(testResults.customEmail)}
              </div>
              
              {getResultDetails(testResults.customEmail)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resumo dos Resultados */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo dos Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {Object.entries(testResults).map(([testName, result]) => (
                <div key={testName} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium capitalize">
                    {testName.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  {getResultBadge(result)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailTesting;