import { APIRequestContext, APIResponse } from '@playwright/test';

export async function expectStatus(
  response: APIResponse,
  expected: number
): Promise<void> {
  if (response.status() !== expected) {
    const body = await response.text();
    throw new Error(
      `Expected status ${expected} but got ${response.status()}.\nBody: ${body}`
    );
  }
}

export async function postJSON<T>(
  request: APIRequestContext,
  url: string,
  data: unknown
): Promise<T> {
  const response = await request.post(url, { data });
  await expectStatus(response, 200);
  return response.json() as Promise<T>;
}

export async function getJSON<T>(
  request: APIRequestContext,
  url: string
): Promise<T> {
  const response = await request.get(url);
  await expectStatus(response, 200);
  return response.json() as Promise<T>;
}
