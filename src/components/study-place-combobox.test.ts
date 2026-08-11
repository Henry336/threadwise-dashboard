import { describe, expect, it } from "vitest";
import { scheduleBlockPlaceId } from "./study-place-combobox";

describe("Study place identity", () => {
  it("preserves canonical venue and stop identifiers", () => {
    expect(scheduleBlockPlaceId({ venueId: "venue:COM3" })).toBe("venue:COM3");
    expect(scheduleBlockPlaceId({ venueId: "COM3" })).toBe("venue:COM3");
    expect(scheduleBlockPlaceId({ destinationStopId: "PGP" })).toBe("stop:PGP");
  });

  it("keeps unresolved labels visibly unselected", () => {
    expect(scheduleBlockPlaceId({})).toBeNull();
  });
});
