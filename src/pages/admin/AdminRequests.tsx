import { useState, useEffect } from 'react';
import { requestService } from '@/services/requestService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, List } from 'lucide-react';

import RequestsTable from '@/components/admin/requests/RequestsTable';
import RequestsGrid from '@/components/admin/requests/RequestsGrid';
import RequestDetailsModal from '@/components/admin/requests/RequestDetailsModal';

const AdminRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const fetchRequests = () => {
    setIsLoading(true);
    requestService.getAllRequests()
      .then(setRequests)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSelectRequest = (request: any) => {
    // Fetch full details including comments
    requestService.getRequestById(request.id).then(fullRequest => {
      setSelectedRequest(fullRequest);
    });
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };

  const handleUpdateRequest = () => {
    handleCloseModal();
    fetchRequests(); // Refresh the list
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Solicitações</h1>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'grid')}>
          <TabsList>
            <TabsTrigger value="table"><Table className="h-4 w-4 mr-2" /> Tabela</TabsTrigger>
            <TabsTrigger value="grid"><List className="h-4 w-4 mr-2" /> Grade</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando solicitações...</p>
          ) : (
            <>
              {viewMode === 'table' ? (
                <RequestsTable requests={requests} onSelectRequest={handleSelectRequest} />
              ) : (
                <RequestsGrid requests={requests} onSelectRequest={handleSelectRequest} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={handleCloseModal}
          onUpdate={handleUpdateRequest}
        />
      )}
    </div>
  );
};

export default AdminRequests;
