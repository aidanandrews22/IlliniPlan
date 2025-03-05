import { useState, useEffect } from 'react';
import { getTerms } from '../lib/supabase';

interface NewSemesterModalProps {
  onClose: () => void;
  onSubmit: (termSeason: string, year: number) => void;
  existingSemesters: { id: string; name: string }[];
}

// Map UI-friendly terms to database season codes
const SEASON_MAP: Record<string, string> = {
  'Fall': 'fa',
  'Spring': 'sp',
  'Summer': 'su',
  'Winter': 'wi',
};

const TERMS = ['Fall', 'Spring', 'Summer', 'Winter'];
const CURRENT_YEAR = new Date().getFullYear();

const NewSemesterModal = ({ onClose, onSubmit, existingSemesters }: NewSemesterModalProps) => {
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableTerms = async () => {
      try {
        setLoading(true);
        const { years } = await getTerms();
        
        // If no years are available from the database, use default range
        if (years.length === 0) {
          const defaultYears = Array.from(
            { length: 6 }, 
            (_, i) => (CURRENT_YEAR - 4) + i
          );
          setAvailableYears(defaultYears);
        } else {
          // Use available years from database
          setAvailableYears(years);
          
        }
      } catch (err) {
        console.error('Error fetching terms:', err);
        // Fallback to default years if there's an error
        const defaultYears = Array.from(
          { length: 6 }, 
          (_, i) => (CURRENT_YEAR - 4) + i
        );
        setAvailableYears(defaultYears);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableTerms();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert UI-friendly term to database season code
    const seasonCode = SEASON_MAP[selectedTerm];
    
    // Check if semester already exists using the format in your existingSemesters array
    const semesterId = `${selectedTerm.toUpperCase()}${selectedYear}`;
    
    if (existingSemesters.some(sem => sem.id === semesterId)) {
      setError(`${selectedTerm} ${selectedYear} already exists`);
      return;
    }

    // Pass the season code instead of the display term
    onSubmit(seasonCode, selectedYear);
    onClose();
  };

  const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTerm(e.target.value);
    setError(null);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(Number(e.target.value));
    setError(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <p className="text-center text-gray-700 dark:text-gray-300">Loading available terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Add New Semester
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Term
              </label>
              <select
                value={selectedTerm}
                onChange={handleTermChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TERMS.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors duration-200"
              >
                Add Semester
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewSemesterModal;