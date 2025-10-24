import { useCallback, useSyncExternalStore } from "react";

import type { Snapshot, SnapshotHandler } from "@sigrea/core";

export function useSnapshot<T>(handler: SnapshotHandler<T>) {
	const subscribe = useCallback(
		(onStoreChange: () => void) => handler.subscribe(onStoreChange),
		[handler],
	);

	const getSnapshot = useCallback(() => handler.getSnapshot(), [handler]);
	const snapshot = useSyncExternalStore<Snapshot<T>>(
		subscribe,
		getSnapshot,
		getSnapshot,
	);

	return snapshot.value;
}
