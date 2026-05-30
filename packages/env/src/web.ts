import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	client: {
		VITE_SIM_HTTP: z.string().url().optional(),
		VITE_SIM_WS: z.string().url().optional(),
	},
	clientPrefix: "VITE_",
	runtimeEnv: {
		VITE_SIM_HTTP: import.meta.env.VITE_SIM_HTTP,
		VITE_SIM_WS: import.meta.env.VITE_SIM_WS,
	},
	emptyStringAsUndefined: true,
});
