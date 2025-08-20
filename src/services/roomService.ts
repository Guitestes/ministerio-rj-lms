import { supabase } from '@/integrations/supabase/client';

export interface Room {
  id: string;
  name: string;
  location?: string;
  capacity?: number;
  description?: string;
  createdAt: string;
}

export interface CreateRoomData {
  name: string;
  location?: string;
  capacity?: number;
  description?: string;
}

export interface UpdateRoomData {
  name?: string;
  location?: string;
  capacity?: number;
  description?: string;
}

export const roomService = {
  // Get all rooms
  async getAllRooms(): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map((room: any) => ({
        id: room.id,
        name: room.name,
        location: room.location || undefined,
        capacity: room.capacity || undefined,
        description: room.description || undefined,
        createdAt: room.created_at,
      }));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw new Error('Failed to fetch rooms');
    }
  },

  // Get a room by ID
  async getRoomById(roomId: string): Promise<Room | null> {
    if (!roomId) return null;
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        location: data.location || undefined,
        capacity: data.capacity || undefined,
        description: data.description || undefined,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error fetching room by ID:', error);
      throw new Error('Failed to fetch room');
    }
  },

  // Create a new room
  async createRoom(roomData: CreateRoomData): Promise<Room> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: roomData.name,
          location: roomData.location || null,
          capacity: roomData.capacity || null,
          description: roomData.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        location: data.location || undefined,
        capacity: data.capacity || undefined,
        description: data.description || undefined,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error('Failed to create room');
    }
  },

  // Update an existing room
  async updateRoom(roomId: string, roomData: UpdateRoomData): Promise<Room> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (roomData.name !== undefined) updateData.name = roomData.name;
      if (roomData.location !== undefined) updateData.location = roomData.location || null;
      if (roomData.capacity !== undefined) updateData.capacity = roomData.capacity || null;
      if (roomData.description !== undefined) updateData.description = roomData.description || null;

      const { data, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        location: data.location || undefined,
        capacity: data.capacity || undefined,
        description: data.description || undefined,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error updating room:', error);
      throw new Error('Failed to update room');
    }
  },

  // Delete a room
  async deleteRoom(roomId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting room:', error);
      throw new Error('Failed to delete room');
    }
  },

  // Check room availability for a time slot
  async checkRoomAvailability(roomId: string, startTime: string, endTime: string, excludeEventId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('calendar_events')
        .select('id')
        .eq('room_id', roomId)
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (excludeEventId) {
        query = query.neq('id', excludeEventId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking room availability:', error);
      throw new Error('Failed to check room availability');
    }
  },

  // Get room schedule for a specific date range
  async getRoomSchedule(roomId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          classes(name, courses(title))
        `)
        .eq('room_id', roomId)
        .gte('start_time', startDate)
        .lte('end_time', endDate)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching room schedule:', error);
      throw new Error('Failed to fetch room schedule');
    }
  },
};