import Profile from '../components/Profile';
import { useState, useRef, useEffect } from 'react';
import { CourseExporter } from '../utils/CourseExporter';
import { CourseImporter } from '../utils/CourseImporter';
import { SemestersData } from './Plan';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import ImportConflictModal from '../components/ImportConflictModal';
import DegreeSelector from '../components/DegreeSelector';
import { getSelectedDegree, getUserPreferences, updateUserPreferences } from '../lib/supabase';
interface SettingsProps {
  semestersData?: SemestersData;
  setSemestersData?: (data: SemestersData) => void;
  userPreferences?: any;
}

interface SemesterConflict {
  semester: string;
  seasonCode: 'fa' | 'sp' | 'su' | 'wi';
  year: number;
  planId: number;
  existingCourseCount: number;
  importCourseCount: number;
}

const Settings = ({ semestersData = {}, setSemestersData, userPreferences }: SettingsProps) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  
  // Import conflict modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState<SemesterConflict[]>([]);
  const [pendingImportData, setPendingImportData] = useState<{
    parsedData: any[];
    userId: number;
  } | null>(null);
  
  // Import status state
  const [importStatus, setImportStatus] = useState<{
    isLoading: boolean;
    message: string;
    success?: boolean;
    details?: {
      importedSemesters: string[];
      importedCourses: number;
      errors: string[];
    };
  }>({
    isLoading: false,
    message: ''
  });

  // User preferences state
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<string>('');

  // Fetch user ID and preferences on component mount
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        // Get the userId from the Clerk ID
        const dbUserId = await getUserIdFromClerk();
        setUserId(dbUserId);
        
        // Initialize from userPreferences or fetch from database
        if (userPreferences?.selectedDegree) {
          setSelectedDegree(userPreferences.selectedDegree);
        } else {
          // Load the selected degree
          setSelectedDegree(await getSelectedDegree(user.id));
        }
      }
    };
    loadUserData();
  }, [user?.id, userPreferences]);

  // Handle clicks outside of the export menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExport = (format: string) => {
    CourseExporter.exportCourses(semestersData, format);
    setIsExportMenuOpen(false);
  };
  
  const handleImportClick = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) {
      return;
    }
    
    try {
      setImportStatus({
        isLoading: true,
        message: 'Processing file...'
      });
      
      // Get the user ID
      const userId = await getUserIdFromClerk();
      if (!userId) {
        setImportStatus({
          isLoading: false,
          success: false,
          message: 'User not found. Please log in again.'
        });
        return;
      }
      
      // Process the file
      const file = files[0];
      const { content, format } = await CourseImporter.handleFileUpload(file);
      
      // Parse the content based on the format
      const parsedData = CourseImporter.parseImport(content, format);
      
      setImportStatus({
        isLoading: true,
        message: `Checking for conflicts in ${parsedData.length} semesters...`
      });
      
      // Check for conflicts
      const importConflicts = await CourseImporter.checkForConflicts(parsedData, userId);
      
      if (importConflicts.length > 0) {
        // Store the parsed data for later use
        setPendingImportData({
          parsedData,
          userId
        });
        
        // Update conflict state
        setConflicts(importConflicts);
        
        // Show the conflict modal
        setShowConflictModal(true);
        
        // Update import status
        setImportStatus({
          isLoading: false,
          message: 'Import paused: Conflicts detected. Please choose how to proceed.'
        });
      } else {
        // No conflicts, proceed with import
        await processCourseImport(parsedData, userId);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        isLoading: false,
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleConflictResolution = async (strategy: 'merge' | 'replace') => {
    // Hide the modal
    setShowConflictModal(false);
    
    if (!pendingImportData) {
      setImportStatus({
        isLoading: false,
        success: false,
        message: 'Import failed: No pending import data found.'
      });
      return;
    }
    
    // Extract the stored data
    const { parsedData, userId } = pendingImportData;
    
    // Update status
    setImportStatus({
      isLoading: true,
      message: `Importing with ${strategy === 'merge' ? 'merge' : 'replace'} strategy...`
    });
    
    // Process the import with the chosen strategy
    await processCourseImport(parsedData, userId, strategy);
    
    // Clear pending data
    setPendingImportData(null);
  };
  
  const handleCancelImport = () => {
    // Hide the modal
    setShowConflictModal(false);
    
    // Clear pending data
    setPendingImportData(null);
    
    // Update status
    setImportStatus({
      isLoading: false,
      success: false,
      message: 'Import cancelled.'
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const processCourseImport = async (
    parsedData: any[], 
    userId: number, 
    conflictStrategy: 'merge' | 'replace' = 'merge'
  ) => {
    try {
      // Import the courses
      const result = await CourseImporter.importCourses(parsedData, userId, conflictStrategy);
      
      setImportStatus({
        isLoading: false,
        success: result.success,
        message: result.message,
        details: {
          importedSemesters: result.importedSemesters,
          importedCourses: result.importedCourses,
          errors: result.errors
        }
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh the semesters data if available
      if (result.success && setSemestersData) {
        // Show loading status while refreshing data
        setImportStatus(prev => ({
          ...prev,
          message: `${prev.message} Refreshing your course plan...`
        }));
        
        // Adding a slight delay to allow the database operations to complete
        setTimeout(() => {
          // Trigger a re-render by updating the parent component's state
          // This will cause the parent to re-fetch the data from the server
          setSemestersData({...semestersData});
          
          // Update import status
          setImportStatus(prev => ({
            ...prev,
            message: `${result.message} Your course plan has been refreshed.`
          }));
        }, 1500);
      }
    } catch (error) {
      console.error('Import processing error:', error);
      setImportStatus({
        isLoading: false,
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle degree selection
  const handleDegreeSelect = (degree: string) => {
    setSelectedDegree(degree);
    
    // Save the selected degree to the database if we have a userId
    if (userId) {
      // Get current preferences first
      getUserPreferences(userId).then(currentPreferences => {
        const updatedPreferences = {
          ...currentPreferences,
          selectedDegree: degree
        };
        
        // Update preferences in the database
        updateUserPreferences(userId, updatedPreferences).catch(error => {
          console.error('Error saving degree preference:', error);
        });
      }).catch(error => {
        console.error('Error getting current preferences:', error);
      });
    }
  };

  const getUserIdFromClerk = async () => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching user ID:', error);
        return null;
      }
      
      return data?.id;
    } catch (e) {
      console.error('Unexpected error getting user ID:', e);
      return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - User profile and exports */}
        <div className="lg:col-span-1 space-y-6">
          <Profile />
          
          {/* Export and Import section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Import & Export</h2>
            
            <div className="space-y-4">
              {/* Export button */}
              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Export Courses
                </button>
                
                {isExportMenuOpen && (
                  <div ref={exportMenuRef} className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <button 
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleExport('json')}
                    >
                      Export as JSON
                    </button>
                    <button 
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleExport('csv')}
                    >
                      Export as CSV
                    </button>
                  </div>
                )}
              </div>
              
              {/* Import button */}
              <button
                onClick={handleImportClick}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Import Courses
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".json,.csv"
              />
              
              {/* Import status */}
              {importStatus.message && (
                <div className={`mt-4 p-3 rounded-md ${
                  importStatus.success ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                  'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  <p className="font-medium">{importStatus.message}</p>
                  
                  {importStatus.details && (
                    <div className="mt-2 text-sm">
                      <p>Imported {importStatus.details.importedCourses} courses across {importStatus.details.importedSemesters.length} semesters:</p>
                      <ul className="list-disc list-inside mt-1">
                        {importStatus.details.importedSemesters.map((semester, idx) => (
                          <li key={idx}>{semester}</li>
                        ))}
                      </ul>
                      
                      {importStatus.details.errors.length > 0 && (
                        <>
                          <p className="mt-2 font-medium">Errors:</p>
                          <ul className="list-disc list-inside mt-1">
                            {importStatus.details.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right column - Academic settings and degree preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Degree selection */}
          <DegreeSelector 
            userId={userId || undefined} 
            onDegreeSelect={handleDegreeSelect} 
            initialDegree={selectedDegree}
          />
        </div>
      </div>
      
      {/* Import conflict modal */}
      {showConflictModal && (
        <ImportConflictModal
          isOpen={showConflictModal}
          conflicts={conflicts}
          onConfirm={handleConflictResolution}
          onClose={handleCancelImport}
        />
      )}
    </div>
  );
};

export default Settings; 