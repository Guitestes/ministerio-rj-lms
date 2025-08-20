import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '@/contexts/AuthContext';
import { calendarService } from '@/services/calendarService';
import { CalendarEvent } from '@/types/index';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEnrolledCourses } from '@/services/courses/enrollmentService';

const Calendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const [eventsData, coursesData] = await Promise.all([
            calendarService.getEventsForUser(user.id),
            getEnrolledCourses(user.id)
          ]);
          const formattedEvents = eventsData.map(event => ({
            id: event.id,
            title: event.title,
            start: event.startTime,
            end: event.endTime,
            extendedProps: {
              description: event.description,
              location: event.location,
              courseName: event.courseName,
              moduleName: event.moduleName,
              roomName: event.room?.name,
              courseId: event.courseId
            }
          }));
          setEvents(formattedEvents);
          setEnrolledCourses(coursesData);
        } catch (error) {
          toast.error('Failed to load calendar data.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  if (isLoading) return <p>Loading calendar...</p>;

  const filteredEvents = selectedCourse === 'all' 
    ? events 
    : events.filter(event => event.extendedProps.courseId === selectedCourse);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Calendar</h1>
      {enrolledCourses.length > 0 && (
        <div className="mb-4">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {enrolledCourses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="calendar-container p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={filteredEvents}
          eventClick={(info) => {
            const props = info.event.extendedProps as any;
            alert(
              `Event: ${info.event.title}\n` +
              `Course: ${props.courseName || 'N/A'}\n` +
              `Module: ${props.moduleName || 'N/A'}\n` +
              `Room: ${props.roomName || 'N/A'}\n` +
              `Description: ${props.description || 'N/A'}\n` +
              `Location: ${props.location || 'N/A'}`
            );
          }}
        />
      </div>
    </div>
  );
};

export default Calendar;
