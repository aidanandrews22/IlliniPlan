import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type CourseSearchResult = Database['public']['Tables']['courses']['Row'] & {
    search_rank: number;
    total_count: number;
};

type CourseOffering = Database['public']['Tables']['course_offerings']['Row'] & {
    terms: Database['public']['Tables']['terms']['Row'];
};

type CourseGPA = Database['public']['Tables']['course_gpas']['Row'];

export async function searchCoursesHelper(query: string, page = 1, limit = 50, subject?: string) {
    const start = (page - 1) * limit;
    
    // Strip punctuation and normalize whitespace
    const sanitizedQuery = query.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    
    // console.log('Search parameters:', {
    //     sanitizedQuery,
    //     subject,
    //     page,
    //     limit,
    //     start
    // });

    try {
        // First get the ranked results from our search function
        const { data: rankedResults, error } = await supabase
            .rpc('search_courses', {
                search_query: sanitizedQuery,
                subject_filter: subject || null,
                p_limit: limit,
                p_offset: start
            });

        if (error) {
            console.error('Error searching courses:', error);
            return { data: [], count: 0 };
        }

        // console.log('Initial search results:', {
        //     resultCount: rankedResults?.length || 0,
        //     firstResult: rankedResults?.[0],
        //     lastResult: rankedResults?.[rankedResults?.length - 1]
        // });

        // Extract the total count and course IDs
        const count = (rankedResults as CourseSearchResult[])?.[0]?.total_count || 0;
        const courseIds = (rankedResults as CourseSearchResult[]).map(course => course.id);
        
        if (courseIds.length === 0) {
            // console.log('No course IDs found, returning empty result');
            return { data: [], count };
        }

        // Now fetch the full course data with all relationships
        const { data, error: fullDataError } = await supabase
            .from('courses')
            .select(`
                *,
                course_geneds!course_geneds_course_id_fkey (*),
                course_prereqs!course_prereqs_course_id_fkey (*),
                course_offerings!course_offerings_course_id_fkey (
                    *,
                    terms!course_offerings_term_id_fkey (*)
                ),
                course_gpas!course_gpas_course_id_fkey (*)
            `)
            .in('id', courseIds)
            .order('subject')
            .order('number');

        if (fullDataError) {
            console.error('Error fetching full course data:', fullDataError);
            return { data: [], count: 0 };
        }

        // Match GPAs with their corresponding offerings
        const processedData = data?.map(course => ({
            ...course,
            course_offerings: course.course_offerings?.map((offering: CourseOffering) => ({
                ...offering,
                course_gpas: course.course_gpas?.filter(
                    (gpa: CourseGPA) => gpa.term_id === offering.term_id
                ) || []
            }))
        }));

        // Sort the results to match the original search ranking
        const sortedResults = courseIds.map(id => 
            processedData?.find(course => course.id === id)
        ).filter(Boolean);

        // console.log('Final results:', {
        //     sortedResultsCount: sortedResults.length,
        //     firstSortedResult: sortedResults[0]
        // });

        return { 
            data: sortedResults || [], 
            count 
        };
    } catch (error) {
        console.error('Error in searchCoursesHelper:', error);
        return { data: [], count: 0 };
    }
}