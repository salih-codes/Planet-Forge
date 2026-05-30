import { Toaster } from "@planet-forge/ui/components/sonner";
import { TooltipProvider } from "@planet-forge/ui/components/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import "../index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false },
	},
});

export type RouterAppContext = Record<string, never>;

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{ title: "planet-forge" },
			{
				name: "description",
				content: "planet-forge is a web application",
			},
		],
		links: [{ rel: "icon", href: "/favicon.ico" }],
	}),
});

function RootComponent() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isForge = pathname === "/";

	return (
		<>
			<HeadContent />
			<QueryClientProvider client={queryClient}>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					disableTransitionOnChange
					storageKey="vite-ui-theme"
				>
					<TooltipProvider>
						{isForge ? (
							<Outlet />
						) : (
							<div className="grid h-svh grid-rows-[auto_1fr]">
								<Header />
								<Outlet />
							</div>
						)}
						<Toaster richColors />
					</TooltipProvider>
				</ThemeProvider>
			</QueryClientProvider>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
