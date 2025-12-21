import { StrictMode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { disposeTrackedMolecules, molecule, onUnmount } from "@sigrea/core";

import { useMolecule } from "../useMolecule";
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
		const counterMolecule = molecule((value: number) => {
			onUnmount(() => cleanup(value));
			return { value };
		});

		function TestComponent() {
			useMolecule(counterMolecule, 1);
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
});
