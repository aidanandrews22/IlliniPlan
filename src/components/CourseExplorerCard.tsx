import { useState } from 'react';
import type { CourseData } from '../types/database';
import SemesterSelectorModal from './SemesterSelectorModal';
import CourseDetailsModal from './CourseDetailsModal';
import { formatCreditHours, getLatestTermGPA, formatGenEds, formatTerms } from '../utils/courseUtils';

interface CourseExplorerCardProps {
  course: CourseData;
  semesters?: { id: string; name: string; }[];
  onAddToSemester?: (courseData: CourseData, semesterId: string) => void;
}

const CourseExplorerCard = ({ course, semesters, onAddToSemester }: CourseExplorerCardProps) => {
  const [isSemesterSelectorOpen, setIsSemesterSelectorOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleSemesterSelect = (semesterId: string) => {
    if (onAddToSemester) {
      onAddToSemester(course, semesterId);
      setIsSemesterSelectorOpen(false);
    }
  };

  const averageGPA = getLatestTermGPA(course);
  const genEds = formatGenEds(course);
  const formattedTerms = formatTerms(course);
  const creditHours = formatCreditHours(course.credit_hours);

  // Group gen eds by category
  const genEdsByCategory = genEds.reduce((acc, genEd) => {
    if (!acc[genEd.category]) {
      acc[genEd.category] = [];
    }
    acc[genEd.category].push(genEd);
    return acc;
  }, {} as Record<string, typeof genEds>);

  return (
    <>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md cursor-pointer"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {course.subject} {course.number}
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mt-1">
                {course.title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                {creditHours}
              </span>
              {averageGPA && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  GPA: {averageGPA}
                </span>
              )}
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {course.description}
          </p>

          {genEds.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gen Eds
              </h4>
              <div className="space-y-2">
                {Object.entries(genEdsByCategory).map(([category, categoryGenEds]) => (
                  <div key={category} className="flex flex-wrap gap-2">
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
                ))}
              </div>
            </div>
          )}

          {course.degree_attributes && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Degree Attributes
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {course.degree_attributes}
              </p>
            </div>
          )}

          {formattedTerms.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recent Terms
              </h4>
              <div className="flex flex-wrap gap-2">
                {formattedTerms.slice(0, 4).map((term, index) => (
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

          {semesters && onAddToSemester && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSemesterSelectorOpen(true);
                }}
                className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>Add to Semester</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isSemesterSelectorOpen && semesters && onAddToSemester && (
        <SemesterSelectorModal
          semesters={semesters}
          onSelect={handleSemesterSelect}
          onClose={() => setIsSemesterSelectorOpen(false)}
        />
      )}

      {isDetailsModalOpen && (
        <CourseDetailsModal
          course={course}
          onClose={() => setIsDetailsModalOpen(false)}
          onAddToSemester={() => setIsSemesterSelectorOpen(true)}
          showAddToSemester={Boolean(semesters && onAddToSemester)}
        />
      )}
    </>
  );
};

export default CourseExplorerCard; 