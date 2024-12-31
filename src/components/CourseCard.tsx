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

interface CourseCardProps {
  id: string;
  subject: string;
  number: string;
  name: string;
  description: string;
  creditHours: string;
  degreeAttributes?: string;
  scheduleInformation?: string;
  sectionInfo?: string;
  terms: string[];
  yearTerms: string[];
  years: string[];
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {subject} {number}
                  </h2>
                  <p className="text-xl text-gray-700 dark:text-gray-300 mt-1">
                    {name}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Description</h3>
                  <p className="mt-2 text-gray-700 dark:text-gray-300">{description}</p>
                </div>
                
                {degreeAttributes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Degree Attributes</h3>
                    <p className="mt-2 text-gray-700 dark:text-gray-300">{degreeAttributes}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Credit Hours</h3>
                  <p className="mt-2 text-gray-700 dark:text-gray-300">{creditHours}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Available Terms</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {terms.map((term) => (
                      <span 
                        key={term}
                        className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseCard;