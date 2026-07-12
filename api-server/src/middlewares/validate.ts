import type { Request, Response, NextFunction } from "express";
import type { AnyZodObject, ZodError } from "zod";

export interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validateRequest(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        // Enforce maximum size validation on req.body keys to prevent overlong payloads
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr.length > 5 * 1024 * 1024) { // 5MB limit
          res.status(413).json({ error: "Payload too large" });
          return;
        }
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error: any) {
      if (error.name === "ZodError") {
        const zodError = error as ZodError;
        const details: Record<string, string> = {};
        for (const issue of zodError.issues) {
          const path = issue.path.join(".");
          details[path || "input"] = issue.message;
        }
        res.status(400).json({
          error: "Validation failed",
          details,
        });
        return;
      }
      res.status(400).json({ error: "Invalid input format" });
    }
  };
}
