/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns service health status and dependency health.
 * No authentication required.
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import type { HealthResponse } from '@/types';

export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';

  // Check database health
  const database = await checkDatabaseHealth();

  // Determine overall status
  const overallStatus = database.status === 'healthy' ? 'healthy' : 'unhealthy';

  const response: HealthResponse = {
    status: overallStatus,
    timestamp,
    service: 'path-tracker',
    version: process.env.npm_package_version || '0.1.0',
    environment,
    dependencies: {
      database,
    },
  };

  // Return 503 if unhealthy
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
