import { doesNotMatch, equal, match } from "node:assert/strict"
import { suite, test } from "node:test"
import type { FastifyReply, FastifyRequest } from "fastify"
import onResponse from "../hooks/onResponse.ts"

// ---------------------------------------------------------------------------
// Minimal request/reply builders that capture the emitted access-log line
// ---------------------------------------------------------------------------

type Captured = { level: "info" | "error"; line: string }

function makeRequest(
    overrides: Partial<{
        url: string
        method: string
        ip: string
        headers: Record<string, string | undefined>
    }> = {},
): FastifyRequest {
    return {
        ip: overrides.ip ?? "127.0.0.1",
        method: overrides.method ?? "GET",
        url: overrides.url ?? "/",
        raw: { httpVersion: "1.1" },
        headers: overrides.headers ?? {},
    } as unknown as FastifyRequest
}

function makeReply(statusCode: number, captured: Captured[]): FastifyReply {
    return {
        statusCode,
        elapsedTime: 1,
        getHeader: () => undefined,
        log: {
            info: (line: string) => captured.push({ level: "info", line }),
            error: (line: string) => captured.push({ level: "error", line }),
        },
    } as unknown as FastifyReply
}

suite("onResponse access logging", () => {
    test("emits a single info line for 2xx responses", async () => {
        const captured: Captured[] = []
        await onResponse(
            makeRequest({
                headers: { referer: "https://a", "user-agent": "ua" },
            }),
            makeReply(200, captured),
        )
        equal(captured.length, 1)
        equal(captured[0]?.level, "info")
        match(
            captured[0]?.line ?? "",
            /GET \/ HTTP\/1\.1 200 .* "https:\/\/a" "ua"/,
        )
    })

    test("emits an error line for 4xx/5xx responses", async () => {
        const captured: Captured[] = []
        await onResponse(makeRequest(), makeReply(500, captured))
        equal(captured[0]?.level, "error")
    })

    test("strips CR/LF from Referer and User-Agent to prevent forged log lines", async () => {
        const captured: Captured[] = []
        await onResponse(
            makeRequest({
                headers: {
                    referer: "https://evil\r\n127.0.0.1 -- GET /admin",
                    "user-agent": "ua\nINJECTED",
                },
            }),
            makeReply(200, captured),
        )
        const line = captured[0]?.line ?? ""
        // Exactly one log line: no embedded newline/carriage return survives.
        doesNotMatch(line, /[\r\n]/)
        equal(line.split("\n").length, 1)
        // The control bytes are replaced by the Unicode replacement character.
        match(line, /�/)
    })

    test("sanitizes control characters in the request URL", async () => {
        const captured: Captured[] = []
        await onResponse(
            makeRequest({ url: "/path\r\nfake-line" }),
            makeReply(404, captured),
        )
        const line = captured[0]?.line ?? ""
        doesNotMatch(line, /[\r\n]/)
        match(line, /\/path��fake-line/)
    })

    test("renders a dash when Referer and User-Agent are absent", async () => {
        const captured: Captured[] = []
        await onResponse(makeRequest(), makeReply(200, captured))
        match(captured[0]?.line ?? "", /"-" "-"$/)
    })
})
