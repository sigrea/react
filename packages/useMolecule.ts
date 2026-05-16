import type { DependencyList, MutableRefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

const hasDocument = typeof globalThis.document !== "undefined";
const useIsomorphicLayoutEffect = hasDocument ? useLayoutEffect : useEffect;
const isServerEnvironment = !hasDocument;

import type {
	IsAllOptional,
	MoleculeArgs,
	MoleculeFactory,
	MoleculeInstance,
	MoleculePropsGetter,
	ResolvedMoleculeProps,
} from "@sigrea/core";
import {
	disposeMolecule,
	mountMolecule,
	unmountMolecule,
	updateMoleculeProps,
} from "@sigrea/core";

interface MoleculeState<TReturn extends object, TProps extends object | void> {
	instance: MoleculeInstance<TReturn, TProps>;
	molecule: MoleculeFactory<TReturn, TProps>;
	subscribers: number;
	disposed: boolean;
	pendingDisposeToken: symbol | null;
	livePropsDeps: DependencyList | undefined;
}

type StaticMoleculeProps<
	TProps extends object | void,
	TSource,
> = TSource extends (...args: never[]) => unknown
	? never
	: TSource & ResolvedMoleculeProps<TProps>;

type ReactMoleculeArgs<
	TProps extends object | void,
	TSource = ResolvedMoleculeProps<TProps>,
> = TProps extends void
	? []
	: IsAllOptional<TProps> extends true
		?
				| [props?: StaticMoleculeProps<TProps, TSource>]
				| [props: MoleculePropsGetter<TProps>, deps: DependencyList]
		:
				| [props: StaticMoleculeProps<TProps, TSource>]
				| [props: MoleculePropsGetter<TProps>, deps: DependencyList];

function schedulePendingDispose<
	TReturn extends object,
	TProps extends object | void,
>(
	stateRef: MutableRefObject<MoleculeState<TReturn, TProps> | undefined>,
	instance: MoleculeInstance<TReturn, TProps>,
	token: symbol,
): void {
	queueMicrotask(() => {
		const current = stateRef.current;
		if (
			current === undefined ||
			current.instance !== instance ||
			current.subscribers > 0 ||
			current.disposed ||
			current.pendingDisposeToken !== token
		) {
			return;
		}

		current.disposed = true;
		current.pendingDisposeToken = null;
		stateRef.current = undefined;
		disposeMolecule(instance);
	});
}

export function useMolecule<
	TReturn extends object,
	TProps extends object | void = void,
	TSource = ResolvedMoleculeProps<TProps>,
>(
	molecule: MoleculeFactory<TReturn, TProps>,
	...args: ReactMoleculeArgs<TProps, TSource>
): MoleculeInstance<TReturn, TProps> {
	const propsSource = args[0];
	const propsDeps = resolvePropsDeps(propsSource, args[1]);

	const stateRef = useRef<MoleculeState<TReturn, TProps> | undefined>(
		undefined,
	);

	const currentState = stateRef.current;
	const shouldRemount =
		currentState === undefined || currentState.molecule !== molecule;

	if (shouldRemount) {
		if (currentState !== undefined) {
			currentState.pendingDisposeToken = null;
			disposeMolecule(currentState.instance);
			stateRef.current = undefined;
		}

		const initialProps = resolveProps(propsSource);
		const moleculeArgs =
			initialProps === undefined
				? ([] as MoleculeArgs<TProps>)
				: ([initialProps as TProps] as MoleculeArgs<TProps>);

		const nextState: MoleculeState<TReturn, TProps> = {
			instance: molecule(...moleculeArgs),
			molecule,
			subscribers: 0,
			disposed: false,
			pendingDisposeToken: null,
			livePropsDeps:
				propsDeps === undefined ? undefined : snapshotDependencies(propsDeps),
		};
		stateRef.current = nextState;

		if (isServerEnvironment) {
			const token = Symbol("pending-server-dispose");
			nextState.pendingDisposeToken = token;
			schedulePendingDispose(stateRef, nextState.instance, token);
		}
	}

	const state = stateRef.current;
	if (state === undefined) {
		throw new Error(
			"useMolecule failed to mount the requested molecule instance.",
		);
	}

	const instance = state.instance;

	useIsomorphicLayoutEffect(() => {
		if (!isPropsGetter<TProps, TSource>(propsSource)) {
			return;
		}
		if (propsDeps === undefined) {
			return;
		}

		const state = stateRef.current;
		if (state === undefined || state.instance !== instance) {
			return;
		}

		if (areDependencyListsEqual(state.livePropsDeps, propsDeps)) {
			return;
		}

		updateMoleculeProps(instance, resolvePropsForUpdate(propsSource));
		state.livePropsDeps = snapshotDependencies(propsDeps);
	}, [instance, ...(propsDeps ?? [])]);

	useIsomorphicLayoutEffect(() => {
		const state = stateRef.current;
		if (state === undefined || state.instance !== instance) {
			return () => {};
		}

		if (state.pendingDisposeToken !== null) {
			state.pendingDisposeToken = null;
		}

		state.subscribers += 1;
		if (state.subscribers === 1) {
			mountMolecule(instance);
		}

		return () => {
			const latest = stateRef.current;
			if (latest === undefined || latest.instance !== instance) {
				disposeMolecule(instance);
				return;
			}

			latest.subscribers -= 1;
			if (latest.subscribers < 0) {
				latest.subscribers = 0;
			}

			if (!latest.disposed && latest.subscribers === 0) {
				unmountMolecule(instance);

				const token = Symbol("pending-dispose");
				latest.pendingDisposeToken = token;
				schedulePendingDispose(stateRef, instance, token);
			}
		};
	}, [instance]);

	return instance;
}

function resolveProps<
	TProps extends object | void,
	TSource = ResolvedMoleculeProps<TProps>,
>(
	source: ReactMoleculeArgs<TProps, TSource>[0],
): Exclude<TProps, void> | undefined {
	const props = typeof source === "function" ? source() : source;
	if (props !== undefined && (typeof props !== "object" || props === null)) {
		throw new TypeError("useMolecule props must be an object.");
	}
	return props as Exclude<TProps, void> | undefined;
}

function resolvePropsForUpdate<
	TProps extends object | void,
	TSource = ResolvedMoleculeProps<TProps>,
>(
	source: ReactMoleculeArgs<TProps, TSource>[0],
): ResolvedMoleculeProps<TProps> {
	return (resolveProps<TProps, TSource>(source) ??
		{}) as ResolvedMoleculeProps<TProps>;
}

function isPropsGetter<
	TProps extends object | void,
	TSource = ResolvedMoleculeProps<TProps>,
>(
	source: ReactMoleculeArgs<TProps, TSource>[0],
): source is Extract<ReactMoleculeArgs<TProps, TSource>[0], () => object> {
	return typeof source === "function";
}

function resolvePropsDeps<
	TProps extends object | void,
	TSource = ResolvedMoleculeProps<TProps>,
>(
	source: ReactMoleculeArgs<TProps, TSource>[0],
	deps: DependencyList | undefined,
): DependencyList | undefined {
	if (!isPropsGetter<TProps, TSource>(source)) {
		return undefined;
	}

	if (!Array.isArray(deps)) {
		throw new TypeError(
			"useMolecule props getter in React requires a dependency list.",
		);
	}

	return deps;
}

function snapshotDependencies(deps: DependencyList): DependencyList {
	return [...deps];
}

function areDependencyListsEqual(
	current: DependencyList | undefined,
	next: DependencyList | undefined,
): boolean {
	if (current === undefined || next === undefined) {
		return current === next;
	}

	if (current.length !== next.length) {
		return false;
	}

	for (let index = 0; index < current.length; index += 1) {
		if (!Object.is(current[index], next[index])) {
			return false;
		}
	}

	return true;
}
