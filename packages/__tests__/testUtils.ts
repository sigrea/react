import type { ReactElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

const globalScope = globalThis as {
	IS_REACT_ACT_ENVIRONMENT?: boolean;
};

if (globalScope.IS_REACT_ACT_ENVIRONMENT !== true) {
	globalScope.IS_REACT_ACT_ENVIRONMENT = true;
}

export interface TestRoot {
	container: HTMLDivElement;
	render(element: ReactElement): Promise<void>;
	unmount(): Promise<void>;
}

export function createTestRoot(): TestRoot {
	const container = document.createElement("div");
	const root: Root = createRoot(container);
	let mounted = false;

	async function render(element: ReactElement) {
		await act(async () => {
			root.render(element);
		});
		mounted = true;
	}

	async function unmount() {
		if (!mounted) {
			return;
		}

		await act(async () => {
			root.unmount();
		});
		mounted = false;
	}

	return { container, render, unmount };
}

export async function flushMicrotasks(times = 1): Promise<void> {
	for (let index = 0; index < times; index += 1) {
		await Promise.resolve();
	}
}
