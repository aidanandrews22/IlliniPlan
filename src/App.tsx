import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Plan from './pages/Plan';
import Explore from './pages/Explore';
import Navigation from './components/Navigation';
import type { CourseData, DisplayCourse, SemestersData } from './types/database';
import type { Database } from './types/supabase';
import { useUser } from '@clerk/clerk-react';
import { 
  getOrCreateUser, 
  getUserSemesterPlans, 
  addCourseToSemesterPlan,
  initializeUserSemesterPlans,
  createSemesterPlan,
  parseSemesterId
} from './lib/supabase';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Settings from './pages/Settings';
import { supabase } from './lib/supabase';

// Add interfaces for storing IDs
interface SemesterIds {
  [key: string]: {
    planId: number;
    termId: number;
  };
}

interface CourseIds {
  [key: string]: number; // Maps course display ID to database ID
}

type CourseOffering = Database['public']['Tables']['course_offerings']['Row'] & {
  terms: Database['public']['Tables']['terms']['Row'];
};

type SemesterPlanCourse = Database['public']['Tables']['semester_plan_courses']['Row'] & {
  courses: Database['public']['Tables']['courses']['Row'] & {
    course_offerings?: CourseOffering[];
  };
};

type SemesterPlan = Database['public']['Tables']['semester_plans']['Row'] & {
  terms: Database['public']['Tables']['terms']['Row'];
  semester_plan_courses: SemesterPlanCourse[];
};

interface PrereqData {
  courseId: number;
  prereqLogic: any;
}

interface PrereqRow {
  course_id: number;
  prereq_logic: any;
}

const App = () => {
  const { user } = useUser();
  const [semestersData, setSemestersData] = useState<SemestersData>({});
  const [loading, setLoading] = useState(true);
  const [loading_semesters, setLoadingSemesters] = useState(true);
  // Add new state for storing IDs
  const [userId, setUserId] = useState<number | null>(null);
  const [semesterIds, setSemesterIds] = useState<SemesterIds>({});
  const [courseIds, setCourseIds] = useState<CourseIds>({});
  const [coursePrereqs, setCoursePrereqs] = useState<PrereqData[]>([]);

  useEffect(() => {
    const initializeUser = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const dbUser = await getOrCreateUser(user);
        if (!dbUser) {
          console.error('Failed to get or create user');
          setLoading(false);
          return;
        }

        setUserId(dbUser.id);

        // Initialize semester plans for new users
        await initializeUserSemesterPlans(dbUser.id);

        const semesterPlans = await getUserSemesterPlans(dbUser.id);
        
        // Store semester and course IDs
        const newSemesterIds: SemesterIds = {};
        const newCourseIds: CourseIds = {};
        
        // Convert semester plans to the format expected by the app
        const formattedSemesters: SemestersData = {};
        semesterPlans.forEach((plan: SemesterPlan) => {
          const termInfo = plan.terms;
          const key = `${termInfo.season.toUpperCase()}${termInfo.year}`;
          
          // Store semester IDs
          newSemesterIds[key] = {
            planId: plan.id,
            termId: plan.term_id
          };
          
          formattedSemesters[key] = {
            id: key,
            name: `${termInfo.season.charAt(0).toUpperCase() + termInfo.season.slice(1)} ${termInfo.year}`,
            completed: plan.complete || false,
            coursecards: plan.semester_plan_courses.map((planCourse: SemesterPlanCourse) => {
              const course = planCourse.courses;
              const courseDisplayId = `${course.subject}${course.number}_${planCourse.id}`;
              
              // Store course IDs
              newCourseIds[courseDisplayId] = course.id;
              return {
                id: courseDisplayId,
                subject: course.subject,
                number: course.number,
                name: course.title || '',
                description: course.description || '',
                creditHours: course.credit_hours || '',
                degreeAttributes: course.degree_attributes || '',
                terms: course.course_offerings?.map(o => {
                  const seasonName = {
                    'fa': 'Fa',
                    'sp': 'Sp',
                    'su': 'Su',
                    'wi': 'Wi'
                  }[o.terms.season] || o.terms.season.toUpperCase();
                  return `${seasonName} ${o.terms.year}`;
                }) || [],
                yearTerms: course.course_offerings?.map((o: CourseOffering) => `${o.terms.year}-${o.terms.season}`) || [],
                years: course.course_offerings?.map((o: CourseOffering) => o.terms.year.toString()) || []
              };
            })
          };
        });

        setSemesterIds(newSemesterIds);
        setCourseIds(newCourseIds);
        setSemestersData(formattedSemesters);
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setLoading(false);
        setLoadingSemesters(false);
      }
    };

    initializeUser();
  }, [user]);

  useEffect(() => {
    const fetchPrereqs = async () => {
      if (!user) return;

      try {
        // Get all course IDs from the courseIds mapping
        const courseIdList = Object.values(courseIds);
        if (courseIdList.length === 0) return;

        const { data: prereqData, error } = await supabase
          .from('course_prereqs')
          .select('course_id, prereq_logic')
          .in('course_id', courseIdList);

        if (error) {
          console.error('Error fetching prerequisites:', error);
          return;
        }

        setCoursePrereqs(
          (prereqData as PrereqRow[]).map(row => ({
            courseId: row.course_id,
            prereqLogic: row.prereq_logic
          }))
        );
      } catch (error) {
        console.error('Error in fetchPrereqs:', error);
      }
    };

    fetchPrereqs();
  }, [user, courseIds]);

  const handleAddToSemester = async (course: CourseData, semesterId: string) => {
    if (!user) return;

    // Generate a unique ID for the course display
    const newCourseId = `${course.subject}${course.number}_${Date.now()}`;
    
    // Update the courseIds mapping immediately
    setCourseIds(prev => ({
      ...prev,
      [newCourseId]: course.id
    }));

    setSemestersData(prev => {
      const semester = prev[semesterId];
      
      // Convert course data to the format expected by the semester
      const newCourse: DisplayCourse = {
        id: newCourseId,
        subject: course.subject || '',
        number: course.number || '',
        name: course.title || '',
        description: course.description || '',
        creditHours: course.credit_hours || '',
        degreeAttributes: course.degree_attributes || '',
        terms: course.course_offerings?.map(o => {
          const seasonName = {
            'fa': 'Fall',
            'sp': 'Spring',
            'su': 'Summer',
            'wi': 'Winter'
          }[o.terms.season] || o.terms.season.toUpperCase();
          return `${seasonName} ${o.terms.year}`;
        }) || [],
        yearTerms: course.course_offerings?.map(o => `${o.terms.year}-${o.terms.season}`) || [],
        years: course.course_offerings?.map(o => o.terms.year.toString()) || []
      };

      return {
        ...prev,
        [semesterId]: {
          ...semester,
          coursecards: [...semester.coursecards, newCourse]
        }
      };
    });

    try {
      // Add the course to the database
      const dbUser = await getOrCreateUser(user);
      if (!dbUser) return;

      // Parse the semester ID to get year and season
      const semesterInfo = parseSemesterId(semesterId);
      if (!semesterInfo) {
        console.error('Invalid semester ID format:', semesterId);
        return;
      }

      // Find or create the semester plan
      let semesterPlan = (await getUserSemesterPlans(dbUser.id))
        .find(p => {
          const termInfo = p.terms;
          const key = `${termInfo.season.toUpperCase()}${termInfo.year}`;
          return key === semesterId;
        });

      if (!semesterPlan) {
        // Create new semester plan if it doesn't exist
        semesterPlan = await createSemesterPlan(dbUser.id, semesterInfo.year, semesterInfo.season);
        if (!semesterPlan) {
          console.error('Failed to create semester plan');
          return;
        }
      }

      // Add the course to the semester plan
      await addCourseToSemesterPlan(semesterPlan.id, course.id);
    } catch (error) {
      console.error('Error adding course to semester:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading your IlliniPlan...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <SignedIn>
          <Navigation />
          <main className="container mx-auto px-4 py-8 pt-20">
            <Routes>
              <Route 
                path="/"
                element={
                  <Plan 
                    semestersData={semestersData} 
                    setSemestersData={setSemestersData}
                    userId={userId}
                    semesterIds={semesterIds}
                    courseIds={courseIds}
                    setCourseIds={setCourseIds}
                    onAddToSemester={handleAddToSemester}
                    isLoading={loading_semesters}
                    coursePrereqs={coursePrereqs}
                  />
                } 
              />
              <Route 
                path="/explore" 
                element={
                  <Explore 
                    semesters={Object.values(semestersData).map(({ id, name }) => ({ id, name }))}
                    onAddToSemester={handleAddToSemester}
                  />
                } 
              />
              <Route 
                path="/settings"
                element={<Settings />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </SignedIn>
        <SignedOut>
          <Routes>
          <Route path="/" element={<SignIn />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/sign-in" replace />} />
          </Routes>
        </SignedOut>
      </div> 
    </Router>
  );
};

export default App;
