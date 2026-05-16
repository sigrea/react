import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	type MoleculeInstance,
	computed,
	disposeTrackedMolecules,
	molecule,
	onUnmount,
} from "@sigrea/core";

import { useMolecule } from "../useMolecule";
import { useSignal } from "../useSignal";
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

	it("does not remount and keeps object props as an initial snapshot", async () => {
		const cleanup = vi.fn();
		const counterMolecule = molecule((props: { value: number }) => {
			onUnmount(() => cleanup(props.value));
			return { value: computed(() => props.value) };
		});

		const observed: Array<MoleculeInstance<{ value: { value: number } }>> = [];

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
		expect(observed[0].value.value).toBe(1);
		expect(observed[1].value.value).toBe(1);
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

	it("accepts a props getter", async () => {
		const counterMolecule = molecule((props: { value: number }) => {
			return { value: computed(() => props.value) };
		});

		const observed: Array<MoleculeInstance<{ value: { value: number } }>> = [];

		function TestComponent({ value }: { value: number }) {
			const instance = useMolecule(
				counterMolecule,
				() => ({
					value: value * 2,
				}),
				[value],
			);
			observed.push(instance);
			return null;
		}

		await root.render(createElement(TestComponent, { value: 1 }));
		await root.render(createElement(TestComponent, { value: 2 }));

		expect(observed).toHaveLength(2);
		expect(observed[0]).toBe(observed[1]);
		expect(observed[1].value.value).toBe(4);
	});

	it("rerenders signal consumers after committed props getter sync", async () => {
		const dialogMolecule = molecule((props: { open: boolean }) => {
			return { status: computed(() => (props.open ? "open" : "closed")) };
		});

		function TestComponent({ isOpen }: { isOpen: boolean }) {
			const instance = useMolecule(dialogMolecule, () => ({ open: isOpen }), [
				isOpen,
			]);
			const status = useSignal(instance.status);
			return createElement("span", null, status);
		}

		await root.render(createElement(TestComponent, { isOpen: false }));
		expect(root.container.textContent).toBe("closed");

		await root.render(createElement(TestComponent, { isOpen: true }));
		expect(root.container.textContent).toBe("open");
	});

	it("syncs top-level key removal from props getters", async () => {
		const dialogMolecule = molecule(
			(props: { disabled?: boolean; open: boolean }) => {
				return {
					disabled: computed(() => props.disabled),
					hasDisabled: computed(() => "disabled" in props),
				};
			},
		);

		function TestComponent({ disabled }: { disabled?: boolean }) {
			const instance = useMolecule(
				dialogMolecule,
				() =>
					disabled === undefined ? { open: true } : { disabled, open: true },
				[disabled],
			);
			const hasDisabled = useSignal(instance.hasDisabled);
			const currentDisabled = useSignal(instance.disabled);
			return createElement(
				"span",
				null,
				`${hasDisabled}:${String(currentDisabled)}`,
			);
		}

		await root.render(createElement(TestComponent, { disabled: true }));
		expect(root.container.textContent).toBe("true:true");

		await root.render(createElement(TestComponent, {}));
		expect(root.container.textContent).toBe("false:undefined");
	});

	it("does not resync referential props while dependencies are stable", async () => {
		const itemMolecule = molecule((props: { item: { id: number } }) => {
			return { item: computed(() => props.item) };
		});

		const observed: Array<{ id: number }> = [];

		function TestComponent({ id }: { id: number }) {
			const instance = useMolecule(
				itemMolecule,
				() => ({
					item: { id },
				}),
				[id],
			);
			const item = useSignal(instance.item);
			observed.push(item);
			return createElement("span", null, String(item.id));
		}

		await root.render(createElement(TestComponent, { id: 1 }));
		const firstItem = observed.at(-1);

		await root.render(createElement(TestComponent, { id: 1 }));

		expect(root.container.textContent).toBe("1");
		expect(observed.at(-1)).toBe(firstItem);

		await root.render(createElement(TestComponent, { id: 2 }));

		expect(root.container.textContent).toBe("2");
		expect(observed.at(-1)).toEqual({ id: 2 });
	});

	it("rejects a props getter without dependencies at runtime", async () => {
		const counterMolecule = molecule((props: { value: number }) => {
			return { value: computed(() => props.value) };
		});

		function TestComponent() {
			useMolecule(counterMolecule, (() => ({ value: 1 })) as never);
			return null;
		}

		await expect(root.render(createElement(TestComponent))).rejects.toThrow(
			"useMolecule props getter in React requires a dependency list.",
		);
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

function expectReactUseMoleculeTypeErrors() {
	type OptionalProps = { value?: number };
	const optionalMolecule = molecule((props: { value?: number }) => {
		return { value: computed(() => props.value) };
	});
	const callablePropMolecule = molecule((props: { call?: () => void }) => {
		return { handler: props.call };
	});
	const optionalProps: OptionalProps | undefined =
		Math.random() > 0.5 ? { value: 1 } : undefined;

	useMolecule(optionalMolecule);
	useMolecule(optionalMolecule, undefined);
	useMolecule(optionalMolecule, optionalProps);
	useMolecule(optionalMolecule, { value: 1 });
	useMolecule(callablePropMolecule, { call: (): void => {} });

	// @ts-expect-error React props getters require a dependency list.
	useMolecule(optionalMolecule, () => ({ value: 1 }));
}
