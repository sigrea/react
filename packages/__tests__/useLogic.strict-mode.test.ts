import { StrictMode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupLogics, defineLogic, onUnmount } from "@sigrea/core";

import { useLogic } from "../useLogic";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useLogic in StrictMode", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
		cleanupLogics();
	});

	it("keeps the logic instance alive across StrictMode effect replays", async () => {
		const cleanup = vi.fn();
		const logic = defineLogic<number>()((value) => {
			onUnmount(() => cleanup(value));
			return { value };
		});

		function TestComponent() {
			useLogic(logic, 1);
			return null;
		}

		await root.render(createElement(StrictMode, null, createElement(TestComponent)));
		await flushMicrotasks(2);

		expect(cleanup).not.toHaveBeenCalled();

		await root.unmount();
		await flushMicrotasks(2);

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanup).toHaveBeenCalledWith(1);
	});
});
