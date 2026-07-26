/**
 * Sentinel value posted by masked secret inputs the admin did not edit.
 * Kept in its own module so both the "use server" action and the client form
 * can import it ("use server" files may only export async functions).
 */
export const UNCHANGED_SECRET = "__UNCHANGED__";
