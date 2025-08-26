
import { Profile } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Get all profiles
const getProfiles = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
      
    if (error) throw error;
    
    return data?.map(profile => ({
      id: profile.id,
      fullName: profile.name || '',
      bio: profile.bio || '',
      avatar: profile.avatar_url,
      jobTitle: profile.job_title || '',
      company: profile.company || '',
      location: profile.location || '',
      website: profile.website || '',
      cpf: profile.cpf || '',
      academicBackground: profile.academic_background || '',
      professionalExperience: profile.professional_experience || '',
      qualifications: profile.qualifications || {},
      teachingSpecialties: profile.teaching_specialties || [],
      createdAt: profile.created_at || '',
      updatedAt: profile.updated_at || '',
      social: {
        linkedin: '',
        twitter: '',
        github: ''
      }
    })) || [];
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
};

// Create a profile
const createProfile = async (profileData: { 
  userId: string, 
  fullName: string,
  bio?: string,
  jobTitle?: string,
  company?: string,
  location?: string,
  website?: string,
  cpf?: string,
  academicBackground?: string,
  professionalExperience?: string,
  qualifications?: Record<string, any>,
  teachingSpecialties?: string[]
}): Promise<Profile> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: profileData.userId,
        name: profileData.fullName,
        bio: profileData.bio,
        job_title: profileData.jobTitle,
        company: profileData.company,
        location: profileData.location,
        website: profileData.website,
        cpf: profileData.cpf,
        academic_background: profileData.academicBackground,
        professional_experience: profileData.professionalExperience,
        qualifications: profileData.qualifications,
        teaching_specialties: profileData.teachingSpecialties,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name || '',
      bio: data.bio || '',
      avatarUrl: data.avatar_url,
      jobTitle: data.job_title || '',
      company: data.company || '',
      location: data.location || '',
      website: data.website || '',
      cpf: data.cpf || '',
      academicBackground: data.academic_background || '',
      professionalExperience: data.professional_experience || '',
      qualifications: data.qualifications || {},
      teachingSpecialties: data.teaching_specialties || [],
      createdAt: data.created_at || '',
      updatedAt: data.updated_at || '',
      social: {
        linkedin: '',
        twitter: '',
        github: ''
      }
    };
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};

// Update a profile
const updateProfile = async (profileId: string, profileData: { 
  fullName?: string,
  bio?: string,
  jobTitle?: string,
  company?: string,
  location?: string,
  website?: string,
  cpf?: string,
  academicBackground?: string,
  professionalExperience?: string,
  qualifications?: Record<string, any>,
  teachingSpecialties?: string[]
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profileData.fullName,
        bio: profileData.bio,
        job_title: profileData.jobTitle,
        company: profileData.company,
        location: profileData.location,
        website: profileData.website,
        cpf: profileData.cpf,
        academic_background: profileData.academicBackground,
        professional_experience: profileData.professionalExperience,
        qualifications: profileData.qualifications,
        teaching_specialties: profileData.teachingSpecialties,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// Delete a profile
const deleteProfile = async (profileId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw error;
  }
};

export const profileService = {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile
};
