import React, { useState, useEffect } from 'react';
import { CreditCard, Send, Download, Eye, CheckCircle, Clock, AlertCircle, Plus, Search, Filter } from 'lucide-react';
import financialService from '../../services/financialService';
import { BankSlip } from '../../types/financial';

interface BankSlipManagementProps {
  onSlipUpdate?: () => void;
}

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
}

const BankSlipManagement: React.FC<BankSlipManagementProps> = ({ onSlipUpdate }) => {
  const [bankSlips, setBankSlips] = useState<BankSlip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlips, setSelectedSlips] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<BankSlip | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const [generateForm, setGenerateForm] = useState({
    selectedStudents: [] as string[],
    amount: '',
    dueDate: '',
    description: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadBankSlips();
    loadStudents();
  }, []);

  const loadBankSlips = async () => {
    setLoading(true);
    try {
      const slips = await financialService.getBankSlips();
      setBankSlips(slips);
    } catch (error) {
      console.error('Error loading bank slips:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      // Importar o userService para buscar os estudantes
      const { userService } = await import('../../services/userService');
      const users = await userService.getUsers();
      // Filtrar apenas estudantes
      const studentUsers = users.filter(user => user.role === 'student');
      setStudents(studentUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      })));
    } catch (error) {
      console.error('Error loading students:', error);
      alert('Erro ao carregar lista de estudantes.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!generateForm.selectedStudents.length || !generateForm.amount || !generateForm.dueDate) {
      alert('Preencha todos os campos obrigatórios e selecione pelo menos um estudante');
      return;
    }

    setLoading(true);
    try {
      // Validar se todos os IDs são UUIDs válidos
      const validUUIDs = generateForm.selectedStudents.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });

      if (validUUIDs.length !== generateForm.selectedStudents.length) {
        alert('Alguns IDs de estudantes são inválidos. Tente recarregar a lista de estudantes.');
        return;
      }

      const batchId = await financialService.generateBankSlipsBatch(
        validUUIDs,
        parseFloat(generateForm.amount),
        generateForm.dueDate,
        generateForm.description
      );
      
      alert(`Lote de boletos gerado com sucesso! ID do lote: ${batchId}`);
      setShowGenerateModal(false);
      setGenerateForm({ selectedStudents: [], amount: '', dueDate: '', description: '' });
      loadBankSlips();
      onSlipUpdate?.();
    } catch (error) {
      console.error('Error generating bank slips:', error);
      alert('Erro ao gerar boletos. Verifique se os estudantes selecionados são válidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedSlip || !paymentForm.paymentAmount) {
      alert('Preencha o valor do pagamento');
      return;
    }

    setLoading(true);
    try {
      const result = await financialService.processBankSlipPayment(
        selectedSlip.id,
        parseFloat(paymentForm.paymentAmount),
        paymentForm.paymentDate
      );
      
      if (result.success) {
        alert(`Pagamento processado com sucesso! ${result.message}`);
        setShowPaymentModal(false);
        setSelectedSlip(null);
        setPaymentForm({ paymentAmount: '', paymentDate: new Date().toISOString().split('T')[0] });
        loadBankSlips();
        onSlipUpdate?.();
      } else {
        alert(`Erro ao processar pagamento: ${result.message}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const filteredSlips = bankSlips.filter(slip => {
    const matchesStatus = !filters.status || slip.status === filters.status;
    const matchesSearch = !filters.search || 
      slip.id.toLowerCase().includes(filters.search.toLowerCase()) ||
      slip.studentId.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDateFrom = !filters.dateFrom || new Date(slip.dueDate) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(slip.dueDate) <= new Date(filters.dateTo);
    
    return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Boletos</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Gerar Boletos
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Vencido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ID do boleto ou estudante"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Bank Slips Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Boletos ({filteredSlips.length})</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estudante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {slip.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slip.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(slip.finalAmount || slip.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(slip.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(slip.status)}`}>
                        {getStatusIcon(slip.status)}
                        <span className="ml-1">{getStatusLabel(slip.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSlip(slip);
                          setPaymentForm(prev => ({ ...prev, paymentAmount: slip.finalAmount?.toString() || slip.amount.toString() }));
                          setShowPaymentModal(true);
                        }}
                        disabled={slip.status === 'paid' || slip.status === 'canceled'}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Processar Pagamento"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/boleto/${slip.id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900"
                        title="Visualizar Boleto"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/boleto/${slip.id}/download`, '_blank')}
                        className="text-purple-600 hover:text-purple-900"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Gerar Lote de Boletos</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar Estudantes *</label>
                {loadingStudents ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Carregando estudantes...</p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {students.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Nenhum estudante encontrado</p>
                    ) : (
                      students.map((student) => (
                        <label key={student.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={generateForm.selectedStudents.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGenerateForm({
                                  ...generateForm,
                                  selectedStudents: [...generateForm.selectedStudents, student.id]
                                });
                              } else {
                                setGenerateForm({
                                  ...generateForm,
                                  selectedStudents: generateForm.selectedStudents.filter(id => id !== student.id)
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
                {generateForm.selectedStudents.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {generateForm.selectedStudents.length} estudante(s) selecionado(s)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={generateForm.amount}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  value={generateForm.dueDate}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Descrição do boleto"
                  value={generateForm.description}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateBatch}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
              >
                {loading ? 'Gerando...' : 'Gerar Boletos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSlip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Processar Pagamento</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Boleto: {selectedSlip.id.substring(0, 8)}...</p>
                <p className="text-sm text-gray-600">Estudante: {selectedSlip.studentId}</p>
                <p className="text-sm text-gray-600">Valor Original: {formatCurrency(selectedSlip.amount)}</p>
                {selectedSlip.finalAmount && selectedSlip.finalAmount !== selectedSlip.amount && (
                  <p className="text-sm text-gray-600">Valor Final: {formatCurrency(selectedSlip.finalAmount)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Pagamento *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.paymentAmount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentAmount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedSlip(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors"
              >
                {loading ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankSlipManagement;