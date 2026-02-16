import { afterEach, describe, expect, it, vi } from "vitest";
import { setViewportWidth } from "./viewport";

describe("setViewportWidth test helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets window.innerWidth and dispatches a resize event", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    setViewportWidth(640);

    expect(window.innerWidth).toBe(640);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy.mock.calls[0]?.[0].type).toBe("resize");
  });
});
