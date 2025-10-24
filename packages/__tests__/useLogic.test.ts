import { createElement } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import {
	cleanupLogics,
	defineLogic,
	onUnmount,
	type LogicInstance,
} from "@sigrea/core";

import { useLogic } from "../useLogic";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useLogic", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
		cleanupLogics();
	});

	it("mounts logic and cleans up on unmount", async () => {
		const cleanup = vi.fn();
		const makeLogic = defineLogic<number>()((value) => {
			onUnmount(() => cleanup(value));
			return { value };
		});

		const observed: Array<LogicInstance<{ value: number }>> = [];

		function TestComponent() {
			const instance = useLogic(makeLogic, 1);
			observed.push(instance);
			return null;
		}

		await root.render(createElement(TestComponent));

		expect(observed).toHaveLength(1);
		expect(observed[0].value).toBe(1);
		expect(cleanup).not.toHaveBeenCalled();

		await root.unmount();
		await flushMicrotasks(2);

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanup).toHaveBeenCalledWith(1);
	});

	it("remounts when arguments change and preserves instances otherwise", async () => {
		const mounts = vi.fn();
		const cleanups = vi.fn();

		const logic = defineLogic<number>()((value) => {
			mounts(value);
			onUnmount(() => cleanups(value));
			return {};
		});

		function TestComponent({ value }: { value: number }) {
			useLogic(logic, value);
			return null;
		}

		async function renderWithValue(value: number) {
			await root.render(createElement(TestComponent, { value }));
		}

		await renderWithValue(1);
		expect(mounts).toHaveBeenCalledTimes(1);
		expect(mounts).toHaveBeenLastCalledWith(1);

		await renderWithValue(1);
		expect(mounts).toHaveBeenCalledTimes(1);

		await renderWithValue(2);
		expect(mounts).toHaveBeenCalledTimes(2);
		expect(mounts).toHaveBeenLastCalledWith(2);
		expect(cleanups).toHaveBeenCalledTimes(1);
		expect(cleanups).toHaveBeenLastCalledWith(1);

		await root.unmount();
		await flushMicrotasks(2);

		expect(cleanups).toHaveBeenCalledTimes(2);
		expect(cleanups).toHaveBeenLastCalledWith(2);
	});
});
