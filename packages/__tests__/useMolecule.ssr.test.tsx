// @vitest-environment node

// @ts-expect-error This node-only test imports a built-in module without node types in the package tsconfig.
import { PassThrough } from "node:stream";
import { Suspense, createElement, use } from "react";
import {
	renderToPipeableStream,
	renderToReadableStream,
	renderToString,
} from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
	molecule,
	onDispose,
	onMount,
	signal,
	watch,
	watchEffect,
} from "@sigrea/core";

import { useMolecule } from "../useMolecule";

async function flushMicrotasks(times = 1): Promise<void> {
	for (let index = 0; index < times; index += 1) {
		await Promise.resolve();
	}
}

async function renderPipeable(element: ReturnType<typeof createElement>) {
	const stream = new PassThrough();
	let html = "";
	stream.on("data", (chunk: unknown) => {
		html += String(chunk);
	});

	await new Promise<void>((resolve, reject) => {
		const { pipe } = renderToPipeableStream(element, {
			onAllReady() {
				pipe(stream);
			},
			onError(error) {
				reject(error);
			},
		});

		stream.on("end", () => resolve());
		stream.on("error", reject);
	});

	return html;
}

async function readReadableStream(stream: ReadableStream<Uint8Array>) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let html = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		html += decoder.decode(value, { stream: true });
	}

	html += decoder.decode();
	return html;
}

async function renderReadable(element: ReturnType<typeof createElement>) {
	const stream = await renderToReadableStream(element);
	return readReadableStream(stream);
}

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((nextResolve) => {
		resolve = nextResolve;
	});

	return { promise, resolve };
}

function createSuspenseRetryFixture() {
	const metrics = {
		created: 0,
		disposed: 0,
		mounted: 0,
		watchRuns: 0,
		effectRuns: 0,
		renderAttempts: 0,
	};
	const deferred = createDeferred<string>();
	const DemoMolecule = molecule(() => {
		metrics.created += 1;
		const count = signal(1);

		onMount(() => {
			metrics.mounted += 1;
		});
		onDispose(() => {
			metrics.disposed += 1;
		});
		watch(
			count,
			() => {
				metrics.watchRuns += 1;
			},
			{ immediate: true },
		);
		watchEffect(() => {
			count.value;
			metrics.effectRuns += 1;
		});

		return { count };
	});

	function TestComponent() {
		metrics.renderAttempts += 1;
		const instance = useMolecule(DemoMolecule);
		const suffix = use(deferred.promise);
		return createElement("span", null, `${instance.count.value}:${suffix}`);
	}

	return {
		metrics,
		resolve: deferred.resolve,
		element: createElement(
			Suspense,
			{ fallback: createElement("div", null, "loading") },
			createElement(TestComponent),
		),
	};
}

describe("useMolecule on the server", () => {
	it("disposes the unmounted molecule after server rendering", async () => {
		const mounted = vi.fn();
		const disposed = vi.fn();
		const DemoMolecule = molecule(() => {
			onMount(() => {
				mounted();
			});
			onDispose(() => {
				disposed();
			});
			return { label: "server" };
		});

		function TestComponent() {
			const instance = useMolecule(DemoMolecule);
			return createElement("span", null, instance.label);
		}

		expect(renderToString(createElement(TestComponent))).toBe(
			"<span>server</span>",
		);
		expect(mounted).not.toHaveBeenCalled();
		expect(disposed).not.toHaveBeenCalled();

		await flushMicrotasks(2);

		expect(mounted).not.toHaveBeenCalled();
		expect(disposed).toHaveBeenCalledTimes(1);

		await flushMicrotasks(2);

		expect(disposed).toHaveBeenCalledTimes(1);
	});

	it("does not run mount-time watches during server rendering", async () => {
		const watchCallback = vi.fn();
		const DemoMolecule = molecule(() => {
			const count = signal(1);

			watch(
				count,
				(value) => {
					watchCallback(value);
				},
				{ immediate: true },
			);

			return { count };
		});

		function TestComponent() {
			const instance = useMolecule(DemoMolecule);
			return createElement("span", null, instance.count.value);
		}

		expect(renderToString(createElement(TestComponent))).toBe("<span>1</span>");

		await flushMicrotasks(2);

		expect(watchCallback).not.toHaveBeenCalled();
	});

	it("does not run watchEffect during string server rendering", async () => {
		const effectRuns = vi.fn();
		const DemoMolecule = molecule(() => {
			const count = signal(1);

			watchEffect(() => {
				effectRuns(count.value);
			});

			return { count };
		});

		function TestComponent() {
			const instance = useMolecule(DemoMolecule);
			return createElement("span", null, instance.count.value);
		}

		expect(renderToString(createElement(TestComponent))).toBe("<span>1</span>");

		await flushMicrotasks(2);

		expect(effectRuns).not.toHaveBeenCalled();
	});

	it("preserves the server contract for renderToPipeableStream", async () => {
		const mounted = vi.fn();
		const disposed = vi.fn();
		const watchCallback = vi.fn();
		const effectRuns = vi.fn();
		const DemoMolecule = molecule(() => {
			const count = signal(1);

			onMount(() => {
				mounted();
			});
			onDispose(() => {
				disposed();
			});
			watch(
				count,
				(value) => {
					watchCallback(value);
				},
				{ immediate: true },
			);
			watchEffect(() => {
				effectRuns(count.value);
			});

			return { count };
		});

		function TestComponent() {
			const instance = useMolecule(DemoMolecule);
			return createElement("span", null, instance.count.value);
		}

		expect(await renderPipeable(createElement(TestComponent))).toBe(
			"<span>1</span>",
		);
		expect(mounted).not.toHaveBeenCalled();
		expect(watchCallback).not.toHaveBeenCalled();
		expect(effectRuns).not.toHaveBeenCalled();

		await flushMicrotasks(2);

		expect(mounted).not.toHaveBeenCalled();
		expect(disposed).toHaveBeenCalledTimes(1);
		expect(watchCallback).not.toHaveBeenCalled();
		expect(effectRuns).not.toHaveBeenCalled();

		await flushMicrotasks(2);

		expect(disposed).toHaveBeenCalledTimes(1);
	});

	it("preserves the server contract for renderToReadableStream", async () => {
		const mounted = vi.fn();
		const disposed = vi.fn();
		const watchCallback = vi.fn();
		const effectRuns = vi.fn();
		const DemoMolecule = molecule(() => {
			const count = signal(1);

			onMount(() => {
				mounted();
			});
			onDispose(() => {
				disposed();
			});
			watch(
				count,
				(value) => {
					watchCallback(value);
				},
				{ immediate: true },
			);
			watchEffect(() => {
				effectRuns(count.value);
			});

			return { count };
		});

		function TestComponent() {
			const instance = useMolecule(DemoMolecule);
			return createElement("span", null, instance.count.value);
		}

		expect(await renderReadable(createElement(TestComponent))).toBe(
			"<span>1</span>",
		);
		expect(mounted).not.toHaveBeenCalled();
		expect(watchCallback).not.toHaveBeenCalled();
		expect(effectRuns).not.toHaveBeenCalled();

		await flushMicrotasks(2);

		expect(mounted).not.toHaveBeenCalled();
		expect(disposed).toHaveBeenCalledTimes(1);
		expect(watchCallback).not.toHaveBeenCalled();
		expect(effectRuns).not.toHaveBeenCalled();

		await flushMicrotasks(2);

		expect(disposed).toHaveBeenCalledTimes(1);
	});

	it("keeps Suspense retries safe for renderToPipeableStream", async () => {
		const fixture = createSuspenseRetryFixture();
		const stream = new PassThrough();
		let html = "";
		let disposedAtShell = -1;
		stream.on("data", (chunk: unknown) => {
			html += String(chunk);
		});

		await new Promise<void>((resolve, reject) => {
			const { pipe } = renderToPipeableStream(fixture.element, {
				onShellReady() {
					disposedAtShell = fixture.metrics.disposed;
					fixture.resolve("done");
				},
				onAllReady() {
					pipe(stream);
				},
				onError(error) {
					reject(error);
				},
			});

			stream.on("end", () => resolve());
			stream.on("error", reject);
		});

		await flushMicrotasks(2);

		expect(disposedAtShell).toBe(0);
		expect(fixture.metrics.renderAttempts).toBeGreaterThanOrEqual(2);
		expect(fixture.metrics.created).toBeGreaterThanOrEqual(2);
		expect(fixture.metrics.disposed).toBe(fixture.metrics.created);
		expect(fixture.metrics.mounted).toBe(0);
		expect(fixture.metrics.watchRuns).toBe(0);
		expect(fixture.metrics.effectRuns).toBe(0);
		expect(html).toContain("1:done");
	});

	it("keeps Suspense retries safe for renderToReadableStream", async () => {
		const fixture = createSuspenseRetryFixture();
		const stream = (await renderToReadableStream(fixture.element)) as Awaited<
			ReturnType<typeof renderToReadableStream>
		> & {
			allReady: Promise<void>;
		};
		const attemptsAfterShell = fixture.metrics.renderAttempts;
		const createdAfterShell = fixture.metrics.created;
		const disposedAfterShell = fixture.metrics.disposed;

		fixture.resolve("done");
		await stream.allReady;

		const html = await readReadableStream(stream);
		await flushMicrotasks(2);

		expect(attemptsAfterShell).toBe(1);
		expect(createdAfterShell).toBe(1);
		expect(disposedAfterShell).toBe(createdAfterShell);
		expect(fixture.metrics.renderAttempts).toBeGreaterThanOrEqual(2);
		expect(fixture.metrics.created).toBeGreaterThanOrEqual(2);
		expect(fixture.metrics.disposed).toBe(fixture.metrics.created);
		expect(fixture.metrics.mounted).toBe(0);
		expect(fixture.metrics.watchRuns).toBe(0);
		expect(fixture.metrics.effectRuns).toBe(0);
		expect(html).toContain("1:done");
	});
});
