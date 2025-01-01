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

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

const MAX_RETRIES = 3;
const DEBOUNCE_WAIT = 100; // Reduced to 100ms for faster response

class DbOperationQueue {
  private queue: DbOperation[] = [];
  private processing = false;
  private activeOperations = new Set<string>();

  private getOperationKey(operation: DbOperation): string {
    switch (operation.type) {
      case 'ADD_COURSE':
      case 'REMOVE_COURSE': {
        const payload = operation.payload as AddCoursePayload | RemoveCoursePayload;
        if (!payload.courseId) {
          throw new Error(`Invalid courseId for ${operation.type} operation`);
        }
        return `${operation.type}-${payload.courseId}`;
      }
      case 'MOVE_COURSE': {
        const payload = operation.payload as MoveCoursePayload;
        if (!payload.courseId) {
          throw new Error('Invalid courseId for MOVE_COURSE operation');
        }
        return `${operation.type}-${payload.courseId}`;
      }
      case 'DELETE_SEMESTER':
      case 'ADD_SEMESTER': {
        const payload = operation.payload as SemesterPayload;
        if (!payload.semesterId) {
          throw new Error(`Invalid semesterId for ${operation.type} operation`);
        }
        return `${operation.type}-${payload.semesterId}`;
      }
      default:
        return `${operation.type}-${JSON.stringify(operation.payload)}`;
    }
  }

  private async executeOperation(operation: DbOperation) {
    const operationKey = this.getOperationKey(operation);
    
    // Validate operation payload before execution
    switch (operation.type) {
      case 'ADD_COURSE':
      case 'REMOVE_COURSE': {
        const payload = operation.payload as AddCoursePayload | RemoveCoursePayload;
        if (!payload.courseId || !payload.semesterId || !payload.userId) {
          throw new Error(`Invalid payload for ${operation.type} operation`);
        }
        break;
      }
      case 'MOVE_COURSE': {
        const payload = operation.payload as MoveCoursePayload;
        if (!payload.courseId || !payload.sourceSemesterId || !payload.destinationSemesterId || !payload.userId) {
          throw new Error('Invalid payload for MOVE_COURSE operation');
        }
        break;
      }
      case 'DELETE_SEMESTER':
      case 'ADD_SEMESTER': {
        const payload = operation.payload as SemesterPayload;
        if (!payload.semesterId || !payload.userId) {
          throw new Error(`Invalid payload for ${operation.type} operation`);
        }
        break;
      }
    }

    this.activeOperations.add(operationKey);

    try {
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
    } finally {
      this.activeOperations.delete(operationKey);
    }
  }

  private processQueue = debounce(async () => {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    try {
      const latestOps = new Map<string, number>();
      
      // Find latest operations
      for (let i = 0; i < this.queue.length; i++) {
        const op = this.queue[i];
        const contextKey = this.getOperationKey(op);
        latestOps.set(contextKey, i);
      }

      // Execute latest operations
      const processedIndices = new Set<number>();
      
      for (const index of latestOps.values()) {
        if (!processedIndices.has(index)) {
          await this.executeOperation(this.queue[index]);
          processedIndices.add(index);
        }
      }

      this.queue = [];
    } catch (error: unknown) {
      console.error('Error processing operation:', error);
      const operation = this.queue[0];

      // Check if this is an expected "not found" error
      const supaError = error as SupabaseError;
      const isExpectedError = 
        supaError?.code === 'PGRST116' || // Supabase "no rows" error
        (supaError?.message && supaError.message.includes('JSON object requested, multiple (or no) rows returned'));

      if (isExpectedError) {
        // Skip retrying for expected errors - the operation was likely already completed
        this.queue.shift();
        console.log('Skipping retry for already completed operation:', operation.type);
      } else if (!operation.retries || operation.retries < MAX_RETRIES) {
        // Only retry for unexpected errors
        operation.retries = (operation.retries || 0) + 1;
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

  public async addOperation(operation: DbOperation) {
    const operationKey = this.getOperationKey(operation);
    
    // If there are no other operations in the queue and no active operations for this key,
    // execute immediately
    if (this.queue.length === 0 && !this.activeOperations.has(operationKey)) {
      await this.executeOperation(operation);
      return;
    }

    // If there are other operations, add to queue and process
    this.queue.push(operation);
    this.processQueue();
  }

  public clearQueue() {
    this.queue = [];
  }
}

export const dbQueue = new DbOperationQueue(); 