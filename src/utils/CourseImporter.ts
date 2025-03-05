import { 
  getOrCreateSemesterPlan, 
  addCourseToSemesterPlan, 
  getCourseForImport,
  getUserSemesterPlans,
  removeCourseFromSemesterPlan,
  getSemesterPlanCourses
} from '../lib/supabase';

// Type for parsed import data
interface ImportedSemester {
  semester: string;
  courses: ImportedCourse[];
}

interface ImportedCourse {
  subject: string;
  number: string;
  name: string;
}

interface SemesterConflict {
  semester: string;
  seasonCode: 'fa' | 'sp' | 'su' | 'wi';
  year: number;
  planId: number;
  existingCourseCount: number;
  importCourseCount: number;
}

/**
 * CourseImporter - Utility for importing course data from various formats
 */
export const CourseImporter = {
  // Parse from JSON format
  parseJSON: (jsonContent: string): ImportedSemester[] => {
    try {
      const data = JSON.parse(jsonContent);
      
      // Validate the data structure
      if (!Array.isArray(data)) {
        throw new Error('Invalid JSON format: Expected an array');
      }
      
      return data.map(semester => {
        if (!semester.semester || !Array.isArray(semester.courses)) {
          throw new Error('Invalid semester format in JSON');
        }
        
        // Convert abbreviated semester format if needed
        let semesterName = semester.semester;
        const abbrMatch = semesterName.match(/^(Fa|Sp|Su|Wi)\s+(\d{4})$/);
        if (abbrMatch) {
          const [, seasonAbbr, year] = abbrMatch;
          const seasonMap: Record<string, string> = {
            'Fa': 'Fall',
            'Sp': 'Spring',
            'Su': 'Summer',
            'Wi': 'Winter'
          };
          
          semesterName = `${seasonMap[seasonAbbr]} ${year}`;
        }
        
        return {
          semester: semesterName,
          courses: semester.courses.map((course: { subject: string; number: string; name?: string }) => {
            if (!course.subject || !course.number) {
              throw new Error('Invalid course format in JSON');
            }
            
            return {
              subject: course.subject,
              number: course.number,
              name: course.name || ''
            };
          })
        };
      });
    } catch (error) {
      console.error('Error parsing JSON:', error);
      throw error;
    }
  },
  
  // Parse from CSV format
  parseCSV: (csvContent: string): ImportedSemester[] => {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file is empty or missing headers');
      }
      
      const headers = lines[0].split(',');
      const semesterIndex = headers.indexOf('semester');
      const subjectIndex = headers.indexOf('subject');
      const numberIndex = headers.indexOf('number');
      const nameIndex = headers.indexOf('name');
      
      if (semesterIndex === -1 || subjectIndex === -1 || numberIndex === -1) {
        throw new Error('CSV is missing required headers (semester, subject, number)');
      }
      
      // Group by semester
      const semesterMap = new Map<string, ImportedCourse[]>();
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => 
          // Remove quotes if they exist
          value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value
        );
        
        let semesterName = values[semesterIndex];
        const subject = values[subjectIndex];
        const number = values[numberIndex];
        const name = nameIndex !== -1 ? values[nameIndex] : '';
        
        if (!semesterName || !subject || !number) {
          console.warn(`Skipping line ${i + 1} due to missing required fields`);
          continue;
        }
        
        // Convert abbreviated semester format if needed (e.g., "Fa 2023" to "Fall 2023")
        const abbrMatch = semesterName.match(/^(Fa|Sp|Su|Wi)\s+(\d{4})$/);
        if (abbrMatch) {
          const [, seasonAbbr, year] = abbrMatch;
          const seasonMap: Record<string, string> = {
            'Fa': 'Fall',
            'Sp': 'Spring',
            'Su': 'Summer',
            'Wi': 'Winter'
          };
          
          semesterName = `${seasonMap[seasonAbbr]} ${year}`;
        }
        
        if (!semesterMap.has(semesterName)) {
          semesterMap.set(semesterName, []);
        }
        
        semesterMap.get(semesterName)!.push({
          subject,
          number,
          name
        });
      }
      
      // Convert map to array
      return Array.from(semesterMap.entries()).map(([semester, courses]) => ({
        semester,
        courses
      }));
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw error;
    }
  },
  
  // Parse Python format
  parsePython: (pythonContent: string): ImportedSemester[] => {
    try {
      // Extract the dictionary content between braces
      const match = pythonContent.match(/courses\s*=\s*{([\s\S]*)}/);
      if (!match || !match[1]) {
        throw new Error('Invalid Python format');
      }
      
      const dictContent = match[1];
      const results: ImportedSemester[] = [];
      
      // Parse each semester entry
      const semesterMatches = dictContent.matchAll(/'([^']+)':\s*\[([\s\S]*?)\],/g);
      
      for (const semesterMatch of semesterMatches) {
        let semesterName = semesterMatch[1];
        const coursesStr = semesterMatch[2];
        
        // Convert abbreviated semester format if needed
        const abbrMatch = semesterName.match(/^(Fa|Sp|Su|Wi)\s+(\d{4})$/);
        if (abbrMatch) {
          const [, seasonAbbr, year] = abbrMatch;
          const seasonMap: Record<string, string> = {
            'Fa': 'Fall',
            'Sp': 'Spring',
            'Su': 'Summer',
            'Wi': 'Winter'
          };
          
          semesterName = `${seasonMap[seasonAbbr]} ${year}`;
        }
        
        // Parse the courses for this semester
        const courseMatches = coursesStr.matchAll(/{'subject':\s*'([^']*)',\s*'number':\s*'([^']*)',\s*'name':\s*'([^']*)'},/g);
        const courses: ImportedCourse[] = [];
        
        for (const courseMatch of courseMatches) {
          courses.push({
            subject: courseMatch[1],
            number: courseMatch[2],
            name: courseMatch[3]
          });
        }
        
        results.push({
          semester: semesterName,
          courses
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error parsing Python:', error);
      throw error;
    }
  },
  
  // Parse HTML format - simplistic approach that works with our export format
  parseHTML: (htmlContent: string): ImportedSemester[] => {
    try {
      const results: ImportedSemester[] = [];
      
      // Match semester headings and their tables
      const semesterSections = htmlContent.match(/<h2>(.*?)<\/h2>[\s\S]*?<table>[\s\S]*?<\/table>/g);
      if (!semesterSections || semesterSections.length === 0) {
        throw new Error('No semester sections found in HTML');
      }
      
      for (const section of semesterSections) {
        // Extract semester name
        const semesterMatch = section.match(/<h2>(.*?)<\/h2>/);
        if (!semesterMatch) continue;
        
        // Convert abbreviated semester name to full name if needed
        let semesterName = semesterMatch[1];
        
        // Check if this is an abbreviated semester format (e.g., "Fa 2023")
        const abbrMatch = semesterName.match(/^(Fa|Sp|Su|Wi)\s+(\d{4})$/);
        if (abbrMatch) {
          // Convert to full name
          const [, seasonAbbr, year] = abbrMatch;
          const seasonMap: Record<string, string> = {
            'Fa': 'Fall',
            'Sp': 'Spring',
            'Su': 'Summer',
            'Wi': 'Winter'
          };
          
          semesterName = `${seasonMap[seasonAbbr]} ${year}`;
        }
        
        // Extract course rows
        const courseRows = section.match(/<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/g);
        if (!courseRows || courseRows.length === 0) continue;
        
        const courses: ImportedCourse[] = [];
        for (const row of courseRows) {
          const cells = row.match(/<td>(.*?)<\/td>/g);
          if (!cells || cells.length < 3) continue;
          
          const subject = cells[0].replace(/<\/?td>/g, '');
          const number = cells[1].replace(/<\/?td>/g, '');
          const name = cells[2].replace(/<\/?td>/g, '');
          
          if (subject && number) {
            courses.push({ subject, number, name });
          }
        }
        
        if (courses.length > 0) {
          results.push({
            semester: semesterName,
            courses
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error parsing HTML:', error);
      throw error;
    }
  },
  
  // Parse markdown format
  parseMarkdown: (mdContent: string): ImportedSemester[] => {
    try {
      const results: ImportedSemester[] = [];
      
      // Split content by semester sections
      const semesterSections = mdContent.split(/^## /m).slice(1); // Skip the first split which is before any header
      
      for (const section of semesterSections) {
        const lines = section.trim().split('\n');
        if (lines.length === 0) continue;
        
        // Get semester name from the first line
        let semesterName = lines[0].trim();
        
        // Check if this is an abbreviated semester format
        const abbrMatch = semesterName.match(/^(Fa|Sp|Su|Wi)\s+(\d{4})$/);
        if (abbrMatch) {
          const [, seasonAbbr, year] = abbrMatch;
          const seasonMap: Record<string, string> = {
            'Fa': 'Fall',
            'Sp': 'Spring',
            'Su': 'Summer',
            'Wi': 'Winter'
          };
          
          semesterName = `${seasonMap[seasonAbbr]} ${year}`;
        }
        
        const courses: ImportedCourse[] = [];
        
        // Look for table rows
        // Skip header and separator rows
        let tableStartIndex = lines.findIndex(line => line.includes('| Subject | Number | Course Name |'));
        if (tableStartIndex !== -1) {
          // Skip the separator line
          tableStartIndex += 2;
          
          // Parse table rows
          for (let i = tableStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('|') || !line.endsWith('|')) break;
            
            const cells = line.split('|').map(cell => cell.trim()).filter(Boolean);
            if (cells.length >= 3) {
              courses.push({
                subject: cells[0],
                number: cells[1],
                name: cells[2]
              });
            }
          }
        }
        
        if (courses.length > 0) {
          results.push({
            semester: semesterName,
            courses
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error parsing Markdown:', error);
      throw error;
    }
  },
  
  // Main import function
  parseImport: (content: string, format: string): ImportedSemester[] => {
    switch (format.toLowerCase()) {
      case 'json':
        return CourseImporter.parseJSON(content);
      case 'csv':
        return CourseImporter.parseCSV(content);
      case 'python':
        return CourseImporter.parsePython(content);
      case 'html':
        return CourseImporter.parseHTML(content);
      case 'markdown':
      case 'md':
        return CourseImporter.parseMarkdown(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  },
  
  // Parse the semester name into year and season components
  parseSemesterName: (semesterName: string): { seasonName: string; year: number } | null => {
    // Try full name format first (e.g., "Fall 2023")
    let parts = semesterName.match(/^(Fall|Spring|Summer|Winter)\s+(\d{4})$/i);
    
    if (!parts) {
      // Try abbreviated format (e.g., "Fa 2023")
      parts = semesterName.match(/^(Fa|Sp|Su|Wi)\s+(\d{4})$/i);
      
      if (parts) {
        // Convert abbreviated to full name
        const [, seasonAbbr, yearStr] = parts;
        const seasonMap: Record<string, string> = {
          'fa': 'Fall',
          'sp': 'Spring',
          'su': 'Summer',
          'wi': 'Winter',
          'Fa': 'Fall',
          'Sp': 'Spring',
          'Su': 'Summer',
          'Wi': 'Winter'
        };
        
        return {
          seasonName: seasonMap[seasonAbbr],
          year: parseInt(yearStr)
        };
      }
      
      return null;
    }
    
    return {
      seasonName: parts[1],
      year: parseInt(parts[2])
    };
  },
  
  // Check for conflicts between imported data and existing semesters
  checkForConflicts: async (parsedData: ImportedSemester[], userId: number): Promise<SemesterConflict[]> => {
    const conflicts: SemesterConflict[] = [];
    
    try {
      // Get all existing semester plans for the user
      const userSemesters = await getUserSemesterPlans(userId);
      
      for (const semester of parsedData) {
        // Parse the semester name
        const parsedSemester = CourseImporter.parseSemesterName(semester.semester);
        if (!parsedSemester) continue;
        
        const { seasonName, year } = parsedSemester;
        
        // Map season to code
        const seasonMap: Record<string, 'fa' | 'sp' | 'su' | 'wi'> = {
          'Fall': 'fa',
          'Spring': 'sp',
          'Summer': 'su',
          'Winter': 'wi'
        };
        
        const seasonCode = seasonMap[seasonName] as 'fa' | 'sp' | 'su' | 'wi';
        if (!seasonCode) continue;
        
        // Find matching existing semester
        const existingSemester = userSemesters.find(s => 
          s.terms.season === seasonCode && s.terms.year === year
        );
        
        if (existingSemester) {
          // Get existing courses for this semester
          const existingCourses = await getSemesterPlanCourses(existingSemester.id);
          
          if (existingCourses.length > 0) {
            conflicts.push({
              semester: semester.semester,
              seasonCode,
              year,
              planId: existingSemester.id,
              existingCourseCount: existingCourses.length,
              importCourseCount: semester.courses.length
            });
          }
        }
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      return [];
    }
  },
  
  // Import courses to the database with conflict strategy
  importCourses: async (
    parsedData: ImportedSemester[], 
    userId: number,
    conflictStrategy: 'merge' | 'replace' = 'merge'
  ): Promise<{
    success: boolean;
    message: string;
    importedSemesters: string[];
    importedCourses: number;
    errors: string[];
  }> => {
    const result = {
      success: false,
      message: '',
      importedSemesters: [] as string[],
      importedCourses: 0,
      errors: [] as string[]
    };
    
    try {
      // If replacing, get existing semesters to clear first
      const semestersToProcess = new Set<string>();
      
      for (const semester of parsedData) {
        semestersToProcess.add(semester.semester);
      }
      
      // Clear existing courses from semesters if replacing
      if (conflictStrategy === 'replace') {
        // Get conflicts first
        const conflicts = await CourseImporter.checkForConflicts(parsedData, userId);
        
        // Clear courses from conflicting semesters
        for (const conflict of conflicts) {
          try {
            // Get existing courses
            const existingCourses = await getSemesterPlanCourses(conflict.planId);
            
            // Remove each course
            for (const course of existingCourses) {
              await removeCourseFromSemesterPlan(conflict.planId, course.course_id);
            }
            
            // Log success
            result.message += `Cleared ${existingCourses.length} existing courses from ${conflict.semester}. `;
          } catch (error) {
            result.errors.push(`Failed to clear existing courses from ${conflict.semester}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      // Now process each semester
      for (const semester of parsedData) {
        // Parse the semester name
        const parsedSemester = CourseImporter.parseSemesterName(semester.semester);
        if (!parsedSemester) {
          result.errors.push(`Invalid semester format: ${semester.semester}. Expected "Season YYYY" or abbreviated "Se YYYY"`);
          continue;
        }
        
        const { seasonName, year } = parsedSemester;
        
        // Map season to code
        const seasonMap: Record<string, 'fa' | 'sp' | 'su' | 'wi'> = {
          'Fall': 'fa',
          'Spring': 'sp',
          'Summer': 'su',
          'Winter': 'wi'
        };
        
        const season = seasonMap[seasonName] as 'fa' | 'sp' | 'su' | 'wi';
        if (!season) {
          result.errors.push(`Unknown season: ${seasonName}`);
          continue;
        }
        
        // Create or get the semester plan
        const semesterPlan = await getOrCreateSemesterPlan(userId, year, season);
        if (!semesterPlan) {
          result.errors.push(`Failed to create semester plan for ${semester.semester}`);
          continue;
        }
        
        result.importedSemesters.push(semester.semester);
        
        // Add courses to the semester
        for (const course of semester.courses) {
          try {
            // Find the course in the database using the new import-specific function
            const dbCourse = await getCourseForImport(course.subject, course.number);
            if (!dbCourse) {
              result.errors.push(`Course not found: ${course.subject} ${course.number}`);
              continue;
            }
            
            // Add the course to the semester plan
            const courseAdded = await addCourseToSemesterPlan(semesterPlan.id, dbCourse.id);
            if (courseAdded) {
              result.importedCourses++;
            } else {
              result.errors.push(`Failed to add course ${course.subject} ${course.number} to ${semester.semester}`);
            }
          } catch (error) {
            // Handle errors from getCourseForImport or addCourseToSemesterPlan
            result.errors.push(`Error processing course ${course.subject} ${course.number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            continue;
          }
        }
      }
      
      result.success = result.importedCourses > 0;
      result.message = result.success 
        ? `Successfully imported ${result.importedCourses} courses across ${result.importedSemesters.length} semesters.`
        : 'Failed to import any courses.';
      
      return result;
    } catch (error) {
      console.error('Error importing courses:', error);
      result.success = false;
      result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  },
  
  // Upload handler that processes a file and returns parsed data
  handleFileUpload: async (file: File): Promise<{
    content: string;
    format: string;
    fileName: string;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        const content = event.target.result as string;
        
        // Determine format from file extension
        const fileName = file.name;
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        
        // Map extension to format
        const formatMap: Record<string, string> = {
          'json': 'json',
          'csv': 'csv',
          'py': 'python',
          'html': 'html',
          'htm': 'html',
          'md': 'markdown',
          'markdown': 'markdown'
        };
        
        const format = formatMap[extension] || '';
        
        if (!format) {
          reject(new Error(`Unsupported file format: ${extension}`));
          return;
        }
        
        resolve({
          content,
          format,
          fileName
        });
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }
}; 