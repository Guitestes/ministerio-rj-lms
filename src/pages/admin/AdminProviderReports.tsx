import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serviceProviderService, ProviderPerformance } from '@/services/serviceProviderService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminProviderReports = () => {
  const [reportData, setReportData] = useState<ProviderPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      const data = await serviceProviderService.getProviderPerformanceReport();
      setReportData(data);
      setIsLoading(false);
    };
    fetchReportData();
  }, []);

  const chartData = reportData.map(item => ({
    name: item.provider_name,
    "Nota Média": item.average_score,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Relatório de Desempenho dos Prestadores</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nota Média de Avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Nota Média" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados Completos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prestador</TableHead>
                  <TableHead>Nota Média</TableHead>
                  <TableHead>Total de Contratos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((item) => (
                  <TableRow key={item.provider_id}>
                    <TableCell>{item.provider_name}</TableCell>
                    <TableCell>{item.average_score ? item.average_score.toFixed(2) : 'N/A'}</TableCell>
                    <TableCell>{item.total_contracts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProviderReports;
