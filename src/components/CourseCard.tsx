import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { 
  draggable,
  dropTargetForElements 
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { 
  attachClosestEdge,
  extractClosestEdge,
  Edge 
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import CourseDetailsModal from "./CourseDetailsModal";
import type { CourseData, DisplayCourse } from "../types/database";

interface CourseCardProps extends DisplayCourse {
  isDragged: boolean;
  isTrashHovered: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const CourseCard = ({ 
  id, 
  subject, 
  number, 
  name, 
  description,
  creditHours,
  degreeAttributes,
  terms,
  isDragged,
  isTrashHovered,
  onDragStart,
  onDragEnd
}: CourseCardProps) => {
  const coursecardRef = useRef<HTMLDivElement>(null);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const coursecardEl = coursecardRef.current;
    invariant(coursecardEl);

    return combine(
      draggable({
        element: coursecardEl,
        getInitialData: () => ({ type: "coursecard", coursecardId: id }),
        onDragStart: () => onDragStart(),
        onDrop: () => onDragEnd(),
      }),
      dropTargetForElements({
        element: coursecardEl,
        getData: ({ input, element }) => {
          const data = { type: "coursecard", coursecardId: id };
          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          });
        },
        getIsSticky: () => true,
        onDragEnter: (args) => {
          if (args.source.data.coursecardId !== id) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDrag: (args) => {
          if (args.source.data.coursecardId !== id) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      })
    );
  }, [id, onDragStart, onDragEnd]);

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragged) {
      setIsModalOpen(true);
    }
  };

  // Create a CourseData object from the props
  const courseData: CourseData = {
    id: parseInt(id),
    subject,
    number,
    title: name,
    description,
    credit_hours: creditHours,
    degree_attributes: degreeAttributes || null,
    section_info: null,
    course_geneds: {
      id: parseInt(id),
      course_id: parseInt(id),
      acp: false,
      cs: 'False' as const,
      hum: 'False' as const,
      nat: 'False' as const,
      qr: 'False' as const,
      sbs: 'False' as const
    },
    course_prereqs: null,
    course_offerings: terms.map((term, index) => {
      const [season, year] = term.split(' ');
      const seasonCode = {
        'Fall': 'fa',
        'Spring': 'sp',
        'Summer': 'su',
        'Winter': 'wi'
      }[season] || season.toLowerCase();
      
      return {
        id: index + 1,
        course_id: parseInt(id),
        term_id: index + 1,
        terms: {
          id: index + 1,
          season: seasonCode as "fa" | "sp" | "su" | "wi",
          year: parseInt(year),
          combined: `${seasonCode}${year}`
        },
        course_gpas: []
      };
    })
  };

  return (
    <>
      <div 
        ref={coursecardRef}
        className={`relative border rounded-lg shadow-sm transition-all duration-200 ${
          isDragged ? 'opacity-50 cursor-grabbing' : 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400'
        } ${
          isTrashHovered 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-500 shadow-md' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div onClick={handleClick} className="flex-grow">
              <h3 className={`text-lg font-semibold transition-colors duration-200 ${
                isTrashHovered 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {subject} {number}
              </h3>
              <p className={`text-sm mt-1 transition-colors duration-200 ${
                isTrashHovered 
                  ? 'text-red-500/80 dark:text-red-400/80' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {name}
              </p>
            </div>
            <span className={`text-sm font-medium transition-colors duration-200 ${
              isTrashHovered 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {creditHours}
            </span>
          </div>
        </div>
        {closestEdge && (
          <div 
            className={`absolute left-0 right-0 h-0.5 bg-blue-500 transform transition-transform duration-200 ${
              closestEdge === 'top' ? '-top-px' : '-bottom-px'
            }`}
          />
        )}
      </div>

      {isModalOpen && (
        <CourseDetailsModal
          course={courseData}
          onClose={() => setIsModalOpen(false)}
          showAddToSemester={false}
        />
      )}
    </>
  );
};

export default CourseCard;