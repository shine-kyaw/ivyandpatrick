import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, isValidToken } from "./password";

export async function isUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return isValidToken(jar.get(COOKIE_NAME)?.value);
}
