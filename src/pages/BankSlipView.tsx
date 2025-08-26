import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Copy, Calendar, DollarSign, User, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import financialService from '@/services/financialService';
import { userService } from '@/services/userService';
import { BankSlip } from '@/types/financial';
import { User as UserType } from '@/types/index';

const BankSlipView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bankSlip, setBankSlip] = useState<BankSlip | null>(null);
  const [student, setStudent] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('ID do boleto não fornecido');
      setLoading(false);
      return;
    }

    loadBankSlip();
  }, [id]);

  const loadBankSlip = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar todos os boletos e filtrar pelo ID
      const bankSlips = await financialService.getBankSlips();
      const foundSlip = bankSlips.find(slip => slip.id === id);

      if (!foundSlip) {
        setError('Boleto não encontrado');
        return;
      }

      setBankSlip(foundSlip);

      // Buscar dados do estudante
      try {
        const users = await userService.getUsers();
        const foundStudent = users.find(user => user.id === foundSlip.studentId);
        if (foundStudent) {
          setStudent(foundStudent);
        }
      } catch (studentError) {
        console.error('Erro ao carregar dados do estudante:', studentError);
      }
    } catch (err) {
      console.error('Erro ao carregar boleto:', err);
      setError('Erro ao carregar boleto');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      case 'canceled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const copyBarcode = () => {
    if (bankSlip?.barcode) {
      navigator.clipboard.writeText(bankSlip.barcode);
      toast.success('Código de barras copiado!');
    }
  };

  const downloadBankSlip = () => {
    // Implementar download do boleto
    window.open(`/boleto/${id}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando boleto...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bankSlip) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Erro</h2>
            <p className="text-muted-foreground mb-4">{error || 'Boleto não encontrado'}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Boleto Bancário</h1>
            <p className="text-muted-foreground">ID: {bankSlip.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadBankSlip} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Boleto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Informações do Boleto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status:</span>
              <Badge className={getStatusColor(bankSlip.status)}>
                {getStatusText(bankSlip.status)}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor:</span>
              <span className="text-lg font-bold">{formatCurrency(bankSlip.amount)}</span>
            </div>
            
            {bankSlip.discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Desconto:</span>
                <span className="text-green-600">-{formatCurrency(bankSlip.discountAmount)}</span>
              </div>
            )}
            
            {bankSlip.lateFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Multa:</span>
                <span className="text-red-600">+{formatCurrency(bankSlip.lateFee)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor Final:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(bankSlip.finalAmount)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Vencimento:</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(bankSlip.dueDate)}
              </span>
            </div>
            
            {bankSlip.paymentDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Data do Pagamento:</span>
                <span className="text-green-600">{formatDate(bankSlip.paymentDate)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Criado em:</span>
              <span>{formatDate(bankSlip.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Estudante */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações do Estudante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Nome:</span>
                  <span>{student.name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{student.email}</span>
                </div>
                
                {student.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Telefone:</span>
                    <span>{student.phone}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">ID:</span>
                  <span className="text-xs font-mono">{student.id}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Informações do estudante não disponíveis</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Código de Barras */}
        {bankSlip.barcode && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Código de Barras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-sm font-mono">{bankSlip.barcode}</code>
                <Button onClick={copyBarcode} size="sm" variant="outline">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PIX */}
        {bankSlip.pixKey && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>PIX</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Chave PIX:</span>
                  <span className="font-mono">{bankSlip.pixKey}</span>
                </div>
                {bankSlip.qrCodeUrl && (
                  <div className="text-center">
                    <img 
                      src={bankSlip.qrCodeUrl} 
                      alt="QR Code PIX" 
                      className="mx-auto max-w-48 h-auto"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {bankSlip.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{bankSlip.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BankSlipView;