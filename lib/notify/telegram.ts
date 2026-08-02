/**
 * 텔레그램 봇 알림.
 *
 * 토큰/챗ID가 없으면 조용히 no-op한다. 로컬 개발이나 CI에서 알림 설정 없이도
 * 감시 로직을 돌려볼 수 있어야 하기 때문이다.
 */

const API_BASE = "https://api.telegram.org";

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendTelegram(text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID 미설정 — 알림을 건너뜁니다."
    );
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `HTTP ${response.status} ${body.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface NewListingMessage {
  complexName: string;
  tradeTypeLabel: string;
  price: string;
  rentPrice?: number;
  exclusiveArea: number;
  floor: string;
  direction: string;
  confirmedDate: string;
  description?: string;
}

/** 신규 매물 알림 문구 */
export function formatNewListingMessage(item: NewListingMessage): string {
  const priceLine =
    item.rentPrice && item.rentPrice > 0
      ? `${item.price} / ${item.rentPrice}만`
      : item.price;

  const lines = [
    `🏠 <b>${escapeHtml(item.complexName)}</b> 신규 매물`,
    `${escapeHtml(item.tradeTypeLabel)} <b>${escapeHtml(priceLine)}</b>`,
    `전용 ${item.exclusiveArea}m² · ${escapeHtml(item.floor || "-")}층 · ${escapeHtml(
      item.direction || "-"
    )}`,
  ];

  if (item.description) {
    lines.push(escapeHtml(item.description));
  }
  lines.push(`확인일 ${escapeHtml(item.confirmedDate)}`);

  return lines.join("\n");
}
