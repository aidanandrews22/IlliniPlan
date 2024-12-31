import { useRef, useEffect } from 'react';
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

interface DragData {
  type: string;
  coursecardId?: string;
}

interface TrashZoneProps {
  onDelete: (courseId: string) => void;
  isHovered: boolean;
  onHoverChange: (isHovered: boolean) => void;
}

const TrashZone = ({ onDelete, isHovered, onHoverChange }: TrashZoneProps) => {
  const trashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = trashRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({ type: 'trash' }),
      onDragEnter: () => onHoverChange(true),
      onDragLeave: () => onHoverChange(false),
      onDrop: (args) => {
        onHoverChange(false);
        const sourceData = args.source.data as unknown as DragData;
        if (sourceData.type === 'coursecard' && sourceData.coursecardId) {
          onDelete(sourceData.coursecardId);
        }
      },
    });
  }, [onDelete, onHoverChange]);

  return (
    <div
      ref={trashRef}
      className={`flex items-center px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-200 ${
        isHovered
          ? 'border-red-500 bg-red-100 dark:bg-red-900/30 shadow-lg scale-105'
          : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      <span className={`text-xl mr-2 transition-colors duration-200 ${
        isHovered ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
      }`}>
        🗑️
      </span>
      <span className={`text-sm font-medium transition-all duration-200 ${
        isHovered
          ? 'text-red-600 dark:text-red-400 font-semibold'
          : 'text-gray-600 dark:text-gray-400'
      }`}>
        Drop to Remove
      </span>
    </div>
  );
};

export default TrashZone; 