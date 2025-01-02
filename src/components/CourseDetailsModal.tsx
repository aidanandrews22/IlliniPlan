import type { CourseData } from '../types/database';
import { formatCreditHours, getLatestTermGPA, formatGenEds, formatTerms } from '../utils/courseUtils';
import { useState, useMemo } from 'react';

interface CourseDetailsModalProps {
  course: CourseData;
  onClose: () => void;
  onAddToSemester?: () => void;
  showAddToSemester?: boolean;
  loading?: boolean | undefined;
}

const CourseDetailsModal = ({ course, onClose, onAddToSemester, showAddToSemester, loading }: CourseDetailsModalProps) => {
  const averageGPA = getLatestTermGPA(course);
  const genEds = formatGenEds(course);
  const formattedTerms = formatTerms(course);
  const creditHours = formatCreditHours(course.credit_hours);

  // Get unique terms from GPA data
  const availableTerms = useMemo(() => {
    if (!course.course_gpas || course.course_gpas.length === 0) return [];
    
    const uniqueTerms = Array.from(new Set(course.course_gpas.map(gpa => gpa.term_id)));
    return uniqueTerms.map(termId => {
      const offering = course.course_offerings.find(
        off => off.terms.id === termId
      );
      if (!offering) return null;
      
      const { season, year } = offering.terms;
      const seasonName = {
        'fa': 'Fall',
        'sp': 'Spring',
        'su': 'Summer',
        'wi': 'Winter'
      }[season];
      
      return {
        id: termId,
        label: `${seasonName} ${year}`,
        season,
        year
      };
    }).filter(Boolean).sort((a, b) => {
      if (a!.year !== b!.year) return b!.year - a!.year;
      const seasonOrder = { 'fa': 3, 'sp': 1, 'su': 2, 'wi': 0 };
      return seasonOrder[b!.season] - seasonOrder[a!.season];
    });
  }, [course.course_gpas, course.course_offerings]);

  const [selectedTermId, setSelectedTermId] = useState<number | null>(
    availableTerms[0]?.id || null
  );

  // Group gen eds by category
  const genEdsByCategory = genEds.reduce((acc, genEd) => {
    if (!acc[genEd.category]) {
      acc[genEd.category] = [];
    }
    acc[genEd.category].push(genEd);
    return acc;
  }, {} as Record<string, typeof genEds>);

  // Process GPA data for selected term
  const processGPAData = (gpas: CourseData['course_gpas']) => {
    if (!gpas || gpas.length === 0) return null;

    // Filter GPAs by selected term
    const termGpas = selectedTermId 
      ? gpas.filter(gpa => gpa.term_id === selectedTermId)
      : gpas;

    if (termGpas.length === 0) return null;

    // Group by instructor
    const instructorData = termGpas.reduce((acc, gpa) => {
      const instructor = gpa.primary_instructor || 'Unknown';
      if (!acc[instructor]) {
        acc[instructor] = {
          grades: {
            'A+': { count: 0, value: 4.0 },
            'A': { count: 0, value: 4.0 },
            'A-': { count: 0, value: 3.7 },
            'B+': { count: 0, value: 3.3 },
            'B': { count: 0, value: 3.0 },
            'B-': { count: 0, value: 2.7 },
            'C+': { count: 0, value: 2.3 },
            'C': { count: 0, value: 2.0 },
            'C-': { count: 0, value: 1.7 },
            'D+': { count: 0, value: 1.3 },
            'D': { count: 0, value: 1.0 },
            'D-': { count: 0, value: 0.7 },
            'F': { count: 0, value: 0.0 },
            'W': { count: 0, value: null }
          }
        };
      }
      
      acc[instructor].grades['A+'].count += gpa.a_plus || 0;
      acc[instructor].grades['A'].count += gpa.a || 0;
      acc[instructor].grades['A-'].count += gpa.a_minus || 0;
      acc[instructor].grades['B+'].count += gpa.b_plus || 0;
      acc[instructor].grades['B'].count += gpa.b || 0;
      acc[instructor].grades['B-'].count += gpa.b_minus || 0;
      acc[instructor].grades['C+'].count += gpa.c_plus || 0;
      acc[instructor].grades['C'].count += gpa.c || 0;
      acc[instructor].grades['C-'].count += gpa.c_minus || 0;
      acc[instructor].grades['D+'].count += gpa.d_plus || 0;
      acc[instructor].grades['D'].count += gpa.d || 0;
      acc[instructor].grades['D-'].count += gpa.d_minus || 0;
      acc[instructor].grades['F'].count += gpa.f || 0;
      acc[instructor].grades['W'].count += gpa.w || 0;
      
      return acc;
    }, {} as Record<string, { grades: Record<string, { count: number; value: number | null }> }>);

    return instructorData;
  };

  const calculateAverageGPA = (grades: Record<string, { count: number; value: number | null }>) => {
    let totalPoints = 0;
    let totalStudents = 0;
    Object.entries(grades).forEach(([_, data]) => {
      if (data.value !== null) {
        totalPoints += data.count * data.value;
        totalStudents += data.count;
      }
    });
    return totalStudents > 0 ? (totalPoints / totalStudents).toFixed(2) : 'N/A';
  };

  const getTotalStudents = (grades: Record<string, { count: number; value: number | null }>) => {
    return Object.values(grades).reduce((sum, grade) => sum + grade.count, 0);
  };

  const getGradeBarWidth = (count: number, totalStudents: number) => {
    const maxWidth = 100;
    return totalStudents > 0 ? (count / totalStudents) * maxWidth : 0;
  };

  const gpaData = processGPAData(course.course_gpas);

  if (loading) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 dark:text-gray-300 text-lg">Loading your courses details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {course.subject} {course.number}
              </h2>
              <p className="text-xl text-gray-700 dark:text-gray-300 mt-1">
                {course.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Credit Hours</h3>
                <p className="mt-2 text-gray-700 dark:text-gray-300">{creditHours}</p>
              </div>
              {averageGPA && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Average GPA</h3>
                  <p className="mt-2 text-gray-700 dark:text-gray-300">{averageGPA}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Description</h3>
              <p className="mt-2 text-gray-700 dark:text-gray-300">{course.description}</p>
            </div>

            {course.degree_attributes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Degree Attributes</h3>
                <p className="mt-2 text-gray-700 dark:text-gray-300">{course.degree_attributes}</p>
              </div>
            )}

            {genEds.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gen Eds</h3>
                <div className="mt-2 space-y-4">
                  {Object.entries(genEdsByCategory).map(([category, categoryGenEds]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {category}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {categoryGenEds.map((genEd) => (
                          <div
                            key={genEd.code}
                            className="group relative"
                          >
                            <span
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm cursor-help"
                            >
                              {genEd.code}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              {genEd.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formattedTerms.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Terms</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formattedTerms.map((term, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {availableTerms.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GPA Data</h3>
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                  Same data used by Wade Fagan's <a href="https://waf.cs.illinois.edu/discovery/grade_disparity_between_sections_at_uiuc/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">grade disparity</a> tool.
                </p>
                <label htmlFor="term-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Term
                </label>
                <select
                  id="term-select"
                  value={selectedTermId || ''}
                  onChange={(e) => setSelectedTermId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-gray-100"
                >
                  {availableTerms.map(term => (
                    <option key={term!.id} value={term!.id}>
                      {term!.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {gpaData && Object.entries(gpaData).map(([instructor, data]) => (
              <div key={instructor} className="mt-4 border rounded-lg p-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{instructor}</div>
                  <div className="flex gap-4 text-gray-700 dark:text-gray-300">
                    <span>GPA: {calculateAverageGPA(data.grades)}</span>
                    <span>Total: {getTotalStudents(data.grades)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  {Object.entries(data.grades).map(([grade, gradeData]) => (
                    <div key={grade} className="flex items-center text-xs gap-1">
                      <div className="w-6 text-gray-700 dark:text-gray-300">{grade}</div>
                      <div className="w-8 text-right text-gray-700 dark:text-gray-300">{gradeData.count}</div>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                        <div
                          className="h-full bg-primary dark:bg-primary/80 rounded transition-all duration-300"
                          style={{ width: `${getGradeBarWidth(gradeData.count, getTotalStudents(data.grades))}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-gray-600 dark:text-gray-400">
                        {((gradeData.count / getTotalStudents(data.grades)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {showAddToSemester && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    onAddToSemester?.();
                  }}
                  className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <span>Add to Semester</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsModal; 