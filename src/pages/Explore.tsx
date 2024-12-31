import { useState, useEffect, useCallback } from 'react';


import { searchCourses, getSubjects } from '../lib/supabase';
import CourseExplorerCard from '../components/CourseExplorerCard';
import type { CourseData } from '../types/database';  
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type { Database } from '../types/supabase';


type Subject = Database['public']['Tables']['subjects']['Row'];

const ITEMS_PER_PAGE = 50;

interface ExploreProps {
  semesters?: { id: string; name: string; }[];
  onAddToSemester?: (courseData: CourseData, semesterId: string) => void;
}

const Explore = ({ semesters, onAddToSemester }: ExploreProps) => {
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
      // console.log('Loaded subjects:', data);
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

  // Initialize infinite scroll
  useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: courses.length < totalCount,
  });

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
    setCourses([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Course Explorer</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Search courses by keywords..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Tip: Use multiple keywords to narrow down results
          </p>
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

      {/* Results count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {courses.length} of {totalCount} courses
        {selectedSubject && (
          <span> in <span className="font-semibold">{selectedSubject}</span></span>
        )}
      </div>

      {loading && courses.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courses.map((course) => (
            <CourseExplorerCard
              key={`${course.subject}${course.number}`}
              course={course}
              semesters={semesters}
              onAddToSemester={onAddToSemester}
            />
          ))}
          {loading && courses.length > 0 && (
            <div className="col-span-2 flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Explore; 