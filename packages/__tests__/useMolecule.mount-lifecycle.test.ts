import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	type MoleculeInstance,
	type Signal,
	disposeTrackedMolecules,
	molecule,
	onMount,
	signal,
	watch,
} from "@sigrea/core";

import { useMolecule } from "../useMolecule";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useMolecule mount lifecycle", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
		disposeTrackedMolecules();
	});

	it("calls onMount after component mounts", async () => {
		const onMountCallback = vi.fn();
		const testMolecule = molecule(() => {
			onMount(() => {
				onMountCallback();
			});
			return {};
		});

		function TestComponent() {
			useMolecule(testMolecule);
			return null;
		}

		expect(onMountCallback).not.toHaveBeenCalled();

		await root.render(createElement(TestComponent));

		expect(onMountCallback).toHaveBeenCalledTimes(1);
	});

	it("defers watch execution until after mount", async () => {
		const watchCallback = vi.fn();
		const setupCallback = vi.fn();

		const testMolecule = molecule(() => {
			const count = signal(0);

			setupCallback();

			watch(count, (value) => {
				watchCallback(value);
			});

			return { count };
		});

		function TestComponent() {
			useMolecule(testMolecule);
			return null;
		}

		await root.render(createElement(TestComponent));

		expect(setupCallback).toHaveBeenCalledTimes(1);
		expect(watchCallback).not.toHaveBeenCalled();

		await flushMicrotasks(2);

		expect(watchCallback).not.toHaveBeenCalled();
	});

	it("executes watch callback when signal changes after mount", async () => {
		const watchCallback = vi.fn();

		const testMolecule = molecule(() => {
			const count = signal(0);

			watch(count, (value) => {
				watchCallback(value);
			});

			return { count };
		});

		const observed: Array<MoleculeInstance<{ count: Signal<number> }>> = [];

		function TestComponent() {
			const instance = useMolecule(testMolecule);
			observed.push(instance);
			return null;
		}

		await root.render(createElement(TestComponent));
		await flushMicrotasks(2);

		expect(watchCallback).not.toHaveBeenCalled();
		expect(observed).toHaveLength(1);

		observed[0].count.value = 42;
		await flushMicrotasks(2);

		expect(watchCallback).toHaveBeenCalledTimes(1);
		expect(watchCallback).toHaveBeenCalledWith(42);
	});
});
