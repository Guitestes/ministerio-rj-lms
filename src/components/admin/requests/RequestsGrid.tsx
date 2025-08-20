import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusVariant = {
  open: "secondary",
  in_progress: "default",
  resolved: "outline",
  closed: "destructive",
};

export const RequestsGrid = ({ requests, onSelectRequest }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <CardTitle>{request.subject}</CardTitle>
            <CardDescription>
              Por: {request.user?.name || 'N/A'} em {new Date(request.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span>{request.request_type}</span>
              <Badge variant={statusVariant[request.status] || 'default'}>
                {request.status}
              </Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" size="sm" onClick={() => onSelectRequest(request)}>
              Ver Detalhes
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default RequestsGrid;
