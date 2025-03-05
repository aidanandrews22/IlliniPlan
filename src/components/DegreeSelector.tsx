import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DegreeSelectorProps {
  userId?: number;
  onDegreeSelect: (degree: string) => void;
  initialDegree?: string;
}

interface Degree {
  id: string;
  name: string;
  department: string;
  type: 'BS' | 'BA' | 'MS' | 'PhD';
}

const DegreeSelector = ({ userId, onDegreeSelect, initialDegree }: DegreeSelectorProps) => {
  const [selectedDegree, setSelectedDegree] = useState<string>(initialDegree || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock degrees data - in a real app, this would be fetched from the database
  const mockDegrees: Degree[] = [
    { id: 'cs-bs', name: 'Computer Science', department: 'Computer Science', type: 'BS' },
    { id: 'phys-bs', name: 'Physics', department: 'Physics', type: 'BS' }
  ];

  // Initialize with the initialDegree prop if provided
  useEffect(() => {
    if (initialDegree) {
      // Find the degree ID that corresponds to the formatted degree name
      const degree = mockDegrees.find(d => `${d.name}, ${d.type}` === initialDegree);
      if (degree) {
        setSelectedDegree(degree.id);
      }
    }
  }, [initialDegree]);

  // Filter degrees based on search query
  const filteredDegrees = searchQuery.trim() === '' 
    ? mockDegrees 
    : mockDegrees.filter(degree => 
        degree.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        degree.department.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleDegreeChange = (degreeId: string) => {
    setSelectedDegree(degreeId);
    
    // Find the selected degree
    const degree = mockDegrees.find(d => d.id === degreeId);
    if (degree) {
      // Format the degree name for display (e.g., "Computer Science, BS")
      const formattedDegreeName = `${degree.name}, ${degree.type}`;
      onDegreeSelect(formattedDegreeName);
      
      // In a real app, save to the database
      if (userId) {
        saveUserPreference(userId, 'selectedDegree', formattedDegreeName);
      }
    }
  };

  // Function to save user preference to the database
  const saveUserPreference = async (userId: number, key: string, value: string) => {
    try {
      // Get current preferences
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', userId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching user preferences:', fetchError);
        return;
      }
      
      // Update preferences
      const currentPreferences = userData?.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        [key]: value
      };
      
      // Save back to database
      const { error: updateError } = await supabase
        .from('users')
        .update({ preferences: updatedPreferences })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating user preferences:', updateError);
      }
    } catch (error) {
      console.error('Unexpected error saving user preference:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Your Degree</h3>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search for a degree..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="max-h-60 overflow-y-auto">
        {filteredDegrees.length > 0 ? (
          <div className="space-y-2">
            {filteredDegrees.map((degree) => (
              <div 
                key={degree.id}
                onClick={() => handleDegreeChange(degree.id)}
                className={`p-3 rounded-md cursor-pointer transition-colors
                          ${selectedDegree === degree.id 
                            ? 'bg-blue-100 dark:bg-blue-900 border-blue-500' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent'
                          } border`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="degree"
                    id={`degree-${degree.id}`}
                    checked={selectedDegree === degree.id}
                    onChange={() => handleDegreeChange(degree.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <label 
                    htmlFor={`degree-${degree.id}`}
                    className="ml-3 block text-gray-900 dark:text-gray-100 cursor-pointer"
                  >
                    <span className="font-medium">{degree.name}, {degree.type}</span>
                    <span className="text-sm block text-gray-500 dark:text-gray-400">
                      {degree.department}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 text-gray-500 dark:text-gray-400">
            No degrees match your search.
          </div>
        )}
      </div>
      
      {selectedDegree && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Selected: <span className="font-medium text-gray-900 dark:text-gray-100">
              {mockDegrees.find(d => d.id === selectedDegree)?.name}, 
              {mockDegrees.find(d => d.id === selectedDegree)?.type}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default DegreeSelector; 