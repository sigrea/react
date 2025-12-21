import { useMemo } from "react";

import { useMolecule, useSignal } from "@sigrea/react";
import { CounterMolecule, type CounterProps } from "./CounterMolecule";

export function Counter(props: CounterProps) {
	const { initialCount, step } = props;
	const moleculeProps = useMemo(
		() => ({ initialCount, step }),
		[initialCount, step],
	);

	const counter = useMolecule(CounterMolecule, moleculeProps);
	const count = useSignal(counter.count);

	return (
		<div className="counter">
			<p className="counter__value">
				<span className="counter__value-label">Count</span>
				<span className="counter__value-number">{count}</span>
			</p>
			<div className="counter__controls">
				<button
					type="button"
					className="counter__button"
					onClick={() => counter.decrement()}
				>
					Decrement
				</button>
				<button
					type="button"
					className="counter__button"
					onClick={() => counter.reset()}
				>
					Reset
				</button>
				<button
					type="button"
					className="counter__button"
					onClick={() => counter.increment()}
				>
					Increment
				</button>
			</div>
			<label className="counter__input">
				<span>Manual update</span>
				<input
					type="number"
					value={count}
					onChange={(event) => {
						const next = Number.parseInt(event.target.value, 10) || 0;
						counter.count.value = next;
					}}
				/>
			</label>
		</div>
	);
}
