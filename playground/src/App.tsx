import { useState } from "react";

import { Counter } from "./Counter";

export function App() {
	const [showCounter, setShowCounter] = useState(true);
	const [initialCount, setInitialCount] = useState(0);
	const [initialStep, setInitialStep] = useState(1);

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
								disabled={showCounter}
								value={initialCount}
								onChange={(event) =>
									setInitialCount(Number.parseInt(event.target.value, 10) || 0)
								}
							/>
						</label>
						<label className="playground__input">
							<span>Initial step</span>
							<input
								type="number"
								min={1}
								disabled={showCounter}
								value={initialStep}
								onChange={(event) =>
									setInitialStep(() => {
										const next = Number.parseInt(event.target.value, 10) || 1;
										return next <= 0 ? 1 : next;
									})
								}
							/>
						</label>
					</div>
				</section>

				<section className="playground__canvas">
					{showCounter ? (
						<Counter initialCount={initialCount} initialStep={initialStep} />
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
