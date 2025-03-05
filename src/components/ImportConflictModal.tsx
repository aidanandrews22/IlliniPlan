import { useState } from 'react';

interface SemesterConflict {
  semester: string;
  existingCourseCount: number;
  importCourseCount: number;
}

interface ImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (strategy: 'merge' | 'replace') => void;
  conflicts: SemesterConflict[];
}

const ImportConflictModal = ({ isOpen, onClose, onConfirm, conflicts }: ImportConflictModalProps) => {
  const [importStrategy, setImportStrategy] = useState<'merge' | 'replace'>('merge');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Import Conflict Detected
        </h2>
        
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Some of the semesters you are importing already contain courses in your plan.
          How would you like to handle this?
        </p>
        
        {conflicts.length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-auto max-h-64">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Affected Semesters:</h3>
            <ul className="text-sm divide-y divide-gray-200 dark:divide-gray-600">
              {conflicts.map((conflict, index) => (
                <li key={index} className="py-2">
                  <span className="font-medium">{conflict.semester}</span>
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    <div>Existing courses: {conflict.existingCourseCount}</div>
                    <div>Importing: {conflict.importCourseCount}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="space-y-3 mb-6">
          <label className="flex items-start">
            <input 
              type="radio"
              className="mt-1 text-primary focus:ring-primary" 
              name="importStrategy"
              checked={importStrategy === 'merge'}
              onChange={() => setImportStrategy('merge')}
            />
            <div className="ml-3">
              <span className="text-gray-800 dark:text-gray-200 font-medium block">Merge Courses</span>
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                Add imported courses to your existing semesters, keeping all your current courses.
              </span>
            </div>
          </label>
          
          <label className="flex items-start">
            <input 
              type="radio"
              className="mt-1 text-primary focus:ring-primary" 
              name="importStrategy"
              checked={importStrategy === 'replace'}
              onChange={() => setImportStrategy('replace')}
            />
            <div className="ml-3">
              <span className="text-gray-800 dark:text-gray-200 font-medium block">Replace Semesters</span>
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                Replace existing courses with imported courses for affected semesters.
                <span className="text-red-500 dark:text-red-400 font-medium block mt-1">
                  Warning: This will remove existing courses in these semesters.
                </span>
              </span>
            </div>
          </label>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(importStrategy)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            Continue Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportConflictModal; 