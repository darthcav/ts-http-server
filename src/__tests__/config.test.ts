import { deepEqual, equal, match, ok } from "node:assert/strict"
import { suite, test } from "node:test"
import type { Assert, Equal } from "asserttt"
import { type AppConfig, readConfig } from "../config.ts"

suite("readConfig — TRUST_PROXY", () => {
    test("omits trustProxy when the variable is unset", () => {
        const config = readConfig({})
        equal("trustProxy" in config, false)
        deepEqual(config.warnings, [])
    })

    test("omits trustProxy for an empty or whitespace-only value", () => {
        equal("trustProxy" in readConfig({ TRUST_PROXY: "" }), false)
        equal("trustProxy" in readConfig({ TRUST_PROXY: "   " }), false)
    })

    test("omits trustProxy for the literal `false`", () => {
        const config = readConfig({ TRUST_PROXY: "false" })
        equal("trustProxy" in config, false)
        deepEqual(config.warnings, [])
    })

    test("enables proxy trust for the literal `true`", () => {
        equal(readConfig({ TRUST_PROXY: "true" }).trustProxy, true)
    })

    test("passes an IP/CIDR allowlist through verbatim", () => {
        equal(
            readConfig({ TRUST_PROXY: "127.0.0.1,10.0.0.0/8" }).trustProxy,
            "127.0.0.1,10.0.0.0/8",
        )
    })

    test("trims surrounding whitespace before parsing", () => {
        equal(readConfig({ TRUST_PROXY: "  true  " }).trustProxy, true)
        equal(
            readConfig({ TRUST_PROXY: " 127.0.0.1 " }).trustProxy,
            "127.0.0.1",
        )
    })

    test("rejects a hop count and warns, leaving proxy trust disabled", () => {
        const config = readConfig({ TRUST_PROXY: "1" })
        equal("trustProxy" in config, false)
        equal(config.warnings.length, 1)
        match(String(config.warnings[0]), /hop counts are not supported/)
        match(String(config.warnings[0]), /Received: 1$/)
    })

    test("rejects a multi-digit hop count", () => {
        const config = readConfig({ TRUST_PROXY: "42" })
        equal("trustProxy" in config, false)
        equal(config.warnings.length, 1)
    })

    test("treats `0` as a hop count rather than a disable switch", () => {
        const config = readConfig({ TRUST_PROXY: "0" })
        equal("trustProxy" in config, false)
        equal(config.warnings.length, 1)
    })

    test("does not warn for an allowlist that merely starts with digits", () => {
        const config = readConfig({ TRUST_PROXY: "10.0.0.0/8" })
        equal(config.trustProxy, "10.0.0.0/8")
        deepEqual(config.warnings, [])
    })

    test("narrows trustProxy to boolean | string, never number", () => {
        type _TrustProxyIsNeverNumeric = Assert<
            Equal<AppConfig["trustProxy"], boolean | string | undefined>
        >
        equal("trustProxy" in readConfig({ TRUST_PROXY: "7" }), false)
    })
})

suite("readConfig — ENABLE_DOCS", () => {
    test("omits docs when unset, deferring to defaultPlugins", () => {
        equal("docs" in readConfig({}), false)
    })

    test("maps `true` and `false` to the matching boolean", () => {
        equal(readConfig({ ENABLE_DOCS: "true" }).docs, true)
        equal(readConfig({ ENABLE_DOCS: "false" }).docs, false)
    })

    test("omits docs for an unrecognised value", () => {
        equal("docs" in readConfig({ ENABLE_DOCS: "yes" }), false)
    })
})

suite("readConfig — API_AUTH_PATHS", () => {
    test("omits authPaths when unset", () => {
        equal("authPaths" in readConfig({}), false)
    })

    test("splits, trims, and drops empty entries", () => {
        deepEqual(
            readConfig({ API_AUTH_PATHS: " /api/** , /admin/** " }).authPaths,
            ["/api/**", "/admin/**"],
        )
    })

    test("omits authPaths when every entry is empty", () => {
        equal("authPaths" in readConfig({ API_AUTH_PATHS: " , , " }), false)
    })
})

suite("readConfig — Keycloak", () => {
    const full = {
        KEYCLOAK_URL: "https://auth.example.com",
        KEYCLOAK_REALM: "myrealm",
        KEYCLOAK_CLIENT_ID: "myclient",
    }

    test("builds the config only when all three variables are present", () => {
        deepEqual(readConfig(full).keycloakAuth, {
            url: "https://auth.example.com",
            realm: "myrealm",
            clientId: "myclient",
        })
    })

    test("omits keycloakAuth when any variable is missing", () => {
        for (const key of Object.keys(full)) {
            const partial = { ...full, [key]: "" }
            equal("keycloakAuth" in readConfig(partial), false)
        }
    })

    test("trims surrounding whitespace on each value", () => {
        deepEqual(
            readConfig({
                KEYCLOAK_URL: "  https://auth.example.com  ",
                KEYCLOAK_REALM: " myrealm ",
                KEYCLOAK_CLIENT_ID: " myclient ",
            }).keycloakAuth,
            {
                url: "https://auth.example.com",
                realm: "myrealm",
                clientId: "myclient",
            },
        )
    })

    test("sets authRealm from KEYCLOAK_REALM alone, without the other variables", () => {
        const config = readConfig({ KEYCLOAK_REALM: "myrealm" })
        equal(config.authRealm, "myrealm")
        equal("keycloakAuth" in config, false)
    })

    test("omits authRealm when KEYCLOAK_REALM is unset", () => {
        equal("authRealm" in readConfig({}), false)
    })
})

suite("readConfig — host and port", () => {
    test("defaults to localhost:8888", () => {
        const config = readConfig({})
        equal(config.host, "localhost")
        equal(config.port, 8888)
    })

    test("reads HOST and CONTAINER_EXPOSE_PORT", () => {
        const config = readConfig({
            HOST: "0.0.0.0",
            CONTAINER_EXPOSE_PORT: "3000",
        })
        equal(config.host, "0.0.0.0")
        equal(config.port, 3000)
    })

    test("falls back to 8888 for a non-numeric or zero port", () => {
        equal(readConfig({ CONTAINER_EXPOSE_PORT: "abc" }).port, 8888)
        equal(readConfig({ CONTAINER_EXPOSE_PORT: "0" }).port, 8888)
    })
})

suite("readConfig — purity", () => {
    test("does not mutate the environment object it is given", () => {
        const env = { TRUST_PROXY: "1", HOST: "0.0.0.0" }
        readConfig(env)
        deepEqual(env, { TRUST_PROXY: "1", HOST: "0.0.0.0" })
    })

    test("returns a fresh warnings array per call", () => {
        const first = readConfig({ TRUST_PROXY: "1" })
        const second = readConfig({ TRUST_PROXY: "2" })
        ok(first.warnings !== second.warnings)
        equal(first.warnings.length, 1)
        equal(second.warnings.length, 1)
    })
})
