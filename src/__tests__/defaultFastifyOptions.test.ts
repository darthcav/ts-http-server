import { equal } from "node:assert/strict"
import { suite, test } from "node:test"
import type { Logger } from "@logtape/logtape"
import defaultFastifyOptions from "../defaults/defaultFastifyOptions.ts"

const noop = (): void => {}
const testLogger = {
    category: ["test"],
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    getChild: () => testLogger,
} as unknown as Logger

suite("defaultFastifyOptions", () => {
    test("disables proxy trust by default", () => {
        const opts = defaultFastifyOptions(testLogger)
        equal(opts.trustProxy, false)
    })

    test("disables Fastify's built-in per-request logging", () => {
        const opts = defaultFastifyOptions(testLogger)
        equal(opts.disableRequestLogging, true)
    })

    test("provides a request id generator", () => {
        const opts = defaultFastifyOptions(testLogger)
        equal(typeof opts.genReqId, "function")
    })
})
