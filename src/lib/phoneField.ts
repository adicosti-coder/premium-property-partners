import { z } from "zod";

/**
 * Phone fields in owner forms are validated as Romanian mobiles, but visitors
 * type the number the way the placeholder shows it ("07XX XXX XXX") and the
 * browser autofills "+40 722 123 456". Those separators are a display detail,
 * never part of the number, so they are removed before validation and before
 * the value is stored or sent to Make.
 */
const PHONE_SEPARATORS = /[\s\-().]/g;

/** "0722 123 456" / "+40 722 123 456" / "(0722) 123-456" → one digit form. */
export const normalizePhoneInput = (raw: unknown): string =>
  typeof raw === "string" ? raw.replace(PHONE_SEPARATORS, "").trim() : "";

/** Romanian mobile, with or without the country prefix. */
export const RO_MOBILE_PATTERN = /^(\+?4?0)?7\d{8}$/;

/**
 * Zod field for a Romanian mobile typed with or without spaces/dashes.
 * The parsed value is the normalized number, so every downstream consumer
 * (leads row, WhatsApp link, Make payload) receives one single shape.
 */
export const roMobileField = (message: string) =>
  z.preprocess(normalizePhoneInput, z.string().regex(RO_MOBILE_PATTERN, message));
