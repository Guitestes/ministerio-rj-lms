import { useState, useEffect } from 'react';
import { announcementService } from '@/services/announcementService';
import { courseService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Announcement, Course, Class } from '@/types';

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    courseService.getCourses().then(setCourses);
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      courseService.getClassesForCourse(selectedCourse).then(setClasses);
      fetchAnnouncements();
    } else {
      setClasses([]);
      setSelectedClass('all');
      setAnnouncements([]);
    }
  }, [selectedCourse]);

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedClass]);

  const fetchAnnouncements = async () => {
    if (!selectedCourse) return;
    setIsLoading(true);
    try {
      const data = selectedClass === 'all'
        ? await announcementService.getAnnouncementsForCourse(selectedCourse)
        : await announcementService.getAnnouncementsForClass(selectedClass);
      setAnnouncements(data);
    } catch (error) {
      toast.error('Failed to load announcements.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!selectedCourse || !newAnnouncement.title || !newAnnouncement.content || !user) {
      toast.error('Please select a course and fill in all fields.');
      return;
    }
    try {
      await announcementService.createAnnouncement({
        courseId: selectedCourse,
        classId: selectedClass !== 'all' ? selectedClass : undefined,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        createdBy: user.id,
      });
      setNewAnnouncement({ title: '', content: '' });
      fetchAnnouncements();
      toast.success('Announcement created.');
    } catch (error) {
      toast.error('Failed to create announcement.');
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementService.deleteAnnouncement(announcementId);
      fetchAnnouncements(); // Refresh the list
      toast.success('Announcement deleted.');
    } catch (error) {
      toast.error('Failed to delete announcement.');
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;
    try {
      await announcementService.updateAnnouncement(editingAnnouncement.id, {
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
      });
      setEditingAnnouncement(null);
      fetchAnnouncements();
      toast.success('Announcement updated.');
    } catch (error) {
      toast.error('Failed to update announcement.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Manage Announcements</h1>
      <Card>
        <CardHeader>
          <CardTitle>Create New Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select onValueChange={setSelectedCourse} value={selectedCourse}>
              <SelectTrigger><SelectValue placeholder="Select a Course" /></SelectTrigger>
              <SelectContent>
                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedClass} value={selectedClass} disabled={!selectedCourse}>
              <SelectTrigger><SelectValue placeholder="Select a Class (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Title"
            value={newAnnouncement.title}
            onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
          />
          <Textarea
            placeholder="Content"
            value={newAnnouncement.content}
            onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
          />
          <Button onClick={handleCreateAnnouncement}>Create</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Announcements</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : announcements.length === 0 ? (
            <p>No announcements found for the selected scope.</p>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Title</TableHead>
                    <TableHead className="w-[50%]">Content</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{a.content}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingAnnouncement(a)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteAnnouncement(a.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editingAnnouncement} onOpenChange={(isOpen) => !isOpen && setEditingAnnouncement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Title"
              value={editingAnnouncement?.title || ''}
              onChange={e => setEditingAnnouncement(prev => prev ? { ...prev, title: e.target.value } : null)}
            />
            <Textarea
              placeholder="Content"
              value={editingAnnouncement?.content || ''}
              onChange={e => setEditingAnnouncement(prev => prev ? { ...prev, content: e.target.value } : null)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateAnnouncement}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnnouncements;
