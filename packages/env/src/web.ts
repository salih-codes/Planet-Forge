import { createEnv } from "@t3-oss/env-core";

export const env = createEnv({
	// No client/server variables are declared yet; `runtimeEnv` is still required
	// by @t3-oss/env-core. Populate these as the app grows.
	client: {},
	clientPrefix: "VITE_",
	runtimeEnv: {},
	emptyStringAsUndefined: true,
});
