"use client";

/**
 * Dispara Web Push para usuários alvo (fire-and-forget).
 * O server envia via web-push; falhas são silenciosas (best-effort).
 */
export async function sendPush(opts: {
  title: string;
  message: string;
  userIds?: string[];
  url?: string;
}) {
  try {
    await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
  } catch {
    /* best-effort */
  }
}
