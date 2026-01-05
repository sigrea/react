import { useMolecule, useSignal } from "@sigrea/react";
import { CounterMolecule, type CounterProps } from "./CounterMolecule";

export function Counter(props: CounterProps) {
	const counter = useMolecule(CounterMolecule, props);
	const count = useSignal(counter.count);
	const step = useSignal(counter.step);

	return (
		<div className="counter">
			<p className="counter__value">
				<span className="counter__value-label">Count</span>
				<span className="counter__value-number">{count}</span>
			</p>
			<p className="counter__value">
				<span className="counter__value-label">Step</span>
				<span className="counter__value-number">{step}</span>
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
						counter.setCount(next);
					}}
				/>
			</label>
			<label className="counter__input">
				<span>Live step</span>
				<input
					type="number"
					min={1}
					value={step}
					onChange={(event) => {
						const next = Number.parseInt(event.target.value, 10) || 1;
						counter.setStep(next <= 0 ? 1 : next);
					}}
				/>
			</label>
		</div>
	);
}
