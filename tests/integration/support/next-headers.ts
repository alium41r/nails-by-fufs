/** Stand-in for next/headers: hands the real cookie-jar contents to the client. */
type Cookie = { name: string; value: string };

let jar: Cookie[] = [];

export function setCookieJar(cookies: Cookie[]) {
  jar = cookies;
}

export async function cookies() {
  return {
    getAll: () => jar,
    get: (name: string) => jar.find((c) => c.name === name),
    set: () => undefined,
    delete: () => undefined,
    has: (name: string) => jar.some((c) => c.name === name),
  };
}

export async function headers() {
  return new Headers();
}
