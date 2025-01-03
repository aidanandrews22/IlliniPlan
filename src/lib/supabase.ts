import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import type { UserResource } from '@clerk/types';
import { searchCoursesHelper } from '../utils/search';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Courses
export async function getCourse(subject: string, number: string) {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_prereqs (*),
      course_geneds (*),
      course_offerings (
        *,
        terms (*),
        course_gpas (*)
      )
    `)
    .eq('subject', subject)
    .eq('number', number)
    .single();

  if (error) {
    console.error('Error fetching course:', error);
    return null;
  }

  return data;
}

export async function searchCourses(query: string, page = 1, limit = 50, subject?: string) {
  return searchCoursesHelper(query, page, limit, subject);
}

// Terms
export async function getTerms() {
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .order('year', { ascending: false })
    .order('season', { ascending: false });

  if (error) {
    console.error('Error fetching terms:', error);
    return [];
  }

  return data;
}

// Course Offerings
export async function getCourseOfferings(courseId: number) {
  const { data, error } = await supabase
    .from('course_offerings')
    .select(`
      *,
      terms (*),
      course_gpas (*)
    `)
    .eq('course_id', courseId);

  if (error) {
    console.error('Error fetching course offerings:', error);
    return [];
  }

  return data;
}

// Course GPAs
export const getCourseGPAs = async (courseId: number) => {
  const { data, error } = await supabase
    .from('course_gpas')
    .select('*')
    .eq('course_id', courseId)
    .order('term_id', { ascending: false });

  if (error) {
    console.error('Error fetching course GPAs:', error);
    return [];
  }

  return data || [];
};

// Course Prerequisites
export async function getCoursePrereqs(courseId: number) {
  const { data, error } = await supabase
    .from('course_prereqs')
    .select('*')
    .eq('course_id', courseId)
    .single();

  if (error) {
    console.error('Error fetching course prerequisites:', error);
    return null;
  }

  return data;
}

// Course Gen Eds
export async function getCourseGenEds(courseId: number) {
  const { data, error } = await supabase
    .from('course_geneds')
    .select('*')
    .eq('course_id', courseId)
    .single();

  if (error) {
    console.error('Error fetching course gen eds:', error);
    return null;
  }

  return data;
}

// Subjects
export async function getSubjects(query?: string) {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('subject', { ascending: true });
    
    if (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }

        return data || [];
    } catch (e) {
        console.error('Unexpected error in getSubjects:', e);
        return [];
    }
}

// Get User ID
export async function getUserId(user: UserResource) {
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    const userName = user?.fullName;
    try {
        const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user?.id)
        .single();

        if (error) {
            console.error('Error fetching user id:', error);
            return null;
        }   

        return data?.id;
    } catch (e) {
        console.error('Unexpected error in getUserId:', e);
        return null;
    }
}

// Get User Semesters
export async function getUserSemesters(userId: string) {
    try {
        const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', userId);
        if (error) {
        console.error('Error fetching user semesters:', error);
        return [];
    }
        return data;
    } catch (e) {
        console.error('Unexpected error in getUserSemesters:', e);
        return [];
    }
}

// User Management
export async function getOrCreateUser(user: UserResource) {
  if (!user) return null;

  const userEmail = user.emailAddresses[0]?.emailAddress;
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';

  try {
    // First try to get the existing user
    let { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', user.id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          clerk_id: user.id,
          email: userEmail || '',
          first_name: firstName,
          last_name: lastName
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return null;
      }

      return newUser;
    }

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return null;
    }

    return existingUser;
  } catch (e) {
    console.error('Unexpected error in getOrCreateUser:', e);
    return null;
  }
}

// Semester Plans Management
export async function getUserSemesterPlans(userId: number) {
  try {
    const { data, error } = await supabase
      .from('semester_plans')
      .select(`
        *,
        terms (*),
        semester_plan_courses (
          *,
          courses (
            *,
            course_geneds (*),
            course_prereqs (*),
            course_offerings (
              *,
              terms (*)
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('term_id', { ascending: true });

    if (error) {
      console.error('Error fetching user semester plans:', error);
      return [];
    }

    return data;
  } catch (e) {
    console.error('Unexpected error in getUserSemesterPlans:', e);
    return [];
  }
}

export async function addCourseToSemesterPlan(semesterPlanId: number, courseId: number) {
  try {
    const { data, error } = await supabase
      .from('semester_plan_courses')
      .insert([{
        semester_plan_id: semesterPlanId,
        course_id: courseId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding course to semester plan:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Unexpected error in addCourseToSemesterPlan:', e);
    return null;
  }
}

export async function removeCourseFromSemesterPlan(semesterPlanId: number, courseId: number) {
  try {
    const { error } = await supabase
      .from('semester_plan_courses')
      .delete()
      .eq('semester_plan_id', semesterPlanId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error removing course from semester plan:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Unexpected error in removeCourseFromSemesterPlan:', e);
    return false;
  }
}

// Season code to name mapping
const seasonNames: Record<string, string> = {
  'fa': 'Fall',
  'sp': 'Spring',
  'su': 'Summer',
  'wi': 'Winter'
};

// Get or create term
export async function getOrCreateTerm(year: number, season: 'fa' | 'sp' | 'su' | 'wi') {
  try {
    // First try to get existing term
    const { data: existingTerm, error: fetchError } = await supabase
      .from('terms')
      .select('id')
      .eq('year', year)
      .eq('season', season)
      .single();

    if (!fetchError && existingTerm) {
      return existingTerm.id;
    }

    // If term doesn't exist, create it
    const combined = `${year}-${season}`;
    const { data: newTerm, error: insertError } = await supabase
      .from('terms')
      .insert([{
        year,
        season,
        combined
      }])
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating term:', insertError);
      return null;
    }

    return newTerm.id;
  } catch (e) {
    console.error('Unexpected error in getOrCreateTerm:', e);
    return null;
  }
}

// Initialize User Semester Plans
export async function initializeUserSemesterPlans(userId: number) {
  try {
    // Get term IDs for Fall 2024 and Spring 2025
    const [fall2024Id, spring2025Id] = await Promise.all([
      getOrCreateTerm(2024, 'fa'),
      getOrCreateTerm(2025, 'sp')
    ]);

    if (!fall2024Id || !spring2025Id) {
      console.error('Could not find or create term IDs');
      return false;
    }

    // Check if user already has semester plans
    const { data: existingPlans, error: checkError } = await supabase
      .from('semester_plans')
      .select('id')
      .eq('user_id', userId);

    if (checkError) {
      console.error('Error checking existing plans:', checkError);
      return false;
    }

    // If user already has plans, don't initialize
    if (existingPlans && existingPlans.length > 0) {
      return true;
    }

    // Create semester plans for Fall 2024 and Spring 2025
    const { error: insertError } = await supabase
      .from('semester_plans')
      .insert([
        {
          user_id: userId,
          term_id: fall2024Id,
          plan_name: `${seasonNames['fa']} 2024`
        },
        {
          user_id: userId,
          term_id: spring2025Id,
          plan_name: `${seasonNames['sp']} 2025`
        }
      ]);

    if (insertError) {
      console.error('Error creating semester plans:', insertError);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Unexpected error in initializeUserSemesterPlans:', e);
    return false;
  }
}

// Create semester plan with dynamic term creation
export async function createSemesterPlan(userId: number, year: number, season: 'fa' | 'sp' | 'su' | 'wi') {
  try {
    // Get or create the term
    const termId = await getOrCreateTerm(year, season);
    if (!termId) {
      console.error('Failed to get or create term');
      return null;
    }

    const planName = `${seasonNames[season]} ${year}`;
    const { data, error } = await supabase
      .from('semester_plans')
      .insert([{
        user_id: userId,
        term_id: termId,
        plan_name: planName
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating semester plan:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Unexpected error in createSemesterPlan:', e);
    return null;
  }
}

// Helper function to parse semester ID into year and season
export function parseSemesterId(semesterId: string): { year: number; season: 'fa' | 'sp' | 'su' | 'wi' } | null {
  try {
    const seasonMap: Record<string, 'fa' | 'sp' | 'su' | 'wi'> = {
      'FALL': 'fa',
      'FA': 'fa',
      'SPRING': 'sp',
      'SP': 'sp',
      'SUMMER': 'su',
      'SU': 'su',
      'WINTER': 'wi',
      'WI': 'wi'
    };

    // Extract year and season from format like "FALL2024" or "FA2024"
    const match = semesterId.match(/^([A-Z]+)(\d{4})$/);
    if (!match) return null;

    const [, season, yearStr] = match;
    const year = parseInt(yearStr);
    const seasonCode = seasonMap[season];

    if (!seasonCode || isNaN(year)) return null;

    return { year, season: seasonCode };
  } catch (e) {
    console.error('Error parsing semester ID:', e);
    return null;
  }
}

export async function deleteSemesterPlan(semesterPlanId: number) {
  try {
    // First delete all courses in the plan
    await supabase
      .from('semester_plan_courses')
      .delete()
      .eq('semester_plan_id', semesterPlanId);

    // Then delete the plan itself
    const { error } = await supabase
      .from('semester_plans')
      .delete()
      .eq('id', semesterPlanId);

    if (error) {
      console.error('Error deleting semester plan:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Unexpected error in deleteSemesterPlan:', e);
    return false;
  }
}

// Get Term ID
export async function getTermId(year: number, season: 'fa' | 'sp' | 'su' | 'wi') {
  try {
    const { data, error } = await supabase
      .from('terms')
      .select('id')
      .eq('year', year)
      .eq('season', season)
      .single();

    if (error) {
      console.error('Error fetching term:', error);
      return null;
    }

    return data.id;
  } catch (e) {
    console.error('Unexpected error in getTermId:', e);
    return null;
  }
}

// Get semester plan
export async function getSemesterPlan(userId: number, year: number, season: 'fa' | 'sp' | 'su' | 'wi') {
  try {
    const termId = await getTermId(year, season);
    if (!termId) return null;

    const { data, error } = await supabase
      .from('semester_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('term_id', termId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching semester plan:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Unexpected error in getSemesterPlan:', e);
    return null;
  }
}

// Get or create semester plan
export async function getOrCreateSemesterPlan(userId: number, year: number, season: 'fa' | 'sp' | 'su' | 'wi') {
  try {
    // Get the term ID first
    const termId = await getTermId(year, season);
    if (!termId) {
      console.error('Could not get/create term');
      return null;
    }

    // Check for existing plan with this user_id and term_id
    const { data: existingPlan, error: fetchError } = await supabase
      .from('semester_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('term_id', termId)
      .single();

    if (!fetchError && existingPlan) {
      return existingPlan;
    }

    // If plan doesn't exist, create it
    const planName = `${seasonNames[season]} ${year}`;
    const { data: newPlan, error: createError } = await supabase
      .from('semester_plans')
      .insert([{
        user_id: userId,
        term_id: termId,
        plan_name: planName
      }])
      .select()
      .single();

    if (createError) {
      // Check if error is due to unique constraint violation
      if (createError.code === '23505') { // PostgreSQL unique violation code
        // Try to fetch the existing plan one more time
        const { data: retryPlan, error: retryError } = await supabase
          .from('semester_plans')
          .select('*')
          .eq('user_id', userId)
          .eq('term_id', termId)
          .single();

        if (!retryError && retryPlan) {
          return retryPlan;
        }
      }
      console.error('Error creating semester plan:', createError);
      return null;
    }

    return newPlan;
  } catch (e) {
    console.error('Unexpected error in getOrCreateSemesterPlan:', e);
    return null;
  }
}

// Move course between semester plans
export async function moveCourseInSemesterPlan(sourceSemesterPlanId: number, destinationSemesterPlanId: number, courseId: number) {
  try {
    const { data, error } = await supabase
      .from('semester_plan_courses')
      .update({ 
        semester_plan_id: destinationSemesterPlanId,
        updated_at: new Date().toISOString()
      })
      .eq('semester_plan_id', sourceSemesterPlanId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Error moving course between semester plans:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Unexpected error in moveCourseInSemesterPlan:', e);
    return null;
  }
}

// Update semester plan completion status
export async function updateSemesterPlanCompletion(semesterPlanId: number, complete: boolean) {
  try {
    const { data, error } = await supabase
      .from('semester_plans')
      .update({ 
        complete,
        updated_at: new Date().toISOString()
      })
      .eq('id', semesterPlanId)
      .select()
      .single();

    if (error) {
      console.error('Error updating semester plan completion:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Unexpected error in updateSemesterPlanCompletion:', e);
    return null;
  }
}

// User Preferences Management
export async function updateUserPreferences(userId: number, preferences: any) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Unexpected error in updateUserPreferences:', e);
    return null;
  }
}

export async function getUserPreferences(userId: number) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data?.preferences;
  } catch (e) {
    console.error('Unexpected error in getUserPreferences:', e);
    return null;
  }
}