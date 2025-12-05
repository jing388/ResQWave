import { type LoginDispatcher } from "../interfaces";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

export async function loginDispatcherApi(payload: LoginDispatcher) {
  const res = await fetch(`${BACKEND_URL}/dispatcher/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: payload.ID,
      password: payload.password,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }
  return data;
}
