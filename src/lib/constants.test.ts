import { describe, expect, it } from "vitest";
import {
  FOLLOWUP_TEMPLATES,
  PROPERTY_SHARE_TEMPLATE,
  formatBudget,
  formatPrice,
  initials,
  renderTemplate,
  waPhone,
} from "@/lib/constants";

/**
 * Prices appear on every screen and in messages sent to buyers. A formatting
 * bug here is visible to the client's customers, so the rules are pinned.
 */
describe("formatPrice — Indian lakh/crore conventions", () => {
  it("renders crores", () => {
    expect(formatPrice(12500000)).toBe("₹1.25 Cr");
    expect(formatPrice(10000000)).toBe("₹1 Cr");
    expect(formatPrice(32500000)).toBe("₹3.25 Cr");
  });

  it("renders lakhs", () => {
    expect(formatPrice(6800000)).toBe("₹68 L");
    expect(formatPrice(100000)).toBe("₹1 L");
    expect(formatPrice(150000)).toBe("₹1.5 L");
  });

  it("renders plain rupees below a lakh (rentals)", () => {
    expect(formatPrice(35000)).toBe("₹35,000");
    expect(formatPrice(0)).toBe("₹0");
  });

  it("shows an em dash rather than NaN for missing values", () => {
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice(undefined)).toBe("—");
  });
});

describe("formatBudget", () => {
  it("renders a range when both bounds exist", () => {
    expect(formatBudget(7500000, 12000000)).toBe("₹75 L – ₹1.2 Cr");
  });

  it("renders a single value when only one bound exists", () => {
    expect(formatBudget(7500000, null)).toBe("₹75 L");
    expect(formatBudget(null, 12000000)).toBe("₹1.2 Cr");
  });

  it("renders an em dash when the lead gave no budget", () => {
    expect(formatBudget(null, null)).toBe("—");
  });
});

describe("renderTemplate", () => {
  it("substitutes every documented variable", () => {
    const out = renderTemplate(PROPERTY_SHARE_TEMPLATE.body, {
      leadName: "Rahul",
      propertyTitle: "Emerald Heights",
      location: "Gurgaon",
      price: "₹1.25 Cr",
      shareLink: "https://x.test/p/abc",
    });
    expect(out).toBe(
      "Hi Rahul, sharing details of Emerald Heights in Gurgaon. Price: ₹1.25 Cr. Photos and details: https://x.test/p/abc"
    );
  });

  it("never leaks a raw {{placeholder}} to a customer when a value is missing", () => {
    const out = renderTemplate("Hi {{leadName}}, about {{missing}}.", {
      leadName: "Rahul",
    });
    expect(out).toBe("Hi Rahul, about .");
    expect(out).not.toContain("{{");
  });

  it("keeps all three default follow-up templates renderable", () => {
    for (const t of FOLLOWUP_TEMPLATES) {
      const out = renderTemplate(t.body, {
        leadName: "Rahul",
        preferredLocation: "Gurgaon",
      });
      expect(out).not.toContain("{{");
      expect(out.length).toBeGreaterThan(10);
    }
  });
});

describe("waPhone", () => {
  it("strips formatting so wa.me links resolve", () => {
    expect(waPhone("+91 99999 99999")).toBe("919999999999");
    expect(waPhone("+1 (415) 555-1234")).toBe("14155551234");
  });
});

describe("initials", () => {
  it("takes at most two initials", () => {
    expect(initials("Rahul Sharma")).toBe("RS");
    expect(initials("Rahul Kumar Sharma")).toBe("RK");
    expect(initials("Rahul")).toBe("R");
  });
});
