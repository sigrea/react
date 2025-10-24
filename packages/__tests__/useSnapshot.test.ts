import { act, createElement } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import type { SnapshotHandler } from "@sigrea/core";
import { createSignalHandler, signal } from "@sigrea/core";

import { useSnapshot } from "../useSnapshot";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useSnapshot", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
	});

	it("subscribes to the handler and re-renders with fresh snapshots", async () => {
		const count = signal(0);
		const handler = createSignalHandler(count);
		const renders: number[] = [];

		function TestComponent() {
			const value = useSnapshot(handler);
			renders.push(value);
			return createElement("span", null, value);
		}

		await root.render(createElement(TestComponent));

		expect(root.container.textContent).toBe("0");
		expect(renders).toEqual([0]);

		await act(async () => {
			count.value = 1;
		});
		await flushMicrotasks();

		expect(root.container.textContent).toBe("1");
		expect(renders).toEqual([0, 1]);
	});

	it("unsubscribes from the handler when unmounted", async () => {
		const teardown = vi.fn();
		const subscribe = vi
			.fn<(listener: () => void) => () => void>()
			.mockImplementation(() => () => {
				teardown();
			});

		const snapshot = { value: 42, version: 0 } as const;
		const handler: SnapshotHandler<number> = {
			getSnapshot: () => snapshot,
			subscribe,
		};

		function TestComponent() {
			useSnapshot(handler);
			return null;
		}

		await root.render(createElement(TestComponent));
		expect(subscribe).toHaveBeenCalledTimes(1);

		await root.unmount();

		expect(teardown).toHaveBeenCalledTimes(1);
	});
});
