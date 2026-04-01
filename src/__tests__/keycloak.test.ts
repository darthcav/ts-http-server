import { equal } from "node:assert/strict"
import type { Server } from "node:http"
import { createServer } from "node:http"
import { after, before, suite, test } from "node:test"
import { exportJWK, generateKeyPair, SignJWT } from "jose"
import { createKeycloakVerifier } from "../auth/keycloak.ts"

// ---------------------------------------------------------------------------
// Mock JWKS server + key pair used across all tests in this suite
// ---------------------------------------------------------------------------

suite("createKeycloakVerifier", () => {
    const mockPort = 19010
    const mockBaseUrl = `http://localhost:${mockPort}`
    const testRealm = "test-realm"
    const issuer = `${mockBaseUrl}/realms/${testRealm}`
    const config = {
        url: mockBaseUrl,
        realm: testRealm,
        clientId: "test-client",
        clientSecret: "test-secret",
    }

    let privateKey!: CryptoKey
    let jwksServer!: Server

    before(async () => {
        const keyPair = await generateKeyPair("RS256")
        privateKey = keyPair.privateKey
        const publicJwk = await exportJWK(keyPair.publicKey)
        publicJwk.kid = "test-key-1"
        publicJwk.use = "sig"
        publicJwk.alg = "RS256"

        const jwksBody = JSON.stringify({ keys: [publicJwk] })
        const certsPath = `/realms/${testRealm}/protocol/openid-connect/certs`

        jwksServer = createServer((_req, res) => {
            if (_req.url === certsPath) {
                res.writeHead(200, { "Content-Type": "application/json" })
                res.end(jwksBody)
            } else {
                res.writeHead(404)
                res.end()
            }
        })
        await new Promise<void>((resolve) => {
            jwksServer.listen(mockPort, resolve)
        })
    })

    after(async () => {
        await new Promise<void>((resolve, reject) => {
            jwksServer.close((err) => (err ? reject(err) : resolve()))
        })
    })

    /** Creates a valid JWT signed with the test key. */
    async function validToken(): Promise<string> {
        return new SignJWT({})
            .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
            .setIssuer(issuer)
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(privateKey)
    }

    test("returns false for undefined Authorization header", async () => {
        const verify = createKeycloakVerifier(config)
        equal(await verify(undefined), false)
    })

    test("returns false when Authorization does not start with 'Bearer '", async () => {
        const verify = createKeycloakVerifier(config)
        equal(await verify("Basic abc123"), false)
        equal(await verify("bearer token"), false)
    })

    test("returns true for a valid signed JWT", async () => {
        const verify = createKeycloakVerifier(config)
        equal(await verify(`Bearer ${await validToken()}`), true)
    })

    test("returns false for a JWT with wrong issuer", async () => {
        const verify = createKeycloakVerifier(config)
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
            .setIssuer("https://wrong.example.com/realms/other")
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(privateKey)
        equal(await verify(`Bearer ${token}`), false)
    })

    test("returns false for an expired JWT", async () => {
        const verify = createKeycloakVerifier(config)
        const now = Math.floor(Date.now() / 1000)
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
            .setIssuer(issuer)
            .setIssuedAt(now - 120)
            .setExpirationTime(now - 60)
            .sign(privateKey)
        equal(await verify(`Bearer ${token}`), false)
    })

    test("returns false for a malformed token string", async () => {
        const verify = createKeycloakVerifier(config)
        equal(await verify("Bearer not-a-real-jwt"), false)
    })

    test("strips trailing slash from base URL", async () => {
        const verify = createKeycloakVerifier({
            ...config,
            url: `${mockBaseUrl}/`,
        })
        equal(await verify(`Bearer ${await validToken()}`), true)
    })
})
