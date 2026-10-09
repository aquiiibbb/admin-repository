import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import DataExplorer from "../pages/DataExplorer";

const hotels = [
  { _id: "1", tenantId: "alpha", name: "Hotel Alpha" },
  { _id: "2", tenantId: "beta", name: "Hotel Beta" },
];
const guests = { alpha: "Alice", beta: "Bob" };
const calls = [];

describe("Data Explorer is filtered per hotel", () => {
  beforeEach(() => {
    calls.length = 0;
    localStorage.setItem("superadmin_token", "T");
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      calls.push(u);
      const tenant = new URL(u, "http://x").searchParams.get("tenantId");
      let body = {};
      if (u.includes("/superadmin/tenants")) body = hotels;
      else if (u.includes("/data/collections/bookings")) {
        body = { label: "Bookings", total: 1, page: 1, pages: 1, columns: ["id", "guestName", "tenantId"], rows: [{ _id: "x" + tenant, id: "BK-1", guestName: guests[tenant] || "all", tenantId: tenant }] };
      } else if (u.includes("/data/collections")) body = [{ name: "bookings", label: "Bookings", count: 1 }, { name: "rooms", label: "Rooms", count: 2 }];
      else if (u.includes("/data/store/")) body = [{ key: "hotelpms_bookings_v1", count: 1, type: "list", bytes: 100 }];
      return { ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body };
    });
  });

  it("choosing a hotel sends its tenantId and shows only that hotel's rows", async () => {
    render(<DataExplorer initialHotel="" onError={() => false} />);
    const select = await screen.findByLabelText("Hotel");
    await waitFor(() => expect(screen.getByText("Hotel Alpha")).toBeTruthy());

    fireEvent.change(select, { target: { value: "alpha" } });
    await waitFor(() => expect(screen.getAllByText("Alice").length).toBeGreaterThan(0));
    expect(screen.queryByText("Bob")).toBeNull();
    expect(calls.some((c) => c.includes("/data/collections/bookings") && c.includes("tenantId=alpha"))).toBe(true);

    fireEvent.change(select, { target: { value: "beta" } });
    await waitFor(() => expect(screen.getAllByText("Bob").length).toBeGreaterThan(0));
    expect(screen.queryByText("Alice")).toBeNull();
  });
});
