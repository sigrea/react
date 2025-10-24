import path from "node:path";
import react from "@vitejs/plugin-react";
// @ts-nocheck
import { defineConfig } from "vite";

const rootDir = __dirname;
const projectRoot = path.resolve(rootDir, "..");

export default defineConfig({
	root: rootDir,
	plugins: [react()],
	server: {
		fs: {
			allow: [projectRoot],
		},
	},
	resolve: {
		alias: {
			"@sigrea/react": path.resolve(projectRoot, "index.ts"),
		},
	},
	build: {
		outDir: path.resolve(rootDir, "dist"),
		emptyOutDir: true,
	},
});
