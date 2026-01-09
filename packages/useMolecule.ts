import { useEffect, useLayoutEffect, useRef } from "react";

const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

import type {
	MoleculeArgs,
	MoleculeFactory,
	MoleculeInstance,
} from "@sigrea/core";
import { disposeMolecule, mountMolecule, unmountMolecule } from "@sigrea/core";

interface MoleculeState<TReturn extends object, TProps extends object | void> {
	instance: MoleculeInstance<TReturn>;
	molecule: MoleculeFactory<TReturn, TProps>;
	subscribers: number;
	disposed: boolean;
	pendingDisposeToken: symbol | null;
}

export function useMolecule<
	TReturn extends object,
	TProps extends object | void = void,
>(
	molecule: MoleculeFactory<TReturn, TProps>,
	...args: MoleculeArgs<TProps>
): MoleculeInstance<TReturn> {
	const props = args.length === 0 ? undefined : (args[0] as TProps | undefined);

	if (props !== undefined && (typeof props !== "object" || props === null)) {
		throw new TypeError("useMolecule props must be an object.");
	}

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

		const snapshot =
			props === undefined ? undefined : ({ ...props } as Exclude<TProps, void>);

		const moleculeArgs =
			snapshot === undefined
				? ([] as MoleculeArgs<TProps>)
				: ([snapshot as TProps] as MoleculeArgs<TProps>);

		stateRef.current = {
			instance: molecule(...moleculeArgs),
			molecule,
			subscribers: 0,
			disposed: false,
			pendingDisposeToken: null,
		};
	}

	const state = stateRef.current;
	if (state === undefined) {
		throw new Error(
			"useMolecule failed to mount the requested molecule instance.",
		);
	}

	const instance = state.instance;

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
		};
	}, [instance]);

	return instance;
}
