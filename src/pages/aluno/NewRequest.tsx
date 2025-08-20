import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestService, RequestData } from '@/services/requestService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const NewRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [requestType, setRequestType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject || !requestType) {
      toast.error('Por favor, preencha o tipo e o assunto da solicitação.');
      return;
    }

    setIsSubmitting(true);
    const requestData: RequestData = {
      user_id: user.id,
      request_type: requestType,
      subject: subject,
      description: description,
    };

    try {
      await requestService.createRequest(requestData);
      toast.success('Sua solicitação foi enviada com sucesso!');
      // TODO: Redirect to a page where the user can see their requests.
      // For now, redirect to dashboard.
      navigate('/dashboard');
    } catch (error) {
      // The service already shows a toast message
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nova Solicitação Administrativa</CardTitle>
          <CardDescription>
            Abra um chamado para resolver questões administrativas como trancamento, cancelamento, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="request-type">Tipo de Solicitação</Label>
              <Select onValueChange={setRequestType} value={requestType}>
                <SelectTrigger id="request-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trancamento de Matrícula">Trancamento de Matrícula</SelectItem>
                  <SelectItem value="Cancelamento de Curso">Cancelamento de Curso</SelectItem>
                  <SelectItem value="Segunda Via de Certificado">Segunda Via de Certificado</SelectItem>
                  <SelectItem value="Revisão de Nota">Revisão de Nota</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Um resumo da sua solicitação"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhe sua solicitação aqui."
                rows={5}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewRequest;
