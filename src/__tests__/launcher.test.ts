import assert from "node:assert/strict"
import { afterEach, beforeEach, mock, suite, test } from "node:test"
import type { Logger } from "@logtape/logtape"
import launcher from "../launcher.ts"

await suite("launcher", () => {
    const logMock = mock.fn()

    const childLogger = { info: logMock } as unknown as Logger
    const logger = { getChild: () => childLogger } as unknown as Logger

    beforeEach(() => {
        logMock.mock.resetCalls()
    })

    afterEach(() => {
        mock.restoreAll()
    })

    test("should log 'Application is running'", () => {
        launcher(logger)

        const messages = logMock.mock.calls.map((c) => c.arguments[0])
        assert.ok(
            messages.some((m) => /Application is running/.test(String(m))),
        )
    })
})
