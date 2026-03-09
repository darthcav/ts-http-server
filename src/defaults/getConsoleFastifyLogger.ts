import {
    getLogTapeFastifyLogger,
    type PinoLevel,
    type PinoLikeLogger,
} from "@logtape/fastify"

/**
 * Returns a {@link PinoLikeLogger} for Fastify scoped to the given category.
 *
 * Assumes LogTape has already been configured by the caller (e.g. via
 * `getConsoleLogger`). All records at or above `level` are forwarded
 * by Fastify to the active LogTape sinks.
 *
 * @param name - Logger category array passed to {@link getLogTapeFastifyLogger}
 *   (e.g. `["my-app", "fastify"]`).
 * @param level - Minimum Pino log level to pass through. Defaults to `"info"`.
 * @returns A Pino-compatible logger backed by LogTape.
 */
export default function getConsoleFastifyLogger(
    name: string[],
    level: PinoLevel = "info",
): PinoLikeLogger {
    return getLogTapeFastifyLogger({
        category: name,
        level,
    })
}
