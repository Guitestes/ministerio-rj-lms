import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Download, RefreshCw } from 'lucide-react';
import financialService from '../../services/financialService';
import { FinancialBalanceReport, FinancialSummaryReport, FinancialDashboardSummary, DebtSettlementReport, ClassDelinquencyReport } from '../../types/financial';

const FinancialReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'balance' | 'summary' | 'delinquency'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<FinancialDashboardSummary | null>(null);
  const [balanceData, setBalanceData] = useState<FinancialBalanceReport | null>(null);
  const [summaryData, setSummaryData] = useState<FinancialSummaryReport | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboard, balance] = await Promise.all([
        financialService.getFinancialDashboard(),
        financialService.getFinancialBalance()
      ]);
      setDashboardData(dashboard);
      setBalanceData(balance);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      const summary = await financialService.getFinancialSummary(
        dateRange.startDate,
        dateRange.endDate
      );
      setSummaryData(summary);
    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getDashboardChartData = () => {
    if (!dashboardData) return [];
    
    return [
      {
        name: 'Receita Mensal',
        value: dashboardData.currentMonthRevenue,
        color: '#00C49F'
      },
      {
        name: 'Despesas Mensais',
        value: dashboardData.currentMonthExpenses,
        color: '#FF8042'
      },
      {
        name: 'Valores em Atraso',
        value: dashboardData.overdueAmount,
        color: '#FFBB28'
      }
    ];
  };

  const getBalanceChartData = () => {
    if (!balanceData) return [];
    
    return [
      {
        name: 'Recebido',
        value: balanceData.totalIncome,
        color: '#00C49F'
      },
      {
        name: 'Pendente',
        value: dashboardData.pendingReceivables,
        color: '#0088FE'
      },
      {
        name: 'Em Atraso',
        value: dashboardData.overdueAmount,
        color: '#FF8042'
      }
    ];
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: string;
  }> = ({ title, value, icon, trend, trendValue, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Mensal"
          value={dashboardData ? formatCurrency(dashboardData.currentMonthRevenue) : '-'}
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          color="#00C49F"
        />
        <StatCard
          title="Despesas Mensais"
          value={dashboardData ? formatCurrency(dashboardData.currentMonthExpenses) : '-'}
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
          color="#0088FE"
        />
        <StatCard
          title="Taxa de Inadimplência"
          value={dashboardData ? formatPercentage(dashboardData.averageDelinquencyRate) : '-'}
          icon={<BarChart className="w-6 h-6 text-purple-600" />}
          color="#8884D8"
        />
        <StatCard
          title="Estudantes Inadimplentes"
          value={dashboardData?.delinquentStudents || 0}
          icon={<Users className="w-6 h-6 text-red-600" />}
          color="#FF8042"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Visão Geral Financeira</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getDashboardChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Balance Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Valores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getBalanceChartData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {getBalanceChartData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderBalance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Receitas"
          value={balanceData ? formatCurrency(balanceData.totalIncome) : '-'}
          icon={<DollarSign className="w-6 h-6 text-blue-600" />}
          color="#0088FE"
        />
        <StatCard
          title="Total de Despesas"
          value={balanceData ? formatCurrency(balanceData.totalExpenses) : '-'}
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          color="#00C49F"
        />
        <StatCard
          title="Saldo Líquido"
          value={balanceData ? formatCurrency(balanceData.netBalance) : '-'}
          icon={<Calendar className="w-6 h-6 text-yellow-600" />}
          color="#FFBB28"
        />
        <StatCard
          title="Valores em Atraso"
          value={dashboardData ? formatCurrency(dashboardData.overdueAmount) : '-'}
          icon={<TrendingDown className="w-6 h-6 text-red-600" />}
          color="#FF8042"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Balanço Financeiro Detalhado</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={getBalanceChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="value">
              {getBalanceChartData().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Período de Análise</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadSummaryData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {summaryData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Receita Total"
              value={formatCurrency(summaryData.totalIncome)}
              icon={<DollarSign className="w-6 h-6 text-green-600" />}
              color="#00C49F"
            />
            <StatCard
              title="Despesas Totais"
              value={formatCurrency(summaryData.totalExpenses)}
              icon={<TrendingDown className="w-6 h-6 text-red-600" />}
              color="#FF8042"
            />
            <StatCard
              title="Resultado Líquido"
              value={formatCurrency(summaryData.netResult)}
              icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
              color="#0088FE"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="Número de Transações"
              value={summaryData.transactionCount}
              icon={<BarChart className="w-6 h-6 text-purple-600" />}
              color="#8884D8"
            />
            <StatCard
              title="Valor Médio por Transação"
              value={formatCurrency(summaryData.averageTransactionValue)}
              icon={<DollarSign className="w-6 h-6 text-yellow-600" />}
              color="#FFBB28"
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios Financeiros</h1>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart },
          { id: 'balance', label: 'Balanço', icon: DollarSign },
          { id: 'summary', label: 'Resumo', icon: TrendingUp }
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
        {loading && (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
        
        {!loading && (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'balance' && renderBalance()}
            {activeTab === 'summary' && renderSummary()}
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialReports;