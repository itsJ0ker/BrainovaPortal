export const IST_TIMEZONE = "Asia/Kolkata";
export const IST_LABEL = "Indian Standard Time (Delhi · UTC+05:30)";
export const IST_BADGE = "IST (Delhi · UTC+05:30)";

/**
 * Formats a Date object, ISO string, or timestamp into the YYYY-MM-DDTHH:mm string
 * expected by <input type="datetime-local" /> in the Asia/Kolkata (Indian Standard Time) timezone.
 */
export function toISTInputString(dateInput?: Date | string | number | null): string {
  const date =
    typeof dateInput === "string"
      ? new Date(dateInput)
      : typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput || new Date();

  if (isNaN(date.getTime())) {
    return toISTInputString(new Date());
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
  let hour = getPart("hour");
  if (hour === "24") hour = "00";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${hour}:${getPart("minute")}`;
}

/**
 * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) configured in IST
 * into a full ISO 8601 string (with UTC Z) representing that exact point in Indian time.
 */
export function istInputToISO(istInputString?: string | null): string {
  if (!istInputString || !istInputString.trim()) {
    return new Date().toISOString();
  }

  const trimmed = istInputString.trim();
  const base = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  // If no timezone offset is present, attach +05:30 for Indian Standard Time
  const withTz = base.includes("+") || base.endsWith("Z") ? base : `${base}+05:30`;
  const date = new Date(withTz);

  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/**
 * Formats an ISO string or Date into a human-readable Indian Standard Time string.
 * Example: "27 Oct 2026, 4:55 PM IST"
 */
export function formatInIST(
  dateInput?: Date | string | number | null,
  options?: { includeSeconds?: boolean; fullDate?: boolean }
): string {
  if (!dateInput) return "";

  let date: Date;
  if (typeof dateInput === "string") {
    const s = dateInput.trim();
    const hasTz = s.includes("+") || s.endsWith("Z");
    date = new Date(hasTz ? s : `${s.length === 16 ? `${s}:00` : s}+05:30`);
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: options?.fullDate ? "long" : "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: options?.includeSeconds ? "2-digit" : undefined,
    hour12: true,
  });

  return `${formatter.format(date)} IST`;
}

/**
 * Computes tomorrow 9:00 AM in Indian Standard Time (Delhi).
 */
export function getTomorrow9AMIST(): { start: string; end3Days: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  const today9AM = new Date(`${year}-${month}-${day}T09:00:00+05:30`);
  const tomorrow9AM = new Date(today9AM.getTime() + 24 * 60 * 60 * 1000);
  const end3Days = new Date(tomorrow9AM.getTime() + 3 * 24 * 60 * 60 * 1000);

  return {
    start: toISTInputString(tomorrow9AM),
    end3Days: toISTInputString(end3Days),
  };
}

/**
 * Adds a specific number of days to an IST input string.
 */
export function addDaysToISTInput(istString: string, days: number): string {
  const base = istString.length === 16 ? `${istString}:00+05:30` : istString;
  const start = new Date(base.includes("+") || base.endsWith("Z") ? base : `${base}+05:30`);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return toISTInputString(end);
}
