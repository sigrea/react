import { defineBuildConfig } from "unbuild";

const clientDirective = '"use client";';

export default defineBuildConfig({
	entries: ["index"],
	clean: true,
	declaration: true,
	rollup: {
		emitCJS: true,
		output: {
			banner: clientDirective,
		},
	},
});
