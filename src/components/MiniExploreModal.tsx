import { useState, useEffect, useCallback } from 'react';
import { searchCourses, getSubjects } from '../lib/supabase';
import type { CourseData } from '../types/database';
import type { Database } from '../types/supabase';

type Subject = Database['public']['Tables']['subjects']['Row'];

interface MiniExploreModalProps {
  onClose: () => void;
  onSelectCourse: (course: CourseData) => void;
  title?: string;
  semesterId: string;
}

const ITEMS_PER_PAGE = 20;

const MiniExploreModal = ({ onClose, onSelectCourse, title = 'Add Course', semesterId }: MiniExploreModalProps) => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      const data = await getSubjects();
      setSubjects(data);
      setFilteredSubjects(data);
      setLoadingSubjects(false);
    };
    loadSubjects();
  }, []);

  // Filter subjects based on search
  useEffect(() => {
    if (!subjectSearchQuery.trim()) {
      setFilteredSubjects(subjects);
      return;
    }
    const filtered = subjects.filter(subject =>
      subject.subject?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    );
    setFilteredSubjects(filtered);
  }, [subjectSearchQuery, subjects]);

  // Load courses based on search query and selected subject
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const searchTerm = searchQuery.trim();
        const { data, count } = await searchCourses(searchTerm, 1, ITEMS_PER_PAGE, selectedSubject);
        setCourses(data);
        setTotalCount(count);
        setPage(1);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(loadCourses, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, selectedSubject]);

  // Load more courses
  const loadMore = useCallback(async () => {
    if (loading || courses.length >= totalCount) return;
    
    const nextPage = page + 1;
    try {
      const searchTerm = searchQuery.trim();
      const { data } = await searchCourses(searchTerm, nextPage, ITEMS_PER_PAGE, selectedSubject);
      setCourses(prev => [...prev, ...data]);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more courses:', error);
    }
  }, [loading, courses.length, totalCount, page, searchQuery, selectedSubject]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Search courses by keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Subject Filter */}
            <div className="w-full md:w-64 relative">
              <input
                type="text"
                placeholder="Search subjects..."
                value={isSubjectDropdownOpen ? subjectSearchQuery : selectedSubject || ''}
                onChange={(e) => {
                  setSubjectSearchQuery(e.target.value);
                  setIsSubjectDropdownOpen(true);
                }}
                onFocus={() => {
                  setIsSubjectDropdownOpen(true);
                  setSubjectSearchQuery('');
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {isSubjectDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div 
                    className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      setSelectedSubject('');
                      setSubjectSearchQuery('');
                      setIsSubjectDropdownOpen(false);
                    }}
                  >
                    All Subjects
                  </div>
                  {loadingSubjects ? (
                    <div className="p-2 text-center text-gray-500">Loading subjects...</div>
                  ) : (
                    filteredSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setSelectedSubject(subject.subject || '');
                          setSubjectSearchQuery('');
                          setIsSubjectDropdownOpen(false);
                        }}
                      >
                        {subject.subject}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && courses.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {courses.map((course) => (
                <div
                  key={`${course.subject}${course.number}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => {
                    onSelectCourse(course);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {course.subject} {course.number}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mt-1">
                        {course.title}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {course.credit_hours}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {course.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiniExploreModal; 