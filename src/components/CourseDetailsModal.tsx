import type { CourseData } from '../types/database';
import { formatCreditHours, getLatestTermGPA, formatGenEds, formatTerms } from '../utils/courseUtils';

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
  // console.log("genEds: ", genEds);
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

            {showAddToSemester && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    onAddToSemester?.();
                  }}
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
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