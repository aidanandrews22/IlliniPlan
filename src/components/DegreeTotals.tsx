interface Course {
  creditHours: string;
}

interface Semester {
  completed: boolean;
  coursecards: Course[];
}

interface DegreeTotalsProps {
  semesters: Semester[];
}

const DegreeTotals = ({ semesters }: DegreeTotalsProps) => {
  const calculateHours = () => {
    let totalHours = 0;
    let completedHours = 0;
    let plannedHours = 0;

    semesters.forEach(semester => {
      const semesterHours = semester.coursecards.reduce((total, course) => {
        const hours = parseInt(course.creditHours) || 0;
        return total + hours;
      }, 0);

      totalHours += semesterHours;
      if (semester.completed) {
        completedHours += semesterHours;
      } else {
        plannedHours += semesterHours;
      }
    });

    return { totalHours, completedHours, plannedHours };
  };

  const { totalHours, completedHours, plannedHours } = calculateHours();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Degree Progress
      </h2>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Total Hours
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {totalHours}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Completed Hours
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedHours}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Planned Hours
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {plannedHours}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DegreeTotals; 