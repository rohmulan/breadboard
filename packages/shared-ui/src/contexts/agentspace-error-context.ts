import { createContext } from "@lit/context";


export interface AgentspaceErrorContent {
    error?: unknown;
}

// Url context
export const agentspaceErrorContext = createContext<AgentspaceErrorContent>(Symbol('bb-agentsapce-error-context'));
