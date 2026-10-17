import type { z } from 'zod';

/** A 400 problem document naming each field that failed, for any request that fails its schema. */
export function validationProblem(error: z.ZodError) {
  return {
    type: 'validation',
    errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
  };
}
