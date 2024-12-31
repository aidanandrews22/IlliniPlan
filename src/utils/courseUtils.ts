import type { CourseData } from '../types/database';

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
  return hours.toLowerCase().replace(' hours', '').replace(' to ', '-');
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
  if (!course.course_geneds) return [];
  const genEds: GenEdInfo[] = [];
  
  // Advanced Composition
  if (course.course_geneds.acp) {
    genEds.push({
      code: 'ACP',
      description: genEdDescriptions['ACP'],
      category: 'Composition'
    });
  }

  // Cultural Studies
  if (course.course_geneds.cs && course.course_geneds.cs !== 'False') {
    genEds.push({
      code: course.course_geneds.cs as CSValue,
      description: genEdDescriptions[course.course_geneds.cs],
      category: 'Cultural Studies'
    });
  }

  // Humanities
  if (course.course_geneds.hum && course.course_geneds.hum !== 'False') {
    genEds.push({
      code: course.course_geneds.hum as HumValue,
      description: genEdDescriptions[course.course_geneds.hum],
      category: 'Humanities'
    });
  }

  // Natural Sciences
  if (course.course_geneds.nat && course.course_geneds.nat !== 'False') {
    genEds.push({
      code: course.course_geneds.nat as NatValue,
      description: genEdDescriptions[course.course_geneds.nat],
      category: 'Natural Sciences'
    });
  }

  // Quantitative Reasoning
  if (course.course_geneds.qr && course.course_geneds.qr !== 'False') {
    genEds.push({
      code: course.course_geneds.qr as QRValue,
      description: genEdDescriptions[course.course_geneds.qr],
      category: 'Quantitative Reasoning'
    });
  }

  // Social Sciences
  if (course.course_geneds.sbs && course.course_geneds.sbs !== 'False') {
    genEds.push({
      code: course.course_geneds.sbs as SBSValue,
      description: genEdDescriptions[course.course_geneds.sbs],
      category: 'Social Sciences'
    });
  }
  
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