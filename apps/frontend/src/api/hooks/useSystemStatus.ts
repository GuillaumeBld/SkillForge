import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../client';
import { queryKeys } from '../queryKeys';

export const useHealthQuery = () =>
  useQuery({
    queryKey: queryKeys.health,
    queryFn: fetchHealth,
    staleTime: 15_000
  });
