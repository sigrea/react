import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	type MoleculeInstance,
	disposeTrackedMolecules,
	molecule,
	onUnmount,
} from "@sigrea/core";

import { useMolecule } from "../useMolecule";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useMolecule", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
		disposeTrackedMolecules();
	});

	it("does not dispose when re-rendered with identical props", async () => {
		const cleanup = vi.fn();
		const counterMolecule = molecule((value: number) => {
			onUnmount(() => cleanup(value));
			return { value };
		});

		const observed: Array<MoleculeInstance<{ value: number }>> = [];

		function TestComponent({ value }: { value: number }) {
			const instance = useMolecule(counterMolecule, value);
			observed.push(instance);
			return null;
		}

		await root.render(createElement(TestComponent, { value: 1 }));
		await root.render(createElement(TestComponent, { value: 1 }));

		await flushMicrotasks(2);

		expect(observed).toHaveLength(2);
		expect(observed[0]).toBe(observed[1]);
		expect(cleanup).not.toHaveBeenCalled();

		await root.unmount();
		await flushMicrotasks(2);

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanup).toHaveBeenCalledWith(1);
	});

	it("mounts molecule and cleans up on unmount", async () => {
		const cleanup = vi.fn();
		const makeMolecule = molecule((value: number) => {
			onUnmount(() => cleanup(value));
			return { value };
		});

		const observed: Array<MoleculeInstance<{ value: number }>> = [];

		function TestComponent() {
			const instance = useMolecule(makeMolecule, 1);
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

		const counterMolecule = molecule((value: number) => {
			mounts(value);
			onUnmount(() => cleanups(value));
			return {};
		});

		function TestComponent({ value }: { value: number }) {
			useMolecule(counterMolecule, value);
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
