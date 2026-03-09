import type { Server } from "node:net"
import { exit } from "node:process"
import type { Logger } from "@logtape/logtape"

/**
 * Gracefully closes the HTTP server and exits the process.
 *
 * - `code` is a number → exits with that code.
 * - `code` is a string → logs it as an interruption signal and exits with code 1.
 * - `code` is anything else → closes the server without exiting.
 *
 * @param logger - Logger for informational and error messages.
 * @param server - The Node.js `net.Server` (e.g. `fastify.server`) to close.
 * @param code - Exit code, signal name, or `undefined`.
 */
export default async function defaultInterruptionHandler(
    logger: Logger,
    server: Server,
    code: number | string | undefined,
): Promise<void> {
    server.close(() => logger.info("Server closed"))

    switch (typeof code) {
        case "number":
            exit(code)
            return
        case "string":
            logger.error(`Captured interruption signal: ${code}`)
            exit(1)
            return
        default:
            return
    }
}
