import { debounce } from 'lodash';
import { 
  createSemesterPlan,
  getOrCreateSemesterPlan,
  addCourseToSemesterPlan,
  removeCourseFromSemesterPlan,
  deleteSemesterPlan,
  parseSemesterId,
  moveCourseInSemesterPlan
} from '../lib/supabase';

interface DbOperation {
  type: 'ADD_COURSE' | 'REMOVE_COURSE' | 'MOVE_COURSE' | 'DELETE_SEMESTER' | 'ADD_SEMESTER';
  payload: any;
  retries?: number;
}

interface AddCoursePayload {
  userId: number;
  semesterId: string;
  courseId: number;
}

interface RemoveCoursePayload {
  userId: number;
  semesterId: string;
  courseId: number;
}

interface MoveCoursePayload {
  userId: number;
  sourceSemesterId: string;
  destinationSemesterId: string;
  courseId: number;
}

interface SemesterPayload {
  userId: number;
  semesterId: string;
}

const MAX_RETRIES = 3;
const DEBOUNCE_WAIT = 1000; // 1 second

class DbOperationQueue {
  private queue: DbOperation[] = [];
  private processing = false;

  private processQueue = debounce(async () => {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const operation = this.queue[0];
    try {
      await this.executeOperation(operation);
      this.queue.shift(); // Remove the operation if successful
    } catch (error) {
      console.error('Error processing operation:', error);
      if (!operation.retries) operation.retries = 0;
      
      if (operation.retries < MAX_RETRIES) {
        operation.retries++;
        // Move to end of queue for retry
        this.queue.shift();
        this.queue.push(operation);
      } else {
        // Remove failed operation after max retries
        this.queue.shift();
        console.error('Operation failed after max retries:', operation);
      }
    }

    this.processing = false;
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }, DEBOUNCE_WAIT);

  private async executeOperation(operation: DbOperation) {
    switch (operation.type) {
      case 'ADD_COURSE': {
        const { userId, semesterId, courseId } = operation.payload as AddCoursePayload;
        const semesterInfo = parseSemesterId(semesterId);
        if (!semesterInfo) throw new Error('Invalid semester ID');

        const plan = await getOrCreateSemesterPlan(userId, semesterInfo.year, semesterInfo.season);
        if (!plan) throw new Error('Failed to get/create semester plan');

        await addCourseToSemesterPlan(plan.id, courseId);
        break;
      }

      case 'REMOVE_COURSE': {
        const { userId, semesterId, courseId } = operation.payload as RemoveCoursePayload;
        const semesterInfo = parseSemesterId(semesterId);
        if (!semesterInfo) throw new Error('Invalid semester ID');

        const plan = await getOrCreateSemesterPlan(userId, semesterInfo.year, semesterInfo.season);
        if (!plan) throw new Error('Failed to get/create semester plan');

        await removeCourseFromSemesterPlan(plan.id, courseId);
        break;
      }

      case 'MOVE_COURSE': {
        const { userId, sourceSemesterId, destinationSemesterId, courseId } = operation.payload as MoveCoursePayload;
        
        // Get source semester plan
        const sourceInfo = parseSemesterId(sourceSemesterId);
        if (!sourceInfo) throw new Error('Invalid source semester ID');
        const sourcePlan = await getOrCreateSemesterPlan(userId, sourceInfo.year, sourceInfo.season);
        if (!sourcePlan) throw new Error('Failed to get source semester plan');

        // Get destination semester plan
        const destInfo = parseSemesterId(destinationSemesterId);
        if (!destInfo) throw new Error('Invalid destination semester ID');
        const destPlan = await getOrCreateSemesterPlan(userId, destInfo.year, destInfo.season);
        if (!destPlan) throw new Error('Failed to get destination semester plan');

        // Move the course
        await moveCourseInSemesterPlan(sourcePlan.id, destPlan.id, courseId);
        break;
      }

      case 'DELETE_SEMESTER': {
        const { userId, semesterId } = operation.payload as SemesterPayload;
        const semesterInfo = parseSemesterId(semesterId);
        if (!semesterInfo) throw new Error('Invalid semester ID');

        const plan = await getOrCreateSemesterPlan(userId, semesterInfo.year, semesterInfo.season);
        if (!plan) throw new Error('Failed to get/create semester plan');

        // Delete all courses in the plan first, then delete the plan itself
        await deleteSemesterPlan(plan.id);
        break;
      }

      case 'ADD_SEMESTER': {
        const { userId, semesterId } = operation.payload as SemesterPayload;
        const semesterInfo = parseSemesterId(semesterId);
        if (!semesterInfo) throw new Error('Invalid semester ID');

        await getOrCreateSemesterPlan(userId, semesterInfo.year, semesterInfo.season);
        break;
      }
    }
  }

  public addOperation(operation: DbOperation) {
    this.queue.push(operation);
    this.processQueue();
  }

  public clearQueue() {
    this.queue = [];
  }
}

export const dbQueue = new DbOperationQueue(); 