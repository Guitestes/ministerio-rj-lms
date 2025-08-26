import React, { useState } from 'react';
import { Upload, Download, Users, Award, AlertCircle, CheckCircle } from 'lucide-react';
import financialService from '../../services/financialService';
import { BulkStudentFinancialData, BulkScholarshipData, BulkOperationResult } from '../../types/financial';

interface BulkOperationsProps {
  onOperationComplete?: () => void;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({ onOperationComplete }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'scholarships'>('students');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkOperationResult[]>([]);
  const [csvData, setCsvData] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  };

  const parseCsvToStudentData = (csv: string): BulkStudentFinancialData[] => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      return {
        studentId: row.student_id || row.studentId,
        bankAccount: row.bank_account || row.bankAccount,
        bankCode: row.bank_code || row.bankCode,
        agencyNumber: row.agency_number || row.agencyNumber,
        accountNumber: row.account_number || row.accountNumber,
        taxId: row.tax_id || row.taxId,
        billingAddress: row.billing_address || row.billingAddress,
        billingCity: row.billing_city || row.billingCity,
        billingState: row.billing_state || row.billingState,
        billingZipCode: row.billing_zip_code || row.billingZipCode
      };
    });
  };

  const parseCsvToScholarshipData = (csv: string): BulkScholarshipData[] => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      return {
        studentId: row.student_id || row.studentId,
        scholarshipId: row.scholarship_id || row.scholarshipId,
        startDate: row.start_date || row.startDate,
        endDate: row.end_date || row.endDate,
        discountPercentage: parseFloat(row.discount_percentage || row.discountPercentage || '0')
      };
    });
  };

  const handleStudentDataUpload = async () => {
    if (!csvData) return;
    
    setLoading(true);
    try {
      const studentData = parseCsvToStudentData(csvData);
      const results = await financialService.bulkRegisterStudentFinancialData(studentData);
      setResults(results);
      onOperationComplete?.();
    } catch (error) {
      console.error('Error uploading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScholarshipUpload = async () => {
    if (!csvData) return;
    
    setLoading(true);
    try {
      const scholarshipData = parseCsvToScholarshipData(csvData);
      const results = await financialService.bulkRegisterScholarshipStudents(scholarshipData);
      setResults(results);
      onOperationComplete?.();
    } catch (error) {
      console.error('Error uploading scholarship data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (type: 'students' | 'scholarships') => {
    let csvContent = '';
    
    if (type === 'students') {
      csvContent = 'student_id,bank_account,bank_code,agency_number,account_number,tax_id,billing_address,billing_city,billing_state,billing_zip_code\n';
      csvContent += 'exemplo123,12345-6,001,1234,567890-1,123.456.789-00,Rua Exemplo 123,São Paulo,SP,01234-567';
    } else {
      csvContent = 'student_id,scholarship_id,start_date,end_date,discount_percentage\n';
      csvContent += 'exemplo123,bolsa001,2024-01-01,2024-12-31,50.00';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Operações em Lote</h2>
      
      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'students'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Dados Financeiros de Estudantes
        </button>
        <button
          onClick={() => setActiveTab('scholarships')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'scholarships'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Award className="w-4 h-4 mr-2" />
          Bolsas de Estudo
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Template Download */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">1. Baixar Template</h3>
          <p className="text-blue-700 mb-3">
            Baixe o template CSV para {activeTab === 'students' ? 'dados financeiros de estudantes' : 'bolsas de estudo'}
          </p>
          <button
            onClick={() => downloadTemplate(activeTab)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Template CSV
          </button>
        </div>

        {/* File Upload */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Upload do Arquivo</h3>
          <p className="text-gray-600 mb-3">
            Selecione o arquivo CSV preenchido com os dados
          </p>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {csvData && (
              <span className="text-green-600 text-sm flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Arquivo carregado
              </span>
            )}
          </div>
        </div>

        {/* Process Button */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">3. Processar Dados</h3>
          <p className="text-green-700 mb-3">
            Clique para processar os dados do arquivo CSV
          </p>
          <button
            onClick={activeTab === 'students' ? handleStudentDataUpload : handleScholarshipUpload}
            disabled={!csvData || loading}
            className="flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'Processando...' : 'Processar Dados'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Resultados do Processamento</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    )}
                    <span className="font-medium">
                      {activeTab === 'students' ? `Estudante: ${result.studentId}` : `Estudante: ${result.studentId} - Bolsa: ${result.scholarshipId}`}
                    </span>
                  </div>
                  {result.errorMessage && (
                    <span className="text-sm text-red-600">{result.errorMessage}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperations;