import { StrictMode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	computed,
	disposeTrackedMolecules,
	molecule,
	onDispose,
} from "@sigrea/core";

import { useMolecule } from "../useMolecule";
import { useSignal } from "../useSignal";
import { createTestRoot, flushMicrotasks } from "./testUtils";

describe("useMolecule in StrictMode", () => {
	let root: ReturnType<typeof createTestRoot>;

	beforeEach(() => {
		root = createTestRoot();
	});

	afterEach(async () => {
		await root.unmount();
		disposeTrackedMolecules();
	});

	it("keeps the molecule instance alive across StrictMode effect replays", async () => {
		const cleanup = vi.fn();
		const counterMolecule = molecule((props: { value: number }) => {
			onDispose(() => cleanup(props.value));
			return { value: props.value };
		});

		function TestComponent() {
			useMolecule(counterMolecule, { value: 1 });
			return null;
		}

		await root.render(
			createElement(StrictMode, null, createElement(TestComponent)),
		);
		await flushMicrotasks(2);

		expect(cleanup).not.toHaveBeenCalled();

		await root.unmount();
		await flushMicrotasks(2);

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanup).toHaveBeenCalledWith(1);
	});

	it("does not replay live props sync while dependencies are stable", async () => {
		const readProps = vi.fn((value: number) => ({ value }));
		const counterMolecule = molecule((props: { value: number }) => {
			return { value: computed(() => props.value) };
		});

		function TestComponent({ value }: { value: number }) {
			const instance = useMolecule(counterMolecule, () => readProps(value), [
				value,
			]);
			const currentValue = useSignal(instance.value);
			return createElement("span", null, String(currentValue));
		}

		await root.render(
			createElement(
				StrictMode,
				null,
				createElement(TestComponent, { value: 1 }),
			),
		);

		expect(readProps).toHaveBeenCalledTimes(1);

		await root.render(
			createElement(
				StrictMode,
				null,
				createElement(TestComponent, { value: 1 }),
			),
		);

		expect(root.container.textContent).toBe("1");
		expect(readProps).toHaveBeenCalledTimes(1);

		await root.render(
			createElement(
				StrictMode,
				null,
				createElement(TestComponent, { value: 2 }),
			),
		);

		expect(root.container.textContent).toBe("2");
		expect(readProps).toHaveBeenCalledTimes(2);
	});
});
