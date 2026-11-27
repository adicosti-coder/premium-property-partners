import { sendTeamEmail, type TeamEmailInput } from "./teamEmail.ts";

/** Email failure never rolls back a saved booking/consent; the sender stores failures in Admin. */
export async function notifyOwnerTeam(admin: any, input: TeamEmailInput) {
  try {
    return await sendTeamEmail(input, admin);
  } catch {
    console.error("[owner-team-notification] send failed");
    return { sent: false };
  }
}