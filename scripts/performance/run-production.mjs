import { spawn } from "node:child_process";

// Load privately without --env-file in execArgv: Next build workers reject that flag.
process.loadEnvFile(".env.performance-server.local");
const mode = process.argv[2];
if (!["build", "start"].includes(mode)) throw new Error("Use build or start");
const preload = mode === "start" && process.env.PERF_PROVIDER_TIMING === "true" ? ["--import", "./scripts/performance/provider-trace.mjs"] : [];
const child = spawn(process.execPath, [...preload, "node_modules/next/dist/bin/next", mode, ...(mode === "start" ? ["--port", "3100"] : [])], { env: process.env, stdio: "inherit" });
child.on("exit", code => { process.exitCode = code ?? 1; });
process.on("SIGINT", () => child.kill("SIGINT"));
