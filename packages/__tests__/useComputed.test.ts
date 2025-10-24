import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { computed, signal } from "@sigrea/core";

import { useComputed } from "../useComputed";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useComputed", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
	});

	it("tracks computed values and ignores unchanged emissions", async () => {
		const base = signal(2);
		const doubled = computed(() => base.value * 2);
		const renders: number[] = [];

		function TestComponent() {
			const value = useComputed(doubled);
			renders.push(value);
			return createElement("span", null, value);
		}

		await root.render(createElement(TestComponent));

		expect(root.container.textContent).toBe("4");
		expect(renders).toEqual([4]);

		await act(async () => {
			base.value = 4;
		});
		await flushMicrotasks();

		expect(root.container.textContent).toBe("8");
		expect(renders).toEqual([4, 8]);

		await act(async () => {
			base.value = 4;
		});
		await flushMicrotasks();

		expect(renders).toEqual([4, 8]);
	});
});
