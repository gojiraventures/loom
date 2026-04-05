// Next.js only executes middleware from this exact file.
// proxy.ts was previously the middleware but was renamed, breaking all auth protection.
export { proxy as middleware, config } from './proxy';
