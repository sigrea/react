import { useMemo, useState } from "react";

import { Counter } from "./Counter";

export function App() {
	const [showCounter, setShowCounter] = useState(true);
	const [initialCount, setInitialCount] = useState(0);
	const [step, setStep] = useState(1);

	const counterKey = useMemo(
		() => `${initialCount}:${step}:${showCounter ? "on" : "off"}`,
		[initialCount, step, showCounter],
	);

	const handleInitialChange = (value: number) => {
		setInitialCount(value);
	};

	const handleStepChange = (value: number) => {
		setStep(value <= 0 ? 1 : value);
	};

	return (
		<div className="app">
			<div className="playground">
				<header className="playground__header">
					<h1>Sigrea Playground</h1>
					<p>Adapter: React</p>
				</header>

				<section className="playground__controls">
					<button
						type="button"
						className="playground__toggle"
						onClick={() => setShowCounter((value) => !value)}
					>
						{showCounter ? "Unmount Counter" : "Mount Counter"}
					</button>

					<div className="playground__inputs">
						<label className="playground__input">
							<span>Initial count</span>
							<input
								type="number"
								value={initialCount}
								onChange={(event) =>
									handleInitialChange(
										Number.parseInt(event.target.value, 10) || 0,
									)
								}
							/>
						</label>
						<label className="playground__input">
							<span>Step</span>
							<input
								type="number"
								min={1}
								value={step}
								onChange={(event) =>
									handleStepChange(Number.parseInt(event.target.value, 10) || 1)
								}
							/>
						</label>
					</div>
				</section>

				<section className="playground__canvas">
					{showCounter ? (
						<Counter key={counterKey} initialCount={initialCount} step={step} />
					) : (
						<div className="playground__placeholder">
							Counter is currently unmounted.
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
