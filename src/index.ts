/**
 * A TypeScript HTTP server library built on Fastify for Node.js >= 25.
 *
 * @packageDocumentation
 */

import defaultErrorHandler from "./defaults/defaultErrorHandler.ts"
import defaultFastifyOptions from "./defaults/defaultFastifyOptions.ts"
import defaultPlugins from "./defaults/defaultPlugins.ts"
import defaultRoutes from "./defaults/defaultRoutes.ts"
import { createAuthPreHandler } from "./hooks/authPreHandler.ts"
import onResponse from "./hooks/onResponse.ts"
import preHandler from "./hooks/preHandler.ts"
import launcher from "./launcher.ts"

export { createKeycloakVerifier } from "./auth/keycloak.ts"
export type {
    DefaultPluginsOptions,
    FSTPlugin,
    KeycloakAuthConfig,
    LauncherLocals,
    LauncherOptions,
    TokenVerifier,
} from "./types.ts"

export {
    createAuthPreHandler,
    defaultErrorHandler,
    defaultFastifyOptions,
    defaultPlugins,
    defaultRoutes,
    launcher,
    onResponse,
    preHandler,
}
