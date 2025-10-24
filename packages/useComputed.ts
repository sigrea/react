import { useMemo } from "react";

import type { Computed } from "@sigrea/core";
import { createComputedHandler } from "@sigrea/core";

import { useSnapshot } from "./useSnapshot";

export function useComputed<T>(source: Computed<T>) {
	const handler = useMemo(() => createComputedHandler(source), [source]);
	return useSnapshot(handler);
}
