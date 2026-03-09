/**
 * A TypeScript HTTP server library built on Fastify for Node.js >= 25.
 *
 * @packageDocumentation
 */

import defaultFastifyOptions from "./defaults/defaultFastifyOptions.ts"
import defaultPlugins from "./defaults/defaultPlugins.ts"
import defaultRoutes from "./defaults/defaultRoutes.ts"
import defaultErrorHandler from "./handlers/defaultErrorHandler.ts"
import defaultInterruptionHandler from "./handlers/defaultInterruptionHandler.ts"
import defaultNotFoundHandler from "./handlers/defaultNotFoundHandler.ts"
import onResponse from "./hooks/onResponse.ts"
import preHandler from "./hooks/preHandler.ts"
import launcher from "./launcher.ts"

export type {
    FSTPlugin,
    LauncherLocals,
    LauncherOptions,
} from "./types.ts"
export {
    defaultErrorHandler,
    defaultFastifyOptions,
    defaultInterruptionHandler,
    defaultNotFoundHandler,
    defaultPlugins,
    defaultRoutes,
    launcher,
    preHandler,
    onResponse,
}
