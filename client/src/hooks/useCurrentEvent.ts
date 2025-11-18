import { useQuery } from "@tanstack/react-query";
import type { Event } from "@shared/schema";

export function useCurrentEvent() {
  const { data: currentEvent, isLoading } = useQuery<Event>({
    queryKey: ["/api/events/current"],
    retry: false,
  });

  return {
    currentEvent,
    isLoading,
    hasEvent: !!currentEvent,
  };
}