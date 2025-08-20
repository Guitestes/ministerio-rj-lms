import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { calendarService } from '@/services/calendarService';
import { CalendarEvent } from '@/types';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roomService } from '@/services/roomService';
import { courseService } from '@/services/courseService';
import { moduleService } from '@/services/moduleService';
import { classService } from '@/services/classService';

const ClassEventManager = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    if (classId) {
      calendarService.getEventsForClass(classId).then(data => {
        setEvents(data.map(e => ({ 
          id: e.id, 
          title: e.title, 
          start: e.startTime, 
          end: e.endTime,
          extendedProps: {
            description: e.description,
            location: e.location,
            courseName: e.courseName,
            moduleName: e.moduleName,
            roomName: e.room?.name
          }
        })));
      }).catch(() => {
        toast.error('Failed to load events');
      });
    }
  }, [classId]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedEvent({ 
      startTime: selectInfo.startStr, 
      endTime: selectInfo.endStr,
      classId: classId
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    // Find the full event data from our state
    calendarService.getEventsForClass(classId!).then(data => {
      const fullEvent = data.find(e => e.id === clickInfo.event.id);
      if (fullEvent) {
        setSelectedEvent(fullEvent);
        setIsModalOpen(true);
      }
    });
  };

  const handleSaveEvent = async () => {
    if (selectedEvent && classId) {
      try {
        // Validate required fields
        if (!selectedEvent.title?.trim()) {
          toast.error('Title is required');
          return;
        }

        // Check room availability if room is selected
        if (selectedEvent.roomId && selectedEvent.startTime && selectedEvent.endTime) {
          const isAvailable = await roomService.checkRoomAvailability(
            selectedEvent.roomId,
            selectedEvent.startTime,
            selectedEvent.endTime,
            selectedEvent.id
          );
          
          if (!isAvailable) {
            toast.error('Room is not available at the selected time');
            return;
          }
        }

        if (selectedEvent.id) {
          await calendarService.updateEvent(selectedEvent.id, selectedEvent);
          toast.success('Event updated successfully');
        } else {
          await calendarService.createEvent({ ...selectedEvent, classId } as CalendarEvent);
          toast.success('Event created successfully');
        }
        
        setIsModalOpen(false);
        setSelectedEvent(null);
        
        // Refetch events
        const data = await calendarService.getEventsForClass(classId);
        setEvents(data.map(e => ({ 
          id: e.id, 
          title: e.title, 
          start: e.startTime, 
          end: e.endTime,
          extendedProps: {
            description: e.description,
            location: e.location,
            courseName: e.courseName,
            moduleName: e.moduleName,
            roomName: e.room?.name
          }
        })));
      } catch (error) {
        console.error('Error saving event:', error);
        toast.error('Failed to save event');
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent?.id) {
      try {
        await calendarService.deleteEvent(selectedEvent.id);
        toast.success('Event deleted successfully');
        setIsModalOpen(false);
        setSelectedEvent(null);
        
        // Refetch events
        const data = await calendarService.getEventsForClass(classId!);
        setEvents(data.map(e => ({ 
          id: e.id, 
          title: e.title, 
          start: e.startTime, 
          end: e.endTime,
          extendedProps: {
            description: e.description,
            location: e.location,
            courseName: e.courseName,
            moduleName: e.moduleName,
            roomName: e.room?.name
          }
        })));
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      }
    }
  };

  useEffect(() => {
    // Load rooms for selection
    roomService.getAllRooms().then(setRooms).catch(() => {
      console.error('Failed to load rooms');
      setRooms([]);
    });

    // Load the class and its course to narrow module selection
    if (classId) {
      (async () => {
        try {
          const cls = await classService.getClassById(classId);
          if (cls?.courseId) {
            // Get course details
            const course = await courseService.getCourseById(cls.courseId);
            if (course) {
              setCourses([{ id: course.id, title: course.title }]);
              // Get modules for this course
              const mods = await moduleService.getModulesByCourseId(cls.courseId);
              setModules(mods.map(m => ({ id: m.id, title: m.title })));
            }
          } else {
            // Fallback: list all approved courses
            const coursesList = await courseService.getCourses();
            setCourses(coursesList.map(c => ({ id: c.id, title: c.title })));
          }
        } catch (e) {
          console.error('Error loading course data:', e);
          // Fallback: list all approved courses
          try {
            const coursesList = await courseService.getCourses();
            setCourses(coursesList.map(c => ({ id: c.id, title: c.title })));
          } catch (fallbackError) {
            console.error('Failed to load courses:', fallbackError);
            setCourses([]);
          }
        }
      })();
    }
  }, [classId]);

  useEffect(() => {
    if (selectedEvent?.courseId) {
      moduleService.getModulesByCourseId(selectedEvent.courseId as string)
        .then(mods => setModules(mods.map(m => ({ id: m.id, title: m.title }))))
        .catch(() => {
          console.error('Failed to load modules');
          setModules([]);
        });
    }
  }, [selectedEvent?.courseId]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Manage Class Events</h1>
        <Button onClick={() => navigate(-1)} variant="outline">
          Back to Classes
        </Button>
      </div>

      <div className="calendar-container p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.id ? 'Edit Event' : 'New Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
             {/* Title */}
             <div>
               <label className="text-sm font-medium text-gray-700">Title *</label>
               <Input
                 placeholder="Event title"
                 value={selectedEvent?.title || ''}
                 onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                 className="mt-1"
               />
             </div>

             {/* Description */}
             <div>
               <label className="text-sm font-medium text-gray-700">Description</label>
               <Textarea
                 placeholder="Event description"
                 value={selectedEvent?.description || ''}
                 onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                 className="mt-1"
                 rows={3}
               />
             </div>

             {/* Course */}
             <div>
               <label className="text-sm font-medium text-gray-700">Course</label>
               <Select
                 value={selectedEvent?.courseId || ''}
                 onValueChange={(value) => setSelectedEvent({ ...selectedEvent, courseId: value, moduleId: undefined })}
               >
                 <SelectTrigger className="w-full mt-1">
                   <SelectValue placeholder="Select a course" />
                 </SelectTrigger>
                 <SelectContent>
                   {courses.map((c) => (
                     <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             {/* Module (Discipline) */}
             <div>
               <label className="text-sm font-medium text-gray-700">Module</label>
               <Select
                 value={selectedEvent?.moduleId || ''}
                 onValueChange={(value) => setSelectedEvent({ ...selectedEvent, moduleId: value })}
                 disabled={!selectedEvent?.courseId}
               >
                 <SelectTrigger className="w-full mt-1">
                   <SelectValue placeholder="Select a module" />
                 </SelectTrigger>
                 <SelectContent>
                   {modules.map((m) => (
                     <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             {/* Room */}
             <div>
               <label className="text-sm font-medium text-gray-700">Room</label>
               <Select
                 value={selectedEvent?.roomId || ''}
                 onValueChange={(value) => setSelectedEvent({ ...selectedEvent, roomId: value })}
               >
                 <SelectTrigger className="w-full mt-1">
                   <SelectValue placeholder="Select a room" />
                 </SelectTrigger>
                 <SelectContent>
                   {rooms.map((r) => (
                     <SelectItem key={r.id} value={r.id}>
                       {r.name} {r.location ? `- ${r.location}` : ''}
                       {r.capacity ? ` (${r.capacity} seats)` : ''}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             {/* Location */}
             <div>
               <label className="text-sm font-medium text-gray-700">Additional Location Info</label>
               <Input
                 placeholder="Additional location details (optional)"
                 value={selectedEvent?.location || ''}
                 onChange={(e) => setSelectedEvent({ ...selectedEvent, location: e.target.value })}
                 className="mt-1"
               />
             </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <label className="text-sm font-medium text-gray-700">Start Time</label>
                <Input
                  type="datetime-local"
                  value={selectedEvent?.startTime ? new Date(selectedEvent.startTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, startTime: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="text-sm font-medium text-gray-700">End Time</label>
                <Input
                  type="datetime-local"
                  value={selectedEvent?.endTime ? new Date(selectedEvent.endTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, endTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
           </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
            {selectedEvent?.id && (
              <Button onClick={handleDeleteEvent} variant="destructive">
                Delete
              </Button>
            )}
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveEvent}>
              {selectedEvent?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassEventManager;
