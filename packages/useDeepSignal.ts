import { useMemo } from "react";

import type { DeepSignal } from "@sigrea/core";
import { createDeepSignalHandler } from "@sigrea/core";

import { useSnapshot } from "./useSnapshot";

export function useDeepSignal<T extends object>(source: DeepSignal<T>) {
	const handler = useMemo(() => createDeepSignalHandler(source), [source]);
	return useSnapshot(handler);
}
