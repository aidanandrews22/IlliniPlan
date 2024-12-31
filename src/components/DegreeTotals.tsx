import type { Semester } from "../types/database";

interface DegreeTotalsProps {
  semesters: Semester[];
}

const DegreeTotals = ({ semesters }: DegreeTotalsProps) => {
  // Calculate total credits
  const totalCredits = semesters.reduce((total, semester) => {
    return total + semester.coursecards.reduce((semesterTotal, course) => {
      const credits = parseInt(course.creditHours) || 0;
      return semesterTotal + credits;
    }, 0);
  }, 0);

  // Calculate completed credits
  const completedCredits = semesters.reduce((total, semester) => {
    if (!semester.completed) return total;
    return total + semester.coursecards.reduce((semesterTotal, course) => {
      const credits = parseInt(course.creditHours) || 0;
      return semesterTotal + credits;
    }, 0);
  }, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Degree Progress</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Credits</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCredits}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Completed Credits</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCredits}</p>
        </div>
      </div>
    </div>
  );
};

export default DegreeTotals; 