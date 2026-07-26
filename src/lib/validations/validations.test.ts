import { describe, expect, it } from "vitest";
import {
  normalizePropertyType,
  normalizeSource,
  webhookLeadSchema,
} from "@/lib/validations";

/**
 * The lead webhook is the client's revenue front door — portals post to it in
 * whatever shape they like. These tests pin the tolerance we promise.
 */
describe("webhookLeadSchema", () => {
  it("accepts the documented payload", () => {
    const result = webhookLeadSchema.safeParse({
      fullName: "Rahul Sharma",
      phone: "+919999999999",
      email: "rahul@example.com",
      source: "36 Acre",
      propertyType: "Apartment",
      budgetMin: 7500000,
      budgetMax: 12000000,
      preferredLocation: "Gurgaon",
    });
    expect(result.success).toBe(true);
  });

  it("accepts snake_case and alternate field names portals use", () => {
    for (const payload of [
      { full_name: "A B", mobile: "+919999999999" },
      { name: "A B", phoneNumber: "+919999999999" },
      { fullName: "A B", phone: "+919999999999", budget_min: 100, budget_max: 200 },
    ]) {
      expect(webhookLeadSchema.safeParse(payload).success).toBe(true);
    }
  });

  it("rejects payloads with no name or no phone", () => {
    expect(webhookLeadSchema.safeParse({ phone: "+919999999999" }).success).toBe(false);
    expect(webhookLeadSchema.safeParse({ fullName: "A B" }).success).toBe(false);
  });

  it("rejects a malformed email rather than storing garbage", () => {
    const r = webhookLeadSchema.safeParse({
      fullName: "A B",
      phone: "+919999999999",
      email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });

  it("coerces numeric strings so form posts work", () => {
    const r = webhookLeadSchema.safeParse({
      fullName: "A B",
      phone: "+919999999999",
      budgetMin: "7500000",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.budgetMin).toBe(7500000);
  });
});

describe("normalizeSource", () => {
  it("maps the portal names clients actually receive", () => {
    expect(normalizeSource("36 Acre")).toBe("36acre");
    expect(normalizeSource("36acre")).toBe("36acre");
    expect(normalizeSource("MagicBricks")).toBe("magicbricks");
    expect(normalizeSource("Housing.com")).toBe("housing");
    expect(normalizeSource("Facebook Lead Ads")).toBe("facebook");
    expect(normalizeSource("FB")).toBe("facebook");
    expect(normalizeSource("Instagram")).toBe("instagram");
    expect(normalizeSource("Website Form")).toBe("website");
    expect(normalizeSource("WhatsApp")).toBe("whatsapp");
    expect(normalizeSource("Referral")).toBe("referral");
  });

  it("falls back to other for unknown sources instead of throwing", () => {
    expect(normalizeSource("Some New Portal")).toBe("other");
    expect(normalizeSource(undefined)).toBe("other");
  });
});

describe("normalizePropertyType", () => {
  it("understands how Indian listings describe property types", () => {
    expect(normalizePropertyType("3BHK")).toBe("apartment");
    expect(normalizePropertyType("Flat")).toBe("apartment");
    expect(normalizePropertyType("Independent House")).toBe("villa");
    expect(normalizePropertyType("Plot/Land")).toBe("plot");
    expect(normalizePropertyType("Office Space")).toBe("commercial");
    expect(normalizePropertyType("Rental")).toBe("rental");
  });

  it("returns null when it cannot tell", () => {
    expect(normalizePropertyType("???")).toBeNull();
    expect(normalizePropertyType(undefined)).toBeNull();
  });
});
