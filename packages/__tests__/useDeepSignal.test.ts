import { act, createElement } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";

import { deepSignal } from "@sigrea/core";

import { useDeepSignal } from "../useDeepSignal";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useDeepSignal", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
	});

	it("returns a stable reference while reflecting deep mutations", async () => {
		const state = deepSignal({ nested: { count: 0 } });
		const references: object[] = [];
		const observedCounts: number[] = [];

		function TestComponent() {
			const snapshot = useDeepSignal(state);
			references.push(snapshot);
			observedCounts.push(snapshot.nested.count);
			return createElement("span", null, snapshot.nested.count);
		}

		await root.render(createElement(TestComponent));

		expect(root.container.textContent).toBe("0");

		await act(async () => {
			state.nested.count = 1;
			await Promise.resolve();
		});
		await flushMicrotasks(2);

		expect(observedCounts).toEqual([0, 1]);
		expect(root.container.textContent).toBe("1");
		expect(references).toHaveLength(2);
		expect(references[0]).toBe(references[1]);
	});
});
