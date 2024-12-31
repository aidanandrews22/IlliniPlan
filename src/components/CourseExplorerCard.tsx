import { useState } from 'react';
import type { CourseData } from '../types/database';
import SemesterSelectorModal from './SemesterSelectorModal';

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

  // Format credit hours from string (e.g., "3 hours" or "3 TO 4 hours")
  const formatCreditHours = (hours: string | null) => {
    if (!hours) return 'N/A';
    return hours.toLowerCase().replace(' hours', '').replace(' to ', '-');
  };

  // Get the latest term's GPA data
  const getLatestTermGPA = () => {
    if (!course.course_offerings || course.course_offerings.length === 0) return null;
    
    const sortedOfferings = [...course.course_offerings].sort((a, b) => {
      const termA = a.terms;
      const termB = b.terms;
      if (!termA || !termB) return 0;
      return (termB.year - termA.year) || (termB.season.localeCompare(termA.season));
    });

    const latestOffering = sortedOfferings[0];
    if (!latestOffering.course_gpas || latestOffering.course_gpas.length === 0) return null;

    const gpaData = latestOffering.course_gpas[0];
    const totalGrades = (gpaData.a_plus || 0) + (gpaData.a || 0) + (gpaData.a_minus || 0) +
                       (gpaData.b_plus || 0) + (gpaData.b || 0) + (gpaData.b_minus || 0) +
                       (gpaData.c_plus || 0) + (gpaData.c || 0) + (gpaData.c_minus || 0) +
                       (gpaData.d_plus || 0) + (gpaData.d || 0) + (gpaData.d_minus || 0) +
                       (gpaData.f || 0);

    const weightedSum = (gpaData.a_plus || 0) * 4.0 + (gpaData.a || 0) * 4.0 + (gpaData.a_minus || 0) * 3.67 +
                       (gpaData.b_plus || 0) * 3.33 + (gpaData.b || 0) * 3.0 + (gpaData.b_minus || 0) * 2.67 +
                       (gpaData.c_plus || 0) * 2.33 + (gpaData.c || 0) * 2.0 + (gpaData.c_minus || 0) * 1.67 +
                       (gpaData.d_plus || 0) * 1.33 + (gpaData.d || 0) * 1.0 + (gpaData.d_minus || 0) * 0.67;

    return totalGrades > 0 ? (weightedSum / totalGrades).toFixed(2) : null;
  };

  // Format gen ed attributes
  const formatGenEds = () => {
    if (!course.course_geneds) return [];
    const genEds = [];
    
    if (course.course_geneds.acp) genEds.push('ACP');
    if (course.course_geneds.cs && course.course_geneds.cs !== 'False') genEds.push(course.course_geneds.cs);
    if (course.course_geneds.hum && course.course_geneds.hum !== 'False') genEds.push(course.course_geneds.hum);
    if (course.course_geneds.nat && course.course_geneds.nat !== 'False') genEds.push(course.course_geneds.nat);
    if (course.course_geneds.qr && course.course_geneds.qr !== 'False') genEds.push(course.course_geneds.qr);
    if (course.course_geneds.sbs && course.course_geneds.sbs !== 'False') genEds.push(course.course_geneds.sbs);
    
    return genEds;
  };

  const averageGPA = getLatestTermGPA();
  const genEds = formatGenEds();

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
                {formatCreditHours(course.credit_hours)}
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
              <div className="flex flex-wrap gap-2">
                {genEds.map((genEd) => (
                  <span
                    key={genEd}
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm"
                  >
                    {genEd}
                  </span>
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

          {course.course_offerings && course.course_offerings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recent Terms
              </h4>
              <div className="flex flex-wrap gap-2">
                {course.course_offerings.slice(0, 4).map((offering) => (
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

          {semesters && onAddToSemester && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsSemesterSelectorOpen(true)}
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDetailsModalOpen(false);
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
                  onClick={() => setIsDetailsModalOpen(false)}
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

                {genEds.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gen Eds</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {genEds.map((genEd) => (
                        <span
                          key={genEd}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm"
                        >
                          {genEd}
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
                        setIsDetailsModalOpen(false);
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
          </div>
        </div>
      )}
    </>
  );
};

export default CourseExplorerCard; 