"use server";

import { resolveCalendarRequestContext } from "./calendar-request-context";
import { readSessionDetailHandler } from "./session-detail-handlers";

export async function readSessionDetailAction(target: unknown) {
  return readSessionDetailHandler(resolveCalendarRequestContext, target);
}
