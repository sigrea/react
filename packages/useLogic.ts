import { useEffect, useRef } from "react";

import type { LogicArgs, LogicFunction, LogicInstance } from "@sigrea/core";
import { cleanupLogic, mountLogic } from "@sigrea/core";

const scheduleMicrotask = (callback: () => void) => {
	if (typeof globalThis.queueMicrotask === "function") {
		globalThis.queueMicrotask(callback);
		return;
	}

	Promise.resolve().then(callback);
};

interface LogicState<TReturn extends object, TProps> {
	instance: LogicInstance<TReturn>;
	logic: LogicFunction<TReturn, TProps>;
	props: TProps | undefined;
	cleanupScheduled: boolean;
	cleanupToken: number;
}

export function useLogic<TReturn extends object, TProps = void>(
	logic: LogicFunction<TReturn, TProps>,
	...args: LogicArgs<TProps>
): LogicInstance<TReturn> {
	const props = args.length === 0 ? undefined : (args[0] as TProps | undefined);
	const stateRef = useRef<LogicState<TReturn, TProps> | undefined>(undefined);

	const currentState = stateRef.current;
	const shouldRemount =
		currentState === undefined ||
		currentState.logic !== logic ||
		!Object.is(currentState.props, props);

	if (shouldRemount) {
		if (currentState !== undefined) {
			cleanupLogic(currentState.instance);
			stateRef.current = undefined;
		}

		const logicArgs =
			props === undefined
				? ([] as LogicArgs<TProps>)
				: ([props] as unknown as LogicArgs<TProps>);

		stateRef.current = {
			instance: mountLogic(logic, ...logicArgs),
			logic,
			props,
			cleanupScheduled: false,
			cleanupToken: 0,
		};
	}

	const state = stateRef.current;
	if (state === undefined) {
		throw new Error("useLogic failed to mount the requested logic instance.");
	}

	const instance = state.instance;

	useEffect(() => {
		const state = stateRef.current;
		if (state === undefined || state.instance !== instance) {
			return () => {};
		}

		state.cleanupScheduled = false;

		return () => {
			const latest = stateRef.current;
			if (latest === undefined || latest.instance !== instance) {
				cleanupLogic(instance);
				return;
			}

			latest.cleanupScheduled = true;
			const token = latest.cleanupToken + 1;
			latest.cleanupToken = token;

			scheduleMicrotask(() => {
				const updated = stateRef.current;
				if (
					updated === undefined ||
					updated.instance !== instance ||
					!updated.cleanupScheduled ||
					updated.cleanupToken !== token
				) {
					return;
				}

				updated.cleanupScheduled = false;
				stateRef.current = undefined;
				cleanupLogic(instance);
			});
		};
	}, [instance]);

	return instance;
}
