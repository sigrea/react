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

	it("does not remount when re-rendered with updated props", async () => {
		const cleanup = vi.fn();
		const counterMolecule = molecule((props: { value: number }) => {
			onUnmount(() => cleanup(props.value));
			return { value: props.value };
		});

		const observed: Array<MoleculeInstance<{ value: number }>> = [];

		function TestComponent({ value }: { value: number }) {
			const instance = useMolecule(counterMolecule, { value });
			observed.push(instance);
			return null;
		}

		await root.render(createElement(TestComponent, { value: 1 }));
		await root.render(createElement(TestComponent, { value: 2 }));

		await flushMicrotasks(2);

		expect(observed).toHaveLength(2);
		expect(observed[0]).toBe(observed[1]);
		expect(observed[0].value).toBe(1);
		expect(observed[1].value).toBe(1);
		expect(cleanup).not.toHaveBeenCalled();

		await root.unmount();
		await flushMicrotasks(2);

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanup).toHaveBeenCalledWith(1);
	});

	it("mounts molecule and cleans up on unmount", async () => {
		const cleanup = vi.fn();
		const makeMolecule = molecule((props: { value: number }) => {
			onUnmount(() => cleanup(props.value));
			return { value: props.value };
		});

		const observed: Array<MoleculeInstance<{ value: number }>> = [];

		function TestComponent() {
			const instance = useMolecule(makeMolecule, { value: 1 });
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

	it("remounts when the molecule factory changes", async () => {
		const mounts = vi.fn();
		const cleanups = vi.fn();

		const moleculeA = molecule((props: { label: string }) => {
			mounts(props.label);
			onUnmount(() => cleanups(props.label));
			return { label: props.label };
		});

		const moleculeB = molecule((props: { label: string }) => {
			mounts(props.label);
			onUnmount(() => cleanups(props.label));
			return { label: props.label };
		});

		function TestComponent({ mode }: { mode: "a" | "b" }) {
			useMolecule(mode === "a" ? moleculeA : moleculeB, { label: mode });
			return null;
		}

		await root.render(createElement(TestComponent, { mode: "a" }));
		expect(mounts).toHaveBeenCalledTimes(1);
		expect(mounts).toHaveBeenLastCalledWith("a");

		await root.render(createElement(TestComponent, { mode: "a" }));
		expect(mounts).toHaveBeenCalledTimes(1);

		await root.render(createElement(TestComponent, { mode: "b" }));
		expect(mounts).toHaveBeenCalledTimes(2);
		expect(mounts).toHaveBeenLastCalledWith("b");
		expect(cleanups).toHaveBeenCalledTimes(1);
		expect(cleanups).toHaveBeenLastCalledWith("a");

		await root.unmount();
		await flushMicrotasks(2);

		expect(cleanups).toHaveBeenCalledTimes(2);
		expect(cleanups).toHaveBeenLastCalledWith("b");
	});
});
