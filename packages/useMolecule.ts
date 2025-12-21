import { useEffect, useRef } from "react";

import type {
	MoleculeArgs,
	MoleculeFactory,
	MoleculeInstance,
} from "@sigrea/core";
import { disposeMolecule } from "@sigrea/core";

interface MoleculeState<TReturn extends object, TProps> {
	instance: MoleculeInstance<TReturn>;
	molecule: MoleculeFactory<TReturn, TProps>;
	props: TProps | undefined;
	subscribers: number;
	disposed: boolean;
	pendingDisposeToken: symbol | null;
}

export function useMolecule<TReturn extends object, TProps = void>(
	molecule: MoleculeFactory<TReturn, TProps>,
	...args: MoleculeArgs<TProps>
): MoleculeInstance<TReturn> {
	const props = args.length === 0 ? undefined : (args[0] as TProps | undefined);
	const stateRef = useRef<MoleculeState<TReturn, TProps> | undefined>(
		undefined,
	);

	const currentState = stateRef.current;
	const shouldRemount =
		currentState === undefined ||
		currentState.molecule !== molecule ||
		!Object.is(currentState.props, props);

	if (shouldRemount) {
		if (currentState !== undefined) {
			currentState.pendingDisposeToken = null;
			disposeMolecule(currentState.instance);
			stateRef.current = undefined;
		}

		const moleculeArgs =
			props === undefined
				? ([] as MoleculeArgs<TProps>)
				: ([props] as unknown as MoleculeArgs<TProps>);

		stateRef.current = {
			instance: molecule(...moleculeArgs),
			molecule,
			props,
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

	useEffect(() => {
		const state = stateRef.current;
		if (state === undefined || state.instance !== instance) {
			return () => {};
		}

		if (state.pendingDisposeToken !== null) {
			state.pendingDisposeToken = null;
		}

		state.subscribers += 1;

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
