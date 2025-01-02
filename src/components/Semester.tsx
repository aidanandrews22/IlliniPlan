import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import CourseCard from "./CourseCard";
import type { DisplayCourse } from "../types/database";

interface SemesterProps {
  id: string;
  name: string;
  completed: boolean;
  coursecards: DisplayCourse[];
  onRemove: () => void;
  onToggleComplete: () => void;
  onAddCourse: () => void;
  onRemoveCourse: (courseId: string) => void;
  draggedCourseId: string | null;
  isTrashHovered: boolean;
  onDragStart: (courseId: string) => void;
  onDragEnd: () => void;
  courseIds?: { [key: string]: number };
}

const Semester = ({ 
  id, 
  name, 
  completed, 
  coursecards, 
  onRemove, 
  onToggleComplete,
  onAddCourse,
  onRemoveCourse,
  draggedCourseId,
  isTrashHovered,
  onDragStart,
  onDragEnd,
  courseIds = {}
}: SemesterProps) => {
  const semesterRef = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  // Calculate total credits
  const totalCredits = coursecards.reduce((total, course) => {
    const credits = parseInt(course.creditHours) || 0;
    return total + credits;
  }, 0);

  useEffect(() => {
    const semesterEl = semesterRef.current;
    invariant(semesterEl);
    
    return dropTargetForElements({
      element: semesterEl,
      onDragStart: () => setIsDraggedOver(true),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
      getData: () => ({ semesterId: id }),
      getIsSticky: () => true,
    });
  }, [id]);

  return (
    <div 
      ref={semesterRef}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
        isDraggedOver ? 'ring-2 ring-primary ring-opacity-50' : ''
      } ${completed ? 'bg-gray-100 dark:bg-gray-900' : ''}`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{name}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleComplete}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                completed 
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {completed ? '✓ Complete' : 'Mark Complete'}
            </button>
            <button
              onClick={onRemove}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors duration-200"
            >
              Remove
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{coursecards.length} courses</span>
          <span>•</span>
          <span>{totalCredits} credits</span>
          <span>•</span>
          <span>{completed ? 'Completed' : 'In Progress'}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {coursecards.map((course) => (
          <CourseCard 
            key={course.id} 
            {...course}
            isDragged={draggedCourseId === course.id}
            isTrashHovered={isTrashHovered && draggedCourseId === course.id}
            onDragStart={() => onDragStart(course.id)}
            onDragEnd={onDragEnd}
            databaseId={courseIds[course.id]}
          />
        ))}
        {coursecards.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Drop courses here
          </div>
        )}
      </div>
      <div className="p-4 pt-0">
        <button
          onClick={onAddCourse}
          className="w-full py-2 px-4 bg-primary/10 text-primary dark:text-primary rounded-lg hover:bg-primary/20 transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <span>Add Course</span>
        </button>
      </div>
    </div>
  );
}

export default Semester;