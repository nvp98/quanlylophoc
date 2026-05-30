import { useCallback } from "react";
import { useAsync } from "./useAsync";

export function useFetch(asyncFunction) {
  const { execute, ...rest } = useAsync(asyncFunction);

  // Execute on mount
  const fetchData = useCallback(() => {
    return execute();
  }, [execute]);

  return { fetchData, ...rest };
}
