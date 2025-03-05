import { useState, useEffect } from 'react';
import type { Semester, DisplayCourse } from '../types/database';
import { 
  addCourseToDegreeRequirement, 
  getUserDegreeRequirementCourses, 
  removeUserDegreeRequirementCourse,
  getSelectedDegree
} from '../lib/supabase';
import { useUser } from '@clerk/clerk-react';

// Define the degree requirement interface
interface DegreeRequirement {
  id: string;
  name: string;
  description: string;
  totalHours: number;
  completedHours: number;
  courses: DisplayCourse[];
  userCourses?: UserDegreeCourse[];
}

// Define interfaces matching the structure in the JSON files
interface DegreeJsonCourse {
  subject: string;
  number: string;
  name: string;
  creditHours: string;
}

interface FocusArea {
  name: string;
  description: string;
  courses: DegreeJsonCourse[];
}

interface DegreeJsonRequirement {
  id: string;
  name: string;
  description: string;
  totalHours: number;
  completedHours: number;
  courses: DegreeJsonCourse[];
  focusAreas?: FocusArea[];
}

interface DegreeJson {
  DegreeRequirements: DegreeJsonRequirement[];
}

interface GraduationRequirementsVisualizerProps {
  semesters: Semester[];
  selectedDegree?: string;
  courseIds: { [key: string]: number };
}

// Available degree JSON files
const AVAILABLE_DEGREES = {
  "Computer Science": "computer-science.json",
  "Physics": "physics.json"
};

// New interface for user's degree courses
interface UserDegreeCourse {
  id: number;
  clerk_id: string;
  course_id: number;
  requirement: number;
  degree: string;
  course_title: string;
  courses: {
    id: number;
    subject: string;
    number: string;
    title: string | null;
    credit_hours: string | null;
  };
}

// Helper function to extract credit hours from a string value safely
const extractCreditHours = (creditHoursString: string | null): number => {
  if (!creditHoursString) return 0;
  
  // Handle credit hour ranges (e.g., "3 to 4") by taking the lower value
  if (creditHoursString.includes("to")) {
    const match = creditHoursString.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 0;
  }
  
  // Handle single values
  const match = creditHoursString.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[0]) : 0;
}

const GraduationRequirementsVisualizer = ({ 
  semesters, 
  courseIds,
  selectedDegree: propSelectedDegree
}: GraduationRequirementsVisualizerProps) => {
  const [expandedRequirement, setExpandedRequirement] = useState<string | null>(null);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState<boolean>(false);
  const [selectedRequirement, setSelectedRequirement] = useState<DegreeRequirement | null>(null);
  const [requirementsData, setRequirementsData] = useState<DegreeRequirement[]>([]);
  const [userDegreeCourses, setUserDegreeCourses] = useState<UserDegreeCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useUser();
  const [selectedDegree, setSelectedDegree] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Load user's degree courses
  useEffect(() => {
    const loadUserDegreeCourses = async () => {
      if (!user) return;
      
      try {
        console.log("Loading user degree courses for:", user.id);
        const userCourses = await getUserDegreeRequirementCourses(user.id);
        console.log("Loaded user degree courses:", userCourses);
        setUserDegreeCourses(userCourses);
      } catch (error) {
        console.error('Error loading user degree courses:', error);
      }
    };
    const loadSelectedDegree = async () => {
      if (user) {
        // First check if selectedDegree was passed as a prop
        if (propSelectedDegree) {
          setSelectedDegree(propSelectedDegree);
        } else {
          // Fall back to fetching from database
          setSelectedDegree(await getSelectedDegree(user.id));
        }
      }
    };
    
    loadUserDegreeCourses();
    loadSelectedDegree();
  }, [user, propSelectedDegree]);
  
  // Check if we should render the component
  useEffect(() => {
    setShouldRender(!!selectedDegree);
  }, [selectedDegree]);
  
  // Load degree requirements from JSON
  useEffect(() => {
    if (!selectedDegree) return;
    
    const loadDegreeRequirements = async () => {
      try {
        console.log("Loading degree requirements for:", selectedDegree);
        
        // Use a safe default if selectedDegree is null or undefined
        const degreeName = selectedDegree || "Computer Science";
        
        // Get the correct filename from our mapping, or default to computer science
        let degreeFileName;
        
        // First try to find an exact match
        if (degreeName in AVAILABLE_DEGREES) {
          degreeFileName = AVAILABLE_DEGREES[degreeName as keyof typeof AVAILABLE_DEGREES];
        } else {
          // Try to find a partial match
          const matchingKey = Object.keys(AVAILABLE_DEGREES).find(
            key => degreeName.includes(key)
          );
          
          if (matchingKey) {
            degreeFileName = AVAILABLE_DEGREES[matchingKey as keyof typeof AVAILABLE_DEGREES];
          } else {
            // Default to computer science if no match found
            degreeFileName = AVAILABLE_DEGREES["Computer Science"];
          }
        }
        
        console.log("Using degree file:", degreeFileName);
        
        // Import the JSON file using the determined filename
        const degreeModule = await import(`../assets/degree/${degreeFileName}`);
        const degreeData: DegreeJson = degreeModule.default;
        
        if (!degreeData || !degreeData.DegreeRequirements) {
          console.error('Invalid degree data format');
          setLoadingError('Invalid degree data format');
          setRequirementsData([]);
          return;
        }
        
        // Convert the JSON data to our DegreeRequirement format
        const formattedRequirements: DegreeRequirement[] = degreeData.DegreeRequirements.map(req => {
          // Convert JSON courses to DisplayCourse format
          const displayCourses: DisplayCourse[] = req.courses.map((course, index) => ({
            id: `${course.subject}-${course.number}-${index}`,
            subject: course.subject,
            number: course.number,
            name: course.name,
            description: '',
            creditHours: course.creditHours,
            terms: [],
            yearTerms: [],
            years: []
          }));
          
          // Add focus area courses if they exist
          if (req.focusAreas && req.focusAreas.length > 0) {
            req.focusAreas.forEach(area => {
              area.courses.forEach((course, index) => {
                displayCourses.push({
                  id: `${area.name}-${course.subject}-${course.number}-${index}`,
                  subject: course.subject,
                  number: course.number,
                  name: course.name,
                  description: '',
                  creditHours: course.creditHours,
                  terms: [],
                  yearTerms: [],
                  years: []
                });
              });
            });
          }
          
          return {
            id: req.id,
            name: req.name,
            description: req.description,
            totalHours: req.totalHours,
            // Initialize completedHours to 0 - we'll calculate it from user courses
            completedHours: 0,
            courses: displayCourses
          };
        });
        
        setLoadingError(null);
        setRequirementsData(formattedRequirements);
      } catch (error) {
        console.error('Error loading degree requirements:', error);
        setLoadingError(`Failed to load degree requirements: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback to empty requirements if loading fails
        setRequirementsData([]);
      }
    };
    
    loadDegreeRequirements();
  }, [selectedDegree]);
  
  // Update requirements with user's courses and recalculate completion metrics
  useEffect(() => {
    if (requirementsData.length > 0 && userDegreeCourses.length > 0 && selectedDegree) {
      // Create a copy to avoid direct mutation
      const updatedRequirements = requirementsData.map(req => {
        // Filter user courses for this specific requirement AND degree
        const reqUserCourses = userDegreeCourses.filter(
          course => course.requirement.toString() === req.id && 
                   course.degree === selectedDegree
        );
        
        // Calculate completed hours based on user's courses for this requirement
        const completedHours = reqUserCourses.reduce((total, course) => {
          // Get credit hours from the course data safely
          const creditHours = course.courses?.credit_hours 
            ? extractCreditHours(course.courses.credit_hours)
            : 0;
          return total + creditHours;
        }, 0);
        
        // Return the updated requirement with user courses and recalculated completed hours
        return {
          ...req,
          userCourses: reqUserCourses,
          // Replace the static completedHours with the calculated value
          completedHours: completedHours
        };
      });
      
      // Only update state if something actually changed
      const hasChanges = JSON.stringify(updatedRequirements) !== JSON.stringify(requirementsData);
      if (hasChanges) {
        setRequirementsData(updatedRequirements);
      }
    }
  }, [userDegreeCourses, selectedDegree]);
  
  // Filter courses based on search query
  const filteredSemesterCourses = semesters.flatMap(s => s.coursecards).filter(course => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      course.subject.toLowerCase().includes(searchLower) ||
      course.number.toLowerCase().includes(searchLower) ||
      course.name.toLowerCase().includes(searchLower)
    );
  });

  // Log availability of course IDs for debugging
  useEffect(() => {
    if (isAddCourseModalOpen && selectedRequirement) {
      console.log('Available courses for requirement:', selectedRequirement.name);
      filteredSemesterCourses.forEach(course => {
        console.log(`Course: ${course.subject} ${course.number}, Display ID: ${course.id}, Database ID: ${courseIds[course.id] || 'Not found'}`);
      });
    }
  }, [isAddCourseModalOpen, selectedRequirement, courseIds, filteredSemesterCourses]);
  
  // Early return moved here after all hooks are called
  if (!shouldRender) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <p>No degree selected</p>
      </div>
    );
  }

  // Calculate total credits from all user's degree courses
  const totalCompletedHours = requirementsData.reduce((total, req) => {
    // Sum up the completedHours of each requirement (which is calculated from user courses)
    return total + req.completedHours;
  }, 0);

  // Total degree requirements hours - calculated from the requirements
  const totalRequiredHours = requirementsData.reduce((total, req) => {
    return total + req.totalHours;
  }, 0);
  
  // Calculate completion percentage based on actual user courses
  const completionPercentage = totalRequiredHours > 0 
    ? Math.round((totalCompletedHours / totalRequiredHours) * 100) 
    : 0;

  // Function to toggle requirement expansion
  const toggleRequirement = (requirementId: string) => {
    if (expandedRequirement === requirementId) {
      setExpandedRequirement(null);
    } else {
      setExpandedRequirement(requirementId);
    }
  };

  // Function to open modal for adding courses to requirement
  const openAddCourseModal = (requirement: DegreeRequirement) => {
    setSelectedRequirement(requirement);
    setIsAddCourseModalOpen(true);
  };

  // Safe display name for the degree
  const displayDegreeName = selectedDegree || "Computer Science";

  // Function to add a course to a requirement
  const addCourseToRequirement = async (courseId: number, course: DisplayCourse) => {
    if (!user || !selectedRequirement) return;
    
    setIsLoading(true);
    
    try {
      // Ensure courseId is a valid number
      if (!courseId || isNaN(courseId)) {
        console.error('Invalid course ID:', courseId, 'for course:', course.subject, course.number);
        throw new Error('Invalid course ID');
      }
      
      // Ensure we have a selected degree
      if (!selectedDegree) {
        console.error('No degree selected. Cannot add course to requirement.');
        throw new Error('No degree selected');
      }
      
      console.log(`Adding course ${course.subject} ${course.number} (ID: ${courseId}) to requirement ${selectedRequirement.name}`);
      
      // Use the selected degree title as the degree field
      const degree = selectedDegree;
      
      // Ensure we have a course title
      const courseTitle = course.name || `${course.subject} ${course.number}`;
      
      // Add the course to the requirement in the database
      // The user.id is the clerk_id which is what the degree_courses table expects
      const result = await addCourseToDegreeRequirement(
        user.id,
        courseId,
        parseInt(selectedRequirement.id),
        degree,
        courseTitle
      );
      
      if (result) {
        console.log('Successfully added course to requirement, DB ID:', result.id);
        
        // If successful, update local state
        const newUserCourse = {
          id: result.id,
          clerk_id: user.id,
          course_id: courseId,
          requirement: parseInt(selectedRequirement.id),
          degree: degree,
          course_title: courseTitle,
          courses: {
            id: courseId,
            subject: course.subject,
            number: course.number,
            title: courseTitle,
            credit_hours: course.creditHours
          }
        };
        
        // Add the new course to the userDegreeCourses state
        // This will trigger the useEffect to recalculate completedHours
        setUserDegreeCourses(prev => [...prev, newUserCourse]);
        
        // Close the modal
        setIsAddCourseModalOpen(false);
      }
    } catch (error) {
      console.error('Error adding course to requirement:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to remove a course from a requirement
  const removeCourseFromRequirement = async (courseId: number) => {
    if (!user) return;
    
    try {
      const success = await removeUserDegreeRequirementCourse(courseId);
      
      if (success) {
        // Update local state by removing the course
        // This will trigger the useEffect to recalculate completedHours
        setUserDegreeCourses(prev => prev.filter(c => c.id !== courseId));
      }
    } catch (error) {
      console.error('Error removing course from requirement:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Overall progress */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Graduation Requirements</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-2">{displayDegreeName}</p>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {totalCompletedHours.toFixed(1)} / {totalRequiredHours} hours
          </span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {completionPercentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Error message if loading failed */}
      {loadingError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <p>Error: {loadingError}</p>
          <p className="mt-1 text-xs">Using default or cached requirements.</p>
        </div>
      )}
      
      {/* Individual requirements */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {requirementsData.length > 0 ? (
          requirementsData.map((requirement) => (
            <div key={requirement.id} className="p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleRequirement(requirement.id)}
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    {requirement.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {requirement.description}
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="mr-4 text-right">
                    <div className="text-gray-700 dark:text-gray-300">
                      {requirement.completedHours.toFixed(1)} / {requirement.totalHours} hours
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      {requirement.totalHours > 0 
                        ? Math.round((requirement.completedHours / requirement.totalHours) * 100) 
                        : 0}%
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddCourseModal(requirement);
                    }}
                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="text-blue-600 dark:text-blue-400">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 transition-transform ${expandedRequirement === requirement.id ? 'transform rotate-180' : ''}`} 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Expanded details */}
              {expandedRequirement === requirement.id && (
                <div className="mt-4 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                  {/* User added courses section */}
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Courses:
                  </h4>
                  {requirement.userCourses && requirement.userCourses.length > 0 ? (
                    <ul className="space-y-1 mb-4">
                      {requirement.userCourses.map((course) => (
                        <li key={course.id} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            {course.courses.subject} {course.courses.number} - {course.course_title} ({course.courses.credit_hours 
                              ? extractCreditHours(course.courses.credit_hours).toFixed(1) 
                              : 'N/A'} hours)
                          </span>
                          <button 
                            onClick={() => removeCourseFromRequirement(course.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-500 italic mb-4">
                      No courses added to this requirement yet.
                    </p>
                  )}
                  
                  {/* Required courses section */}
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Suggested Courses:
                  </h4>
                  {requirement.courses.length > 0 ? (
                    <ul className="space-y-1">
                      {requirement.courses.map((course, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          {course.subject} {course.number} - {course.name} ({course.creditHours} hours)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                      No courses listed for this requirement.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {loadingError ? 
              "Failed to load requirements." : 
              `Loading requirements for ${displayDegreeName}...`}
          </div>
        )}
      </div>
      
      {/* Add Course Modal */}
      {isAddCourseModalOpen && selectedRequirement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Add Courses to {selectedRequirement.name}
              </h3>
              <button 
                onClick={() => setIsAddCourseModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2 mb-4">
              {filteredSemesterCourses.length > 0 ? (
                filteredSemesterCourses.map((course, index) => {
                  // Use the courseIds mapping to get the actual database ID
                  const numericCourseId = courseIds[course.id];
                  const hasValidId = numericCourseId !== undefined && numericCourseId > 0;
                  
                  // Check if the course is already added to this requirement
                  const isAlreadyAdded = userDegreeCourses.some(
                    udc => udc.requirement.toString() === selectedRequirement.id && 
                          udc.courses.subject === course.subject && 
                          udc.courses.number === course.number &&
                          udc.degree === selectedDegree
                  );
                  
                  return (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded"
                    >
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {course.subject} {course.number} {hasValidId ? '' : '(Missing ID)'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {course.name} ({course.creditHours} hours)
                        </div>
                      </div>
                      <button 
                        className={`px-3 py-1 rounded-md ${
                          isAlreadyAdded || !hasValidId
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        onClick={() => {
                          if (!isAlreadyAdded && hasValidId) {
                            addCourseToRequirement(
                              numericCourseId, 
                              course
                            );
                          }
                        }}
                        disabled={isAlreadyAdded || isLoading || !hasValidId}
                      >
                        {isAlreadyAdded 
                          ? 'Added' 
                          : !hasValidId 
                            ? 'Invalid ID' 
                            : isLoading 
                              ? 'Adding...' 
                              : 'Add'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No matching courses found.' : 'No courses available.'}
                </p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setIsAddCourseModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraduationRequirementsVisualizer; 