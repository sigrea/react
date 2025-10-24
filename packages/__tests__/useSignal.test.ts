import { act, createElement } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";

import { readonly, signal } from "@sigrea/core";

import { useSignal } from "../useSignal";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useSignal", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
	});

	it("reads readonly signals and reflects updates", async () => {
		const count = signal(0);
		const readonlyCount = readonly(count);
		const renders: number[] = [];

		function TestComponent() {
			const value = useSignal(readonlyCount);
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
});
