import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { professorService } from '@/services/professorService';
import { calendarService } from '@/services/calendarService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

const FichaControle = () => {
  const { user } = useAuth();
  const [taughtCourses, setTaughtCourses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
        professorService.getTaughtCourses(user.id),
        professorService.getProfessorPayments(user.id),
        calendarService.getEventsForProfessor(user.id),
      ]).then(([courses, paymentsData, events]) => {
        setTaughtCourses(courses);
        setPayments(paymentsData);
        setCalendarEvents(events.map(e => ({
          title: `${e.courses.title} - ${e.classes.name}`,
          start: e.startTime,
          end: e.endTime,
          allDay: false,
          extendedProps: {
            status: e.status,
          }
        })));
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [user]);

  const getEventClassNames = (arg: any) => {
    const status = arg.event.extendedProps.status;
    if (status === 'completed') {
      return 'fc-event-completed';
    }
    if (status === 'canceled') {
      return 'fc-event-canceled';
    }
    return 'fc-event-scheduled';
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Ficha de Controle</h1>

      <Card>
        <CardHeader>
          <CardTitle>Minha Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end space-x-4 mb-4">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full fc-event-scheduled mr-2"></div>
              <span>Agendada</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full fc-event-completed mr-2"></div>
              <span>Concluída</span>
            </div>
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            eventClassNames={getEventClassNames}
            height="auto"
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Horas-aula Ministradas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead>Horas Ministradas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taughtCourses.map((course) => (
                  <TableRow key={course.course.id}>
                    <TableCell>{course.course.title}</TableCell>
                    <TableCell>{course.hours_logged}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proventos Recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>R$ {payment.amount}</TableCell>
                    <TableCell>{payment.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FichaControle;
