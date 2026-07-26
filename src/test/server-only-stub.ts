/**
 * Test stub for the `server-only` package.
 *
 * `server-only` deliberately throws when imported outside a React Server
 * Component so server code can never be bundled into the client. Unit tests
 * import those modules directly in Node, so vitest aliases the package here.
 */
export {};
