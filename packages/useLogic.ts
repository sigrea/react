import { useEffect, useRef } from "react";

import type { LogicArgs, LogicFunction, LogicInstance } from "@sigrea/core";
import { cleanupLogic, mountLogic } from "@sigrea/core";

interface LogicState<TReturn extends object, TProps> {
	instance: LogicInstance<TReturn>;
	logic: LogicFunction<TReturn, TProps>;
	props: TProps | undefined;
	subscribers: number;
	disposed: boolean;
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
			subscribers: 0,
			disposed: false,
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

		state.subscribers += 1;

		return () => {
			const latest = stateRef.current;
			if (latest === undefined || latest.instance !== instance) {
				cleanupLogic(instance);
				return;
			}

			latest.subscribers -= 1;
			if (latest.subscribers < 0) {
				latest.subscribers = 0;
			}

			if (!latest.disposed && latest.subscribers === 0) {
				latest.disposed = true;
				stateRef.current = undefined;
				cleanupLogic(instance);
			}
		};
	}, [instance]);

	return instance;
}
