import { SemestersData } from '../pages/Plan';

/**
 * CourseExporter - Utility for exporting course data in various formats
 * Provides multiple export format options and file download functionality
 */
export const CourseExporter = {
  // Export to CSV (simple flat format)
  exportAsCSV: (semestersData: SemestersData) => {
    const allCourses = Object.values(semestersData).flatMap(semester => 
      semester.coursecards.map(course => ({
        semester: semester.name,
        subject: course.subject,
        number: course.number,
        name: course.name,
        // Add any other fields you want to include
      }))
    );
    
    if (allCourses.length === 0) {
      return 'semester,subject,number,name';
    }
    
    // Create CSV header
    const headers = Object.keys(allCourses[0]).join(',');
    
    // Create CSV rows
    const rows = allCourses.map(course => 
      Object.values(course).map(value => 
        // Handle commas in values by wrapping in quotes
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    );
    
    // Combine header and rows
    const csvContent = [headers, ...rows].join('\n');
    
    // Return CSV content
    return csvContent;
  },
  
  // Export to JSON with semester grouping preserved
  exportAsJSON: (semestersData: SemestersData) => {
    // Create a clean structure with semesters as main keys
    const structuredData = Object.values(semestersData).map(semester => ({
      semester: semester.name,
      courses: semester.coursecards.map(course => ({
        subject: course.subject,
        number: course.number,
        name: course.name,
        // Add other course properties as needed
      }))
    }));
    
    return JSON.stringify(structuredData, null, 2);
  },
  
  // Export to Markdown - nicely formatted and grouped by semester
  exportAsMarkdown: (semestersData: SemestersData) => {
    let markdown = "# Course List\n\n";
    
    Object.values(semestersData).forEach(semester => {
      markdown += `## ${semester.name}\n\n`;
      
      if (semester.coursecards.length === 0) {
        markdown += "*No courses for this semester*\n\n";
        return;
      }
      
      markdown += "| Subject | Number | Course Name |\n";
      markdown += "|---------|--------|-------------|\n";
      
      semester.coursecards.forEach(course => {
        markdown += `| ${course.subject} | ${course.number} | ${course.name} |\n`;
      });
      
      markdown += "\n";
    });
    
    return markdown;
  },
  
  // Export to HTML - can be viewed in browser or saved as a file
  exportAsHTML: (semestersData: SemestersData) => {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course List</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      margin-bottom: 30px;
    }
    h2 {
      color: #3498db;
      border-bottom: 2px solid #3498db;
      padding-bottom: 5px;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .empty-semester {
      font-style: italic;
      color: #7f8c8d;
    }
    @media print {
      h2 {
        page-break-after: avoid;
      }
      table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>Course List</h1>
`;
    
    Object.values(semestersData).forEach(semester => {
      html += `  <h2>${semester.name}</h2>\n`;
      
      if (semester.coursecards.length === 0) {
        html += `  <p class="empty-semester">No courses for this semester</p>\n`;
        return;
      }
      
      html += `  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th>Number</th>
        <th>Course Name</th>
      </tr>
    </thead>
    <tbody>
`;
      
      semester.coursecards.forEach(course => {
        html += `      <tr>
        <td>${course.subject}</td>
        <td>${course.number}</td>
        <td>${course.name}</td>
      </tr>
`;
      });
      
      html += `    </tbody>
  </table>
`;
    });
    
    html += `</body>
</html>`;
    
    return html;
  },
  
  // Export to Python format (improved version of the original function)
  exportAsPython: (semestersData: SemestersData) => {
    // Create a structured data with semesters as dictionary keys
    const structuredData: Record<string, Array<{subject: string, number: string, name: string}>> = {};
    
    Object.values(semestersData).forEach(semester => {
      structuredData[semester.name] = semester.coursecards.map(course => ({
        'subject': course.subject,
        'number': course.number,
        'name': course.name
      }));
    });
    
    // Convert to Python format
    let pythonStr = 'courses = {\n';
    
    Object.entries(structuredData).forEach(([semester, courses]) => {
      pythonStr += `  '${semester}': [\n`;
      
      courses.forEach(course => {
        pythonStr += `    {'subject': '${course.subject}', 'number': '${course.number}', 'name': '${course.name}'},\n`;
      });
      
      pythonStr += '  ],\n';
    });
    
    pythonStr += '}';
    
    return pythonStr;
  },
  
  // Helper function to download the content as a file
  downloadFile: (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  },
  
  // Main export function that provides appropriate file format
  exportCourses: (semestersData: SemestersData, format = 'html') => {
    let content: string, filename: string, contentType: string;
    
    switch (format.toLowerCase()) {
      case 'csv':
        content = CourseExporter.exportAsCSV(semestersData);
        filename = 'courses.csv';
        contentType = 'text/csv';
        break;
      
      case 'json':
        content = CourseExporter.exportAsJSON(semestersData);
        filename = 'courses.json';
        contentType = 'application/json';
        break;
      
      case 'markdown':
      case 'md':
        content = CourseExporter.exportAsMarkdown(semestersData);
        filename = 'courses.md';
        contentType = 'text/markdown';
        break;
      
      case 'python':
      case 'py':
        content = CourseExporter.exportAsPython(semestersData);
        filename = 'courses.py';
        contentType = 'text/plain';
        break;
      
      case 'html':
      default:
        content = CourseExporter.exportAsHTML(semestersData);
        filename = 'courses.html';
        contentType = 'text/html';
        break;
    }
    
    CourseExporter.downloadFile(content, filename, contentType);
    return content; // Also return the content in case it's needed
  }
};

export default CourseExporter; 