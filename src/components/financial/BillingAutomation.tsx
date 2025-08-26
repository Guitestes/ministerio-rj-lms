import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Settings, Play, Pause, Users, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import financialService from '../../services/financialService';
import { AutomaticBillingConfig, BillingMessageTemplate, BillingNotificationLog } from '../../types/financial';

const BillingAutomation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'logs'>('config');
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<AutomaticBillingConfig[]>([]);
  const [templates, setTemplates] = useState<BillingMessageTemplate[]>([]);
  const [logs, setLogs] = useState<BillingNotificationLog[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<AutomaticBillingConfig | null>(null);

  const [configForm, setConfigForm] = useState({
    profileId: '',
    daysBefore: 3,
    daysAfter: 7,
    enableReminders: true,
    preferredContact: 'email' as 'email' | 'sms' | 'whatsapp',
    maxReminders: 3
  });

  const [automationStats, setAutomationStats] = useState({
    totalConfigs: 0,
    activeConfigs: 0,
    lastProcessed: null as string | null,
    processedToday: 0
  });

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    setLoading(true);
    try {
      // Simulated data loading - in real implementation, these would be separate API calls
      // const configs = await financialService.getAutomaticBillingConfigs();
      // const templates = await financialService.getBillingMessageTemplates();
      // const logs = await financialService.getBillingNotificationLogs();
      
      // For now, using mock data
      setConfigs([]);
      setTemplates([]);
      setLogs([]);
      setAutomationStats({
        totalConfigs: 0,
        activeConfigs: 0,
        lastProcessed: null,
        processedToday: 0
      });
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupBilling = async () => {
    if (!configForm.profileId) {
      alert('Selecione um perfil de estudante');
      return;
    }

    setLoading(true);
    try {
      const result = await financialService.setupAutomaticBilling(configForm.profileId, {
        daysBefore: configForm.daysBefore,
        daysAfter: configForm.daysAfter,
        enableReminders: configForm.enableReminders,
        preferredContact: configForm.preferredContact,
        maxReminders: configForm.maxReminders
      });

      if (result.success) {
        alert('Configuração de cobrança automática salva com sucesso!');
        setShowConfigModal(false);
        setConfigForm({
          profileId: '',
          daysBefore: 3,
          daysAfter: 7,
          enableReminders: true,
          preferredContact: 'email' as 'email' | 'sms' | 'whatsapp',
          maxReminders: 3
        });
        loadAutomationData();
      } else {
        alert(`Erro ao configurar cobrança automática: ${result.message}`);
      }
    } catch (error) {
      console.error('Error setting up billing:', error);
      alert('Erro ao configurar cobrança automática. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAutomaticBilling = async () => {
    setLoading(true);
    try {
      const result = await financialService.processAutomaticBilling();
      
      if (result.success) {
        alert(`Processamento concluído! ${result.processedCount} notificações enviadas.`);
        loadAutomationData();
      } else {
        alert(`Erro no processamento: ${result.message}`);
      }
    } catch (error) {
      console.error('Error processing automatic billing:', error);
      alert('Erro ao processar cobrança automática. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
  }> = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Configurações"
          value={automationStats.totalConfigs}
          icon={<Settings className="w-6 h-6 text-blue-600" />}
          color="#0088FE"
        />
        <StatCard
          title="Configurações Ativas"
          value={automationStats.activeConfigs}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          color="#00C49F"
        />
        <StatCard
          title="Processadas Hoje"
          value={automationStats.processedToday}
          icon={<Bell className="w-6 h-6 text-purple-600" />}
          color="#8884D8"
        />
        <StatCard
          title="Último Processamento"
          value={automationStats.lastProcessed ? new Date(automationStats.lastProcessed).toLocaleDateString('pt-BR') : 'Nunca'}
          icon={<Calendar className="w-6 h-6 text-yellow-600" />}
          color="#FFBB28"
        />
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Ações</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Nova Configuração
          </button>
          <button
            onClick={handleProcessAutomaticBilling}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? 'Processando...' : 'Processar Agora'}
          </button>
        </div>
      </div>

      {/* Configurations List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Configurações de Cobrança</h3>
        </div>
        
        {configs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma configuração encontrada</p>
            <p className="text-sm">Clique em "Nova Configuração" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estudante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dias Antes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dias Depois
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canais
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
                {configs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {config.profileId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.daysBefore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.daysAfter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        {config.preferredContact === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
                        {config.preferredContact === 'sms' && <MessageSquare className="w-4 h-4 text-green-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        config.enableReminders ? 'text-green-800 bg-green-100' : 'text-gray-800 bg-gray-100'
                      }`}>
                        {config.enableReminders ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedConfig(config);
                          setConfigForm({
                            profileId: config.profileId,
                            daysBefore: config.daysBefore,
                            daysAfter: config.daysAfter,
                            enableReminders: config.enableReminders,
                            preferredContact: config.preferredContact,
                            maxReminders: config.maxReminders
                          });
                          setShowConfigModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Templates de Mensagem</h3>
        <p className="text-gray-600 mb-4">
          Os templates são configurados automaticamente no banco de dados. Você pode personalizá-los editando diretamente as configurações.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Mail className="w-5 h-5 text-blue-500 mr-2" />
              <h4 className="font-medium text-gray-800">Email - Antes do Vencimento</h4>
            </div>
            <p className="text-sm text-gray-600">
              Template usado para notificar estudantes antes da data de vencimento.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Mail className="w-5 h-5 text-red-500 mr-2" />
              <h4 className="font-medium text-gray-800">Email - Após Vencimento</h4>
            </div>
            <p className="text-sm text-gray-600">
              Template usado para notificar estudantes após a data de vencimento.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <MessageSquare className="w-5 h-5 text-green-500 mr-2" />
              <h4 className="font-medium text-gray-800">SMS - Lembrete</h4>
            </div>
            <p className="text-sm text-gray-600">
              Template usado para enviar lembretes via SMS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Log de Notificações</h3>
        </div>
        
        {logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma notificação enviada ainda</p>
            <p className="text-sm">Os logs aparecerão aqui após o processamento automático</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estudante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.sentAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.profileId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.notificationType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {log.notificationType === 'email' ? (
                          <Mail className="w-4 h-4 text-blue-500 mr-1" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-green-500 mr-1" />
                        )}
                        {log.notificationType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sent' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                      }`}>
                        {log.status === 'sent' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {log.status === 'sent' ? 'Enviado' : 'Falhou'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Cobrança Automática</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'config', label: 'Configurações', icon: Settings },
          { id: 'templates', label: 'Templates', icon: Mail },
          { id: 'logs', label: 'Logs', icon: Bell }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {activeTab === 'config' && renderConfig()}
        {activeTab === 'templates' && renderTemplates()}
        {activeTab === 'logs' && renderLogs()}
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {selectedConfig ? 'Editar Configuração' : 'Nova Configuração'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID do Estudante *</label>
                <input
                  type="text"
                  placeholder="Digite o ID do estudante"
                  value={configForm.profileId}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, profileId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!!selectedConfig}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dias Antes</label>
                  <input
                    type="number"
                    min="0"
                    value={configForm.daysBeforeDue}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, daysBeforeDue: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dias Depois</label>
                  <input
                    type="number"
                    min="0"
                    value={configForm.daysAfterDue}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, daysAfterDue: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Lembretes</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={configForm.maxReminders}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, maxReminders: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Canais de Notificação</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={configForm.emailEnabled}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Mail className="w-4 h-4 ml-2 mr-1 text-blue-500" />
                    <span className="text-sm text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={configForm.smsEnabled}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <MessageSquare className="w-4 h-4 ml-2 mr-1 text-green-500" />
                    <span className="text-sm text-gray-700">SMS</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setSelectedConfig(null);
                  setConfigForm({
                    profileId: '',
                    daysBeforeDue: 3,
                    daysAfterDue: 7,
                    emailEnabled: true,
                    smsEnabled: false,
                    maxReminders: 3
                  });
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSetupBilling}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingAutomation;