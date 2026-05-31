import { spawnSync } from "node:child_process";

const isWin = process.platform === "win32";
const bashCmd = isWin ? '"C:\\Program Files\\Git\\bin\\bash.exe"' : "bash";

console.log(`Executing bundle script using: ${bashCmd}`);
const result = spawnSync(bashCmd, ["scripts/bundle.sh"], {
	stdio: "inherit",
	shell: true,
});
process.exit(result.status ?? 0);
