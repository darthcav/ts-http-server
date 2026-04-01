/**
 * A TypeScript HTTP server library built on Fastify for Node.js >= 25.
 *
 * @packageDocumentation
 */

import defaultErrorHandler from "./defaults/defaultErrorHandler.ts"
import defaultFastifyOptions from "./defaults/defaultFastifyOptions.ts"
import defaultPlugins from "./defaults/defaultPlugins.ts"
import defaultRoutes from "./defaults/defaultRoutes.ts"
import onResponse from "./hooks/onResponse.ts"
import preHandler from "./hooks/preHandler.ts"
import launcher from "./launcher.ts"

export { createKeycloakVerifier } from "./auth/keycloak.ts"
export type {
    DefaultPluginsOptions,
    DefaultRoutesOptions,
    FSTPlugin,
    KeycloakAuthConfig,
    LauncherLocals,
    LauncherOptions,
    TokenVerifier,
} from "./types.ts"

export {
    defaultErrorHandler,
    defaultFastifyOptions,
    defaultPlugins,
    defaultRoutes,
    launcher,
    onResponse,
    preHandler,
}
