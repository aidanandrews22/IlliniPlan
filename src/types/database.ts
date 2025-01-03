import type { Database } from './supabase';

export type CourseData = Database['public']['Tables']['courses']['Row'] & {
  course_geneds: Database['public']['Tables']['course_geneds']['Row'] | null;
  course_prereqs: Database['public']['Tables']['course_prereqs']['Row'] | null;
  course_offerings: (Database['public']['Tables']['course_offerings']['Row'] & {
    terms: Database['public']['Tables']['terms']['Row'];
    course_gpas: Database['public']['Tables']['course_gpas']['Row'][];
  })[];
  course_gpas: Database['public']['Tables']['course_gpas']['Row'][];
};

export interface DisplayCourse {
  id: string;
  subject: string;
  number: string;
  name: string;
  description: string;
  creditHours: string;
  degreeAttributes?: string;
  scheduleInformation?: string;
  sectionInfo?: string;
  terms: string[];
  yearTerms: string[];
  years: string[];
}

export interface Semester {
  id: string;
  name: string;
  completed: boolean;
  coursecards: DisplayCourse[];
}

export interface SemestersData {
  [key: string]: Semester;
}

export interface UserData {
  uid: string;
  username: string;
  completedCourses: DisplayCourse[];
  semesters: Semester[];
  degree: {
    program: string;
    startYear: number;
    anticipatedGraduation: number;
  };
}

export interface PrereqLogic {
  and?: (PrereqLogic | string)[];
  or?: (PrereqLogic | string)[];
}

export interface CourseRelationships {
  prerequisites: string[];  // Courses that are prerequisites for this course
  postrequisites: string[]; // Courses that this course is a prerequisite for
  corequisites: string[];  // Courses that must be taken concurrently
}

export interface CourseHighlightState {
  isPrereq: boolean;      // This course is a prerequisite for the hovered course
  isPostreq: boolean;     // This course has the hovered course as a prerequisite
  isCoreq: boolean;       // This course is a corequisite with the hovered course
} 