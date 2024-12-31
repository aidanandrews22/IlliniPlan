import type { CourseData } from '../types/database';

interface CourseDetailsModalProps {
  course: CourseData;
  onClose: () => void;
  onAddToSemester?: () => void;
  showAddToSemester?: boolean;
}

const CourseDetailsModal = ({ course, onClose, onAddToSemester, showAddToSemester }: CourseDetailsModalProps) => {
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
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Credit Hours</h3>
              <p className="mt-2 text-gray-700 dark:text-gray-300">{course.credit_hours}</p>
            </div>

            {course.course_offerings && course.course_offerings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Terms</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {course.course_offerings.map((offering) => (
                    <span
                      key={offering.term_id}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {offering.terms.season.toUpperCase()} {offering.terms.year}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {course.course_geneds && Object.values(course.course_geneds).some(val => val !== 'False' && val !== false) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gen Eds</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {course.course_geneds.acp && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm">
                      ACP
                    </span>
                  )}
                  {course.course_geneds.cs && course.course_geneds.cs !== 'False' && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm">
                      {course.course_geneds.cs}
                    </span>
                  )}
                  {course.course_geneds.hum && course.course_geneds.hum !== 'False' && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm">
                      {course.course_geneds.hum}
                    </span>
                  )}
                  {course.course_geneds.nat && course.course_geneds.nat !== 'False' && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm">
                      {course.course_geneds.nat}
                    </span>
                  )}
                  {course.course_geneds.qr && course.course_geneds.qr !== 'False' && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm">
                      {course.course_geneds.qr}
                    </span>
                  )}
                  {course.course_geneds.sbs && course.course_geneds.sbs !== 'False' && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm">
                      {course.course_geneds.sbs}
                    </span>
                  )}
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