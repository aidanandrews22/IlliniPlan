import type { CourseData, PrereqLogic, CourseRelationships } from '../types/database';

// Gen Ed type definitions
type CSValue = 'US' | 'NW' | 'WCC' | 'False';
type HumValue = 'LA' | 'HP' | 'False';
type NatValue = 'PS' | 'LS' | 'False';
type QRValue = 'QR1' | 'QR2' | 'False';
type SBSValue = 'SS' | 'BSC' | 'False';

// Gen Ed descriptions
const genEdDescriptions: Record<string, string> = {
  'ACP': 'Advanced Composition',
  'US': 'US Minority Cultures',
  'NW': 'Non-Western Cultures',
  'WCC': 'Western/Comparative Cultures',
  'LA': 'Literature and the Arts',
  'HP': 'Historical and Philosophical Perspectives',
  'PS': 'Physical Sciences',
  'LS': 'Life Sciences',
  'QR1': 'Quantitative Reasoning 1',
  'QR2': 'Quantitative Reasoning 2',
  'SS': 'Social Sciences',
  'BSC': 'Behavioral Sciences'
};

export const formatCreditHours = (hours: string | null) => {
  if (!hours) return 'N/A';
  // Strip all characters except numbers and decimal points, then add 'hours' suffix
  // const cleanHours = hours.replace(/[^\d]/g, '');
  // const cleanHours = hours.replace(/[^\d-]/g, '');
  const cleanHours = hours.replace(/to/gi, '-').replace(/[^\d-]/g, '');


  return `${cleanHours} hours`;
};

export const getLatestTermGPA = (course: CourseData) => {
  if (!course.course_offerings || course.course_offerings.length === 0) return null;
  
  const sortedOfferings = [...course.course_offerings].sort((a, b) => {
    const termA = a.terms;
    const termB = b.terms;
    if (!termA || !termB) return 0;
    return (termB.year - termA.year) || (termB.season.localeCompare(termA.season));
  });

  const latestOffering = sortedOfferings[0];
  if (!latestOffering.course_gpas || latestOffering.course_gpas.length === 0) return null;

  const gpaData = latestOffering.course_gpas[0];
  const totalGrades = (gpaData.a_plus || 0) + (gpaData.a || 0) + (gpaData.a_minus || 0) +
                     (gpaData.b_plus || 0) + (gpaData.b || 0) + (gpaData.b_minus || 0) +
                     (gpaData.c_plus || 0) + (gpaData.c || 0) + (gpaData.c_minus || 0) +
                     (gpaData.d_plus || 0) + (gpaData.d || 0) + (gpaData.d_minus || 0) +
                     (gpaData.f || 0);

  const weightedSum = (gpaData.a_plus || 0) * 4.0 + (gpaData.a || 0) * 4.0 + (gpaData.a_minus || 0) * 3.67 +
                     (gpaData.b_plus || 0) * 3.33 + (gpaData.b || 0) * 3.0 + (gpaData.b_minus || 0) * 2.67 +
                     (gpaData.c_plus || 0) * 2.33 + (gpaData.c || 0) * 2.0 + (gpaData.c_minus || 0) * 1.67 +
                     (gpaData.d_plus || 0) * 1.33 + (gpaData.d || 0) * 1.0 + (gpaData.d_minus || 0) * 0.67;

  return totalGrades > 0 ? (weightedSum / totalGrades).toFixed(2) : null;
};

interface GenEdInfo {
  code: string;
  description: string;
  category: 'Cultural Studies' | 'Composition' | 'Humanities' | 'Natural Sciences' | 'Quantitative Reasoning' | 'Social Sciences';
}

export const formatGenEds = (course: CourseData): GenEdInfo[] => {
  // console.log("formatGenEds - input course:", course);
  // console.log("formatGenEds - course_geneds:", course.course_geneds);
  
  if (!course.course_geneds) {
    // console.log("formatGenEds - no course_geneds, returning empty array");
    return [];
  }
  const genEds: GenEdInfo[] = [];
  
  // Advanced Composition
  if (course.course_geneds.acp) {
    // console.log("formatGenEds - adding ACP");
    genEds.push({
      code: 'ACP',
      description: genEdDescriptions['ACP'],
      category: 'Composition'
    });
  }

  // Cultural Studies
  if (course.course_geneds.cs && course.course_geneds.cs !== 'False') {
    // console.log("formatGenEds - adding CS:", course.course_geneds.cs);
    genEds.push({
      code: course.course_geneds.cs as CSValue,
      description: genEdDescriptions[course.course_geneds.cs],
      category: 'Cultural Studies'
    });
  }

  // Humanities
  if (course.course_geneds.hum && course.course_geneds.hum !== 'False') {
    // console.log("formatGenEds - adding HUM:", course.course_geneds.hum);
    genEds.push({
      code: course.course_geneds.hum as HumValue,
      description: genEdDescriptions[course.course_geneds.hum],
      category: 'Humanities'
    });
  }

  // Natural Sciences
  if (course.course_geneds.nat && course.course_geneds.nat !== 'False') {
    // console.log("formatGenEds - adding NAT:", course.course_geneds.nat);
    genEds.push({
      code: course.course_geneds.nat as NatValue,
      description: genEdDescriptions[course.course_geneds.nat],
      category: 'Natural Sciences'
    });
  }

  // Quantitative Reasoning
  if (course.course_geneds.qr && course.course_geneds.qr !== 'False') {
    // console.log("formatGenEds - adding QR:", course.course_geneds.qr);
    genEds.push({
      code: course.course_geneds.qr as QRValue,
      description: genEdDescriptions[course.course_geneds.qr],
      category: 'Quantitative Reasoning'
    });
  }

  // Social Sciences
  if (course.course_geneds.sbs && course.course_geneds.sbs !== 'False') {
    // console.log("formatGenEds - adding SBS:", course.course_geneds.sbs);
    genEds.push({
      code: course.course_geneds.sbs as SBSValue,
      description: genEdDescriptions[course.course_geneds.sbs],
      category: 'Social Sciences'
    });
  }
  
  // console.log("formatGenEds - final result:", genEds);
  return genEds;
};

export const formatTerms = (course: CourseData) => {
  if (!course.course_offerings) return [];
  return course.course_offerings.map(offering => {
    const seasonName = {
      'fa': 'Fall',
      'sp': 'Spring',
      'su': 'Summer',
      'wi': 'Winter'
    }[offering.terms.season] || offering.terms.season.toUpperCase();
    return `${seasonName} ${offering.terms.year}`;
  });
};

// Flattens a prerequisite logic tree into a list of course codes
export const flattenPrereqLogic = (logic: PrereqLogic | string): string[] => {
  if (typeof logic === 'string') {
    return [logic];
  }

  const courses: string[] = [];
  
  if (logic.and) {
    logic.and.forEach(item => {
      courses.push(...flattenPrereqLogic(item));
    });
  }
  
  if (logic.or) {
    logic.or.forEach(item => {
      courses.push(...flattenPrereqLogic(item));
    });
  }

  return [...new Set(courses)]; // Remove duplicates
};

// Formats a course into a standard code format (e.g., "CS 225")
export const formatCourseCode = (subject: string, number: string): string => {
  return `${subject} ${number}`;
};

// Builds a map of course relationships from the prerequisite data
export const buildCourseRelationships = (
  courses: { id: string; subject: string; number: string }[],
  prereqData: { courseId: number; prereqLogic: PrereqLogic | null }[]
): Map<string, CourseRelationships> => {
  const relationships = new Map<string, CourseRelationships>();
  
  // Initialize relationships for all courses
  courses.forEach(course => {
    relationships.set(formatCourseCode(course.subject, course.number), {
      prerequisites: [],
      postrequisites: [],
      corequisites: [] // We'll handle coreqs later if needed
    });
  });

  // Process prerequisites
  prereqData.forEach(({ courseId, prereqLogic }) => {
    if (!prereqLogic) return;

    const course = courses.find(c => courseId.toString() === c.id);
    if (!course) return;

    const courseCode = formatCourseCode(course.subject, course.number);
    const prereqs = flattenPrereqLogic(prereqLogic);

    // Update relationships
    const courseRels = relationships.get(courseCode) || {
      prerequisites: [],
      postrequisites: [],
      corequisites: []
    };
    courseRels.prerequisites = prereqs;
    relationships.set(courseCode, courseRels);

    // Update postrequisites for prerequisite courses
    prereqs.forEach(prereq => {
      const prereqRels = relationships.get(prereq) || {
        prerequisites: [],
        postrequisites: [],
        corequisites: []
      };
      if (!prereqRels.postrequisites.includes(courseCode)) {
        prereqRels.postrequisites.push(courseCode);
      }
      relationships.set(prereq, prereqRels);
    });
  });

  return relationships;
}; 