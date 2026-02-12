import { describe, expect, it } from "vitest";
import { prepareHtmlForExport } from "../../src/lib/exportWord";

describe("exportWord XSS guards", () => {
  it("does not inject unescaped chart title into placeholder html", async () => {
    const html =
      '<div class="chart-node" data-title="<script>alert(1)</script>"></div>';

    const result = await prepareHtmlForExport(html);

    expect(result).not.toContain("<script>alert(1)</script>");
    expect(result).not.toContain("onerror=");
    expect(result).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
