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
import type { CourseData, DisplayCourse, CourseHighlightState } from "../types/database";
import { getCourseGenEds, getCourseGPAs } from "../lib/supabase";
import { formatCourseCode } from '../utils/courseUtils';

interface CourseCardProps extends DisplayCourse {
  isDragged: boolean;
  isTrashHovered: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  databaseId?: number;
  highlightState?: CourseHighlightState;
  onHover?: (courseCode: string | null) => void;
  isCompact?: boolean;
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
  onDragEnd,
  databaseId,
  highlightState = { isPrereq: false, isPostreq: false, isCoreq: false },
  onHover,
  isCompact
}: CourseCardProps) => {
  const coursecardRef = useRef<HTMLDivElement>(null);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseGenEds, setCourseGenEds] = useState<CourseData['course_geneds']>(null);
  const [courseGPAs, setCourseGPAs] = useState<CourseData['course_gpas']>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isModalOpen && databaseId) {
        setLoading(true);
        const [genEds, gpas] = await Promise.all([
          getCourseGenEds(databaseId),
          getCourseGPAs(databaseId)
        ]);
        setCourseGenEds(genEds);
        setCourseGPAs(gpas);
        setLoading(false);
      }
    };
    fetchData();
  }, [isModalOpen, databaseId]);

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
    e; // unused
  };

  // Create a CourseData object from the props
  const courseData: CourseData = {
    id: databaseId || 0,
    subject,
    number,
    title: name,
    description,
    credit_hours: creditHours,
    degree_attributes: degreeAttributes || null,
    section_info: null,
    course_geneds: courseGenEds,
    course_prereqs: null,
    course_gpas: courseGPAs,
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
        course_id: databaseId || 0,
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

  // Add highlight classes based on state
  const getHighlightClasses = () => {
    if (highlightState.isPrereq) return 'ring-2 ring-red-500 dark:ring-red-400';
    if (highlightState.isPostreq) return 'ring-2 ring-green-500 dark:ring-green-400';
    if (highlightState.isCoreq) return 'ring-2 ring-blue-500 dark:ring-blue-400';
    return '';
  };

  const handleMouseEnter = () => {
    if (onHover) {
      onHover(formatCourseCode(subject, number));
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  return (
    <>
      <div 
        ref={coursecardRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative border rounded-lg shadow-sm transition-all duration-200 ${
          isDragged ? 'opacity-50 cursor-grabbing' : 'cursor-pointer hover:border-primary dark:hover:border-primary'
        } ${
          isTrashHovered 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-500 shadow-md' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
        } ${getHighlightClasses()}`}
      >
        <div className={`${isCompact ? 'p-2' : 'p-4'}`}>
          <div className="flex items-start justify-between">
            <div onClick={handleClick} className="flex-grow">
              <div className={`flex items-center justify-between ${isCompact ? 'space-x-2' : ''}`}>
                <h3 className={`font-semibold transition-colors duration-200 ${
                  isTrashHovered 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-900 dark:text-gray-100'
                } ${isCompact ? 'text-sm' : 'text-lg'}`}>
                  {subject} {number}
                </h3>
                <span className={`font-medium transition-colors duration-200 ${
                  isTrashHovered 
                    ? 'text-red-500 dark:text-red-400' 
                    : 'text-primary dark:text-primary'
                } ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {creditHours?.replace(/to/gi, '-').replace(/[^\d.\-]/g, '').split('.')[0]} hrs
                </span>
              </div>
              {!isCompact && (
                <p className={`text-sm mt-1 transition-colors duration-200 ${
                  isTrashHovered 
                    ? 'text-red-500/80 dark:text-red-400/80' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {name}
                </p>
              )}
            </div>
          </div>
        </div>
        {closestEdge && (
          <div 
            className={`absolute left-0 right-0 h-0.5 bg-primary transform transition-transform duration-200 ${
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
          loading={loading}
        />
      )}
    </>
  );
};

export default CourseCard;