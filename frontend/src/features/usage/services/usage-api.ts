import { apiClient } from '@/services/api/client';

import type { Usage } from '../types';

type UsageDto = {
  plan: Usage['plan'];
  period: Usage['period'];
  limit: number;
  used: number;
  remaining: number;
  resets_at: string | null;
  unlimited?: boolean;
};

export function toUsage(dto: UsageDto): Usage {
  return {
    plan: dto.plan,
    period: dto.period,
    limit: dto.limit,
    used: dto.used,
    remaining: dto.remaining,
    resetsAt: dto.resets_at,
    unlimited: dto.unlimited ?? false,
  };
}

export async function getUsage(): Promise<Usage> {
  const response = await apiClient.get<UsageDto>('/api/v1/usage');
  return toUsage(response.data);
}
