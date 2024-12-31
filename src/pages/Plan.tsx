import { useCallback, useEffect, useState, Dispatch, SetStateAction } from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { dbQueue } from '../utils/dbQueue';

import Semester from "../components/Semester";
import DegreeTotals from '../components/DegreeTotals';
import TrashZone from '../components/TrashZone';
import NewSemesterModal from '../components/NewSemesterModal';
import MiniExploreModal from '../components/MiniExploreModal';
import type { CourseData } from '../types/database';

interface DragData {
  type: string;
  coursecardId?: string;
}

interface DropTargetData {
  type?: string;
  semesterId?: string;
  coursecardId?: string;
}

interface Course {
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
}

interface SemesterData {
  id: string;
  name: string;
  completed: boolean;
  coursecards: Course[];
}

interface SemestersData {
  [key: string]: SemesterData;
}

interface PlanProps {
  semestersData: SemestersData;
  setSemestersData: Dispatch<SetStateAction<SemestersData>>;
  userId: number | null;
  semesterIds: { [key: string]: { planId: number; termId: number; } };
  courseIds: { [key: string]: number };
  setCourseIds: Dispatch<SetStateAction<{ [key: string]: number }>>;
}

const Plan = ({ 
  semestersData, 
  setSemestersData, 
  userId,
  semesterIds,
  courseIds,
  setCourseIds
}: PlanProps) => {
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [isNewSemesterModalOpen, setIsNewSemesterModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  const moveCourseCard = useCallback(({
    movedCourseCardIndexInSourceSemester,
    sourceSemesterId,
    destinationSemesterId,
    movedCourseCardIndexInDestinationSemester,
  }: {
    movedCourseCardIndexInSourceSemester: number;
    sourceSemesterId: string;
    destinationSemesterId: string;
    movedCourseCardIndexInDestinationSemester?: number;
  }) => {
    setSemestersData(prev => {
      const sourceSemesterData = prev[sourceSemesterId];
      const destinationSemesterData = prev[destinationSemesterId];
      const coursecardToMove = sourceSemesterData.coursecards[movedCourseCardIndexInSourceSemester];

      const newSourceSemesterData = {
        ...sourceSemesterData,
        coursecards: sourceSemesterData.coursecards.filter(coursecard => coursecard.id !== coursecardToMove.id),
      };

      const newDestinationCoursecards = [...destinationSemesterData.coursecards];
      const newIndexInDestination = movedCourseCardIndexInDestinationSemester ?? 0;
      newDestinationCoursecards.splice(newIndexInDestination, 0, coursecardToMove);

      return {
        ...prev,
        [sourceSemesterId]: newSourceSemesterData,
        [destinationSemesterId]: {
          ...destinationSemesterData,
          coursecards: newDestinationCoursecards,
        },
      };
    });
  }, []);

  const reorderCourseCard = useCallback(({
    semesterId,
    startIndex,
    finishIndex,
  }: {
    semesterId: string;
    startIndex: number;
    finishIndex: number;
  }) => {
    setSemestersData(prev => {
      const semesterData = prev[semesterId];
      const updatedCoursecards = reorder({
        list: semesterData.coursecards,
        startIndex,
        finishIndex,
      });

      return {
        ...prev,
        [semesterId]: {
          ...semesterData,
          coursecards: updatedCoursecards,
        },
      };
    });
  }, []);

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        if (!location.current.dropTargets.length || !userId) return;

        const sourceData = source.data as unknown as DragData;
        if (sourceData.type === "coursecard" && sourceData.coursecardId) {
          const draggedCourseCardId = sourceData.coursecardId;
          const [, sourceSemesterRecord] = location.initial.dropTargets;
          const sourceSemesterData = sourceSemesterRecord.data as unknown as DropTargetData;
          const sourceSemesterId = sourceSemesterData.semesterId as string;
          const semesterData = semestersData[sourceSemesterId];
          const draggedCourseCardIndex = semesterData.coursecards.findIndex(
            (coursecard: Course) => coursecard.id === draggedCourseCardId
          );

          if (location.current.dropTargets.length === 1) {
            const [destinationSemesterRecord] = location.current.dropTargets;
            const destinationSemesterData = destinationSemesterRecord.data as unknown as DropTargetData;
            const destinationSemesterId = destinationSemesterData.semesterId as string;

            if (sourceSemesterId === destinationSemesterId) {
              const destinationIndex = semesterData.coursecards.length;

              reorderCourseCard({
                semesterId: sourceSemesterId,
                startIndex: draggedCourseCardIndex,
                finishIndex: destinationIndex,
              });
            } else {
              // Queue the move operation in the database
              const courseId = courseIds[draggedCourseCardId];
              dbQueue.addOperation({
                type: 'MOVE_COURSE',
                payload: {
                  userId,
                  sourceSemesterId,
                  destinationSemesterId,
                  courseId
                }
              });

              moveCourseCard({
                movedCourseCardIndexInSourceSemester: draggedCourseCardIndex,
                sourceSemesterId,
                destinationSemesterId,
                movedCourseCardIndexInDestinationSemester: semestersData[destinationSemesterId].coursecards.length,
              });
            }
          }

          if (location.current.dropTargets.length === 2) {
            const [destinationCourseCardRecord, destinationSemesterRecord] = location.current.dropTargets;
            const destinationSemesterData = destinationSemesterRecord.data as unknown as DropTargetData;
            const destinationSemesterId = destinationSemesterData.semesterId as string;
            const destinationSemester = semestersData[destinationSemesterId];
            const destinationCourseData = destinationCourseCardRecord.data as unknown as DropTargetData;
            const indexOfTarget = destinationSemester.coursecards.findIndex(
              (coursecard: Course) => coursecard.id === destinationCourseData.coursecardId
            );
            const closestEdgeOfTarget = extractClosestEdge(destinationCourseCardRecord.data);

            if (sourceSemesterId === destinationSemesterId) {
              const destinationIndex = getReorderDestinationIndex({
                startIndex: draggedCourseCardIndex,
                indexOfTarget,
                closestEdgeOfTarget,
                axis: "vertical",
              });

              reorderCourseCard({
                semesterId: sourceSemesterId,
                startIndex: draggedCourseCardIndex,
                finishIndex: destinationIndex,
              });
            } else {
              const destinationIndex = closestEdgeOfTarget === "bottom" 
                ? indexOfTarget + 1 
                : indexOfTarget;

              // Queue the move operation in the database
              const courseId = courseIds[draggedCourseCardId];
              dbQueue.addOperation({
                type: 'MOVE_COURSE',
                payload: {
                  userId,
                  sourceSemesterId,
                  destinationSemesterId,
                  courseId
                }
              });

              moveCourseCard({
                movedCourseCardIndexInSourceSemester: draggedCourseCardIndex,
                sourceSemesterId,
                destinationSemesterId,
                movedCourseCardIndexInDestinationSemester: destinationIndex,
              });
            }
          }
        }
      },
    });
  }, [semestersData, moveCourseCard, reorderCourseCard, userId, courseIds]);

  const addSemester = (term: string, year: number) => {
    const semesterId = `${term.toUpperCase()}${year}`;
    setSemestersData(prev => ({
      ...prev,
      [semesterId]: {
        id: semesterId,
        name: `${term} ${year}`,
        completed: false,
        coursecards: []
      }
    }));
  };

  const removeSemester = (semesterId: string) => {
    setSemestersData(prev => {
      const newData = { ...prev };
      delete newData[semesterId];
      return newData;
    });
  };

  const toggleSemesterCompletion = (semesterId: string) => {
    setSemestersData(prev => ({
      ...prev,
      [semesterId]: {
        ...prev[semesterId],
        completed: !prev[semesterId].completed
      }
    }));
  };

  const handleAddCourse = (semesterId: string) => {
    setSelectedSemesterId(semesterId);
    setIsAddCourseModalOpen(true);
  };

  const handleCourseSelect = (course: CourseData) => {
    if (!selectedSemesterId) return;

    setSemestersData(prev => {
      const semester = prev[selectedSemesterId];
      const newCourseId = `${course.subject}${course.number}_${Date.now()}`;
      
      // Convert course data to the format expected by the semester
      const newCourse: Course = {
        id: newCourseId,
        subject: course.subject || '',
        number: course.number || '',
        name: course.title || '',
        description: course.description || '',
        creditHours: course.credit_hours || '',
        degreeAttributes: course.degree_attributes || '',
        terms: course.course_offerings?.map(o => o.terms.season) || [],
        yearTerms: course.course_offerings?.map(o => `${o.terms.year}-${o.terms.season}`) || [],
        years: course.course_offerings?.map(o => o.terms.year.toString()) || []
      };

      return {
        ...prev,
        [selectedSemesterId]: {
          ...semester,
          coursecards: [...semester.coursecards, newCourse]
        }
      };
    });

    setIsAddCourseModalOpen(false);
    setSelectedSemesterId(null);
  };

  const removeCourse = (semesterId: string, courseId: string) => {
    setSemestersData(prev => ({
      ...prev,
      [semesterId]: {
        ...prev[semesterId],
        coursecards: prev[semesterId].coursecards.filter(course => course.id !== courseId)
      }
    }));
  };

  const handleCourseDelete = (courseId: string) => {
    setSemestersData(prev => {
      const newData = { ...prev };
      // Find and remove the course from any semester that contains it
      Object.entries(newData).forEach(([semesterId, semester]) => {
        if (semester && semester.coursecards) {
          newData[semesterId] = {
            ...semester,
            coursecards: semester.coursecards.filter(course => course.id !== courseId)
          };
        }
      });
      return newData;
    });
  };

  const handleDragStart = (courseId: string) => {
    setDraggedCourseId(courseId);
  };

  const handleDragEnd = () => {
    setDraggedCourseId(null);
    setIsTrashHovered(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Course Plan</h1>
          <TrashZone 
            onDelete={handleCourseDelete}
            isHovered={isTrashHovered}
            onHoverChange={setIsTrashHovered}
          />
        </div>
        <button
          onClick={() => setIsNewSemesterModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
        >
          Add Semester
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.values(semestersData).map((semester) => (
          <Semester
            key={semester.id}
            {...semester}
            onRemove={() => removeSemester(semester.id)}
            onToggleComplete={() => toggleSemesterCompletion(semester.id)}
            onAddCourse={() => handleAddCourse(semester.id)}
            onRemoveCourse={(courseId) => removeCourse(semester.id, courseId)}
            draggedCourseId={draggedCourseId}
            isTrashHovered={isTrashHovered}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
      <DegreeTotals semesters={Object.values(semestersData)} />
      
      {isNewSemesterModalOpen && (
        <NewSemesterModal
          onClose={() => setIsNewSemesterModalOpen(false)}
          onSubmit={addSemester}
          existingSemesters={Object.values(semestersData).map(({ id, name }) => ({ id, name }))}
        />
      )}

      {isAddCourseModalOpen && selectedSemesterId && (
        <MiniExploreModal
          onClose={() => {
            setIsAddCourseModalOpen(false);
            setSelectedSemesterId(null);
          }}
          onSelectCourse={handleCourseSelect}
          title={`Add Course to ${semestersData[selectedSemesterId].name}`}
        />
      )}
    </div>
  );
};

export default Plan;