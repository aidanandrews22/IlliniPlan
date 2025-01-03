import { useCallback, useEffect, useState, Dispatch, SetStateAction } from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { dbQueue } from '../utils/dbQueue';
import { buildCourseRelationships, formatCourseCode, getAllPrerequisites, getAllPostrequisites } from '../utils/courseUtils';

import Semester from "../components/Semester";
import DegreeTotals from '../components/DegreeTotals';
import TrashZone from '../components/TrashZone';
import NewSemesterModal from '../components/NewSemesterModal';
import MiniExploreModal from '../components/MiniExploreModal';
import type { CourseData, CourseHighlightState, CourseRelationships } from '../types/database';

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
  onAddToSemester: (course: CourseData, semesterId: string) => void;
  isLoading?: boolean;
  coursePrereqs?: { courseId: number; prereqLogic: any }[];
}

const SEASON_ORDER: Record<string, number> = {
  'SPRING': 0,
  'SP': 0,
  'SUMMER': 1,
  'SU': 1,
  'FALL': 2,
  'FA': 2,
  'WINTER': 3,
  'WI': 3
};

const Plan = ({ 
  semestersData, 
  setSemestersData, 
  userId,
  semesterIds,
  courseIds,
  setCourseIds,
  onAddToSemester,
  isLoading = false,
  coursePrereqs = []
}: PlanProps) => {
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [isNewSemesterModalOpen, setIsNewSemesterModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [courseRelationships, setCourseRelationships] = useState<Map<string, CourseRelationships>>(new Map());
  const [courseHighlights, setCourseHighlights] = useState<Map<string, CourseHighlightState>>(new Map());

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
              const courseToMove = semesterData.coursecards[draggedCourseCardIndex];
              const courseId = courseIds[draggedCourseCardId];

              if (!courseId) {
                console.error('Could not find course ID for:', draggedCourseCardId);
                return;
              }

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
              const courseToMove = semesterData.coursecards[draggedCourseCardIndex];
              const courseId = courseIds[draggedCourseCardId];

              if (!courseId) {
                console.error('Could not find course ID for:', draggedCourseCardId);
                return;
              }

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
    if (!userId) return;

    // Queue the delete operation in the database
    dbQueue.addOperation({
      type: 'DELETE_SEMESTER',
      payload: {
        userId,
        semesterId
      }
    });

    // Update UI state
    setSemestersData(prev => {
      const newData = { ...prev };
      delete newData[semesterId];
      return newData;
    });
  };

  const toggleSemesterCompletion = (semesterId: string) => {
    if (!userId) return;

    const currentCompleted = semestersData[semesterId].completed;

    // Queue the completion status update in the database
    dbQueue.addOperation({
      type: 'UPDATE_SEMESTER_COMPLETION',
      payload: {
        userId,
        semesterId,
        complete: !currentCompleted
      }
    });

    // Update UI state
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
    if (!selectedSemesterId || !onAddToSemester) return;
    // console.log("Plan - handleCourseSelect - course:", course);
    onAddToSemester(course, selectedSemesterId);
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
    // Find which semester contains this course
    let semesterId: string | null = null;
    Object.entries(semestersData).forEach(([id, semester]) => {
      if (semester.coursecards.some(course => course.id === courseId)) {
        semesterId = id;
      }
    });

    if (!semesterId || !userId) return;

    // Remove from database
    const numericCourseId = courseIds[courseId];
    if (!numericCourseId) {
      console.error('Could not find course ID for:', courseId);
      return;
    }

    // Queue the remove operation
    dbQueue.addOperation({
      type: 'REMOVE_COURSE',
      payload: {
        userId,
        semesterId,
        courseId: numericCourseId
      }
    });

    // Update UI
    setSemestersData(prev => {
      const newData = { ...prev };
      Object.entries(newData).forEach(([id, semester]) => {
        if (semester && semester.coursecards) {
          newData[id] = {
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

  // Update course relationships when courses change
  useEffect(() => {
    const allCourses = Object.values(semestersData).flatMap(semester => 
      semester.coursecards.map(course => ({
        id: courseIds[course.id]?.toString() || '',
        subject: course.subject,
        number: course.number
      }))
    );

    const relationships = buildCourseRelationships(allCourses, coursePrereqs);
    setCourseRelationships(relationships);
  }, [semestersData, courseIds, coursePrereqs]);

  const handleCourseHover = (hoveredCourseCode: string | null) => {
    if (!hoveredCourseCode) {
      setCourseHighlights(new Map());
      return;
    }

    const newHighlights = new Map<string, CourseHighlightState>();
    const relationships = courseRelationships.get(hoveredCourseCode);

    if (relationships) {
      // Get all recursive prerequisites and postrequisites
      const allPrereqs = getAllPrerequisites(hoveredCourseCode, courseRelationships);
      const allPostreqs = getAllPostrequisites(hoveredCourseCode, courseRelationships);

      // Set highlights for all prerequisites
      allPrereqs.forEach(prereq => {
        newHighlights.set(prereq, {
          isPrereq: true,
          isPostreq: false,
          isCoreq: false
        });
      });

      // Set highlights for all postrequisites
      allPostreqs.forEach(postreq => {
        newHighlights.set(postreq, {
          isPrereq: false,
          isPostreq: true,
          isCoreq: false
        });
      });

      // Set highlights for corequisites
      relationships.corequisites.forEach(coreq => {
        newHighlights.set(coreq, {
          isPrereq: false,
          isPostreq: false,
          isCoreq: true
        });
      });
    }

    setCourseHighlights(newHighlights);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading your course plan...</p>
        </div>
      </div>
    );
  }

  // Sort semesters by year and season
  const sortedSemesters = Object.values(semestersData).sort((a, b) => {
    // Use plan_name which is in format "Fall 2024" or "Fa 2024"
    const [aSeasonStr, aYearStr] = a.name.split(' ');
    const [bSeasonStr, bYearStr] = b.name.split(' ');
    const aYear = parseInt(aYearStr);
    const bYear = parseInt(bYearStr);
    
    // Primary sort by year
    if (aYear !== bYear) {
      return aYear - bYear;
    }
    
    // Secondary sort by season within the same year using calendar order
    const aOrder = SEASON_ORDER[aSeasonStr.toUpperCase()];
    const bOrder = SEASON_ORDER[bSeasonStr.toUpperCase()];
    
    if (aOrder === undefined || bOrder === undefined) {
      console.error('Unknown season format:', aSeasonStr, 'or', bSeasonStr);
      return 0;
    }
    
    return aOrder - bOrder;
  });

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
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors duration-200"
        >
          Add Semester
        </button>
      </div>
      {Object.keys(semestersData).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
          <p className="text-lg text-gray-600 dark:text-gray-300">You haven't added any semesters yet.</p>
          <button
            onClick={() => setIsNewSemesterModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors duration-200"
          >
            Add Your First Semester
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedSemesters.map((semester) => (
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
              courseIds={courseIds}
              courseHighlights={courseHighlights}
              onCourseHover={handleCourseHover}
            />
          ))}
        </div>
      )}
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
          semesterId={selectedSemesterId}
        />
      )}
    </div>
  );
};

export default Plan;