import { Router, Response } from "express";
import { ReadinessCheck } from "./IHealthCheckRepository";

export function healthCheckRouter(readinessChecks: ReadinessCheck[]): Router {
  const router = Router();

  router.get('/', (_req, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/readiness', async (_req, res: Response) => {
    const results = await Promise.all(
      readinessChecks.map(async (rc) => {
        try {
          const ok = await rc.check();
          return [rc.name, ok] as const;
        } catch {
          return [rc.name, false] as const;
        }
      }),
    );
    const dependencies = Object.fromEntries(results);
    const allOk = results.every(([, ok]) => ok);
    res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded', dependencies });
  });

  return router;
}
