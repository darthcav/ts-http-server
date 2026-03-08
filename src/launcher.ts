import type { Logger } from "@logtape/logtape"

/**
 * Application launcher invoked by `main` after process lifecycle
 * handlers have been set up.
 *
 * @param logger - Logger instance provided by the bootstrap process.
 */
export default function (logger: Logger): void {
    const __logger = logger.getChild("launcher")
    __logger.info(`Application is running`)
    // start servers, connect to databases, etc.
}
