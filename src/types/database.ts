import type { Database } from './supabase';

export interface Course {
  id: string;
  subject: string;
  number: string;
  title: string;
  description: string;
  prerequisites?: string;
  creditHours: number;
}

export interface Semester {
  id: string;
  term: 'Fall' | 'Spring' | 'Summer';
  year: number;
  courses: Course[];
}

export interface UserData {
  uid: string;
  username: string;
  completedCourses: Course[];
  semesters: Semester[];
  degree: {
    program: string;
    startYear: number;
    anticipatedGraduation: number;
  };
}

export type CourseData = Database['public']['Tables']['courses']['Row'] & {
  course_geneds: Database['public']['Tables']['course_geneds']['Row'] | null;
  course_prereqs: Database['public']['Tables']['course_prereqs']['Row'] | null;
  course_offerings: (Database['public']['Tables']['course_offerings']['Row'] & {
    terms: Database['public']['Tables']['terms']['Row'];
    course_gpas: Database['public']['Tables']['course_gpas']['Row'][];
  })[];
}; 