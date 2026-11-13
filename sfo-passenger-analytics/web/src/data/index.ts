// Loads dashboard.json (written by `npm run data`) and gives it the shared type.
import type { DashboardData } from '../types';
import raw from './dashboard.json';

export const dashboard = raw as DashboardData;
