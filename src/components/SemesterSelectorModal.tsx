import { useState } from 'react';

interface Semester {
  id: string;
  name: string;
}

interface SemesterSelectorModalProps {
  semesters: Semester[];
  onSelect: (semesterId: string) => void;
  onClose: () => void;
}

const SemesterSelectorModal = ({ semesters, onSelect, onClose }: SemesterSelectorModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Select Semester
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {semesters.map((semester) => (
              <button
                key={semester.id}
                onClick={() => {
                  onSelect(semester.id);
                  onClose();
                }}
                className="w-full p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <span className="text-gray-900 dark:text-gray-100">{semester.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemesterSelectorModal; 