import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import Hotels from "../pages/Hotels";

const calls = [];
let sesConfigured = true;
let mailResult = { sent: true, to: "asha@alpha.com", error: "" };

describe("Hotels: create hotel -> login emailed to the owner", () => {
  beforeEach(() => {
    calls.length = 0; sesConfigured = true; mailResult = { sent: true, to: "asha@alpha.com", error: "" };
    localStorage.setItem("superadmin_token", "T");
    globalThis.fetch = vi.fn(async (url, opts = {}) => {
      const u = String(url); const body = opts.body ? JSON.parse(opts.body) : null;
      calls.push({ u, body, method: opts.method || "GET" });
      let data = {};
      if (u.endsWith("/superadmin/tenants") && (opts.method || "GET") === "GET") data = [];
      else if (u.endsWith("/superadmin/tenants") && opts.method === "POST") data = { tenant: { _id: "9", name: "Hotel Alpha", ownerEmail: "asha@alpha.com" }, adminCredentials: { username: "admin", email: "asha@alpha.com", password: "Pw12345678", loginUrl: "/login" }, email: mailResult };
      else if (u.endsWith("/email/status")) data = { configured: sesConfigured, from: "support@ahaalo.com" };
      return { ok: true, status: 200, text: async () => JSON.stringify(data), json: async () => data };
    });
  });

  const create = async () => {
    render(<Hotels go={() => {}} onError={() => false} />);
    fireEvent.click(await screen.findByText(/New Hotel Account/));
    fireEvent.change(await screen.findByPlaceholderText(/Grand Ocean/), { target: { value: "Hotel Alpha" } });
    const email = document.querySelector('input[type="email"]');
    fireEvent.change(email, { target: { value: "asha@alpha.com" } });
    fireEvent.submit(document.querySelector('form'));
  };

  it("tells you the email was sent", async () => {
    await create();
    await waitFor(() => expect(screen.getByText(/Login details were emailed to/)).toBeTruthy());
    expect(screen.getByText("Pw12345678")).toBeTruthy();
    expect(calls.find((c) => c.method === "POST").body.ownerEmail).toBe("asha@alpha.com");
  });

  it("if the email fails you are told clearly and can still copy the login", async () => {
    mailResult = { sent: false, to: "asha@alpha.com", error: "Invalid login" };
    await create();
    await waitFor(() => expect(screen.getByText(/could not be sent: Invalid login/)).toBeTruthy());
    expect(screen.getByText("Pw12345678")).toBeTruthy();
  });

  it("warns at the top when AWS SES is not configured on the server", async () => {
    sesConfigured = false;
    render(<Hotels go={() => {}} onError={() => false} />);
    await waitFor(() => expect(screen.getByText(/Email service \(AWS SES\) is not set up/)).toBeTruthy());
  });
});
