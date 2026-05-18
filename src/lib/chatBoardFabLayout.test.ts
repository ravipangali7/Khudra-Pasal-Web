import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getChatBoardFabBottomPx,
  isChatLauncherCandidate,
  repositionChatBoardFab,
  CHATBOARD_FAB_GAP_PX,
  DESKTOP_CHATBOARD_FAB_BOTTOM_PX,
  SAASTECH_CHAT_HOST_ID,
} from "@/lib/chatBoardFabLayout";
import { MOBILE_TABBAR_HEIGHT } from "@/components/layout/MobileFooterNav";

describe("chatBoardFabLayout", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
    document.body.innerHTML = "";
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width: 767px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("places FAB above a measured mobile tab bar", () => {
    const tabbar = document.createElement("nav");
    tabbar.className = "mobile-tabbar-fixed";
    tabbar.getBoundingClientRect = () =>
      ({
        top: 780,
        bottom: 844,
        left: 0,
        right: 390,
        width: 390,
        height: 64,
        x: 0,
        y: 780,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(tabbar);

    expect(getChatBoardFabBottomPx()).toBe(844 - 780 + CHATBOARD_FAB_GAP_PX);
  });

  it("falls back to tab bar height when the bar is not in the DOM", () => {
    expect(getChatBoardFabBottomPx()).toBe(MOBILE_TABBAR_HEIGHT + CHATBOARD_FAB_GAP_PX);
  });

  it("identifies small viewport-fixed Support Board launcher nodes", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () =>
      ({
        top: 760,
        bottom: 820,
        left: 300,
        right: 360,
        width: 60,
        height: 60,
        x: 300,
        y: 760,
        toJSON: () => ({}),
      }) as DOMRect;
    expect(isChatLauncherCandidate(el)).toBe(true);
  });

  it("uses a desktop bottom gap when the mobile tab bar is hidden", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    expect(getChatBoardFabBottomPx()).toBe(DESKTOP_CHATBOARD_FAB_BOTTOM_PX);
  });

  it("pins the SaasTech chat host above the mobile tab bar", () => {
    const tabbar = document.createElement("nav");
    tabbar.className = "mobile-tabbar-fixed";
    tabbar.getBoundingClientRect = () =>
      ({
        top: 780,
        bottom: 844,
        left: 0,
        right: 390,
        width: 390,
        height: 64,
        x: 0,
        y: 780,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(tabbar);

    const widget = document.createElement("div");
    widget.id = SAASTECH_CHAT_HOST_ID;
    widget.getBoundingClientRect = () =>
      ({
        top: 790,
        bottom: 838,
        left: 280,
        right: 378,
        width: 98,
        height: 48,
        x: 280,
        y: 790,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(widget);

    repositionChatBoardFab();

    const bottomPx = parseInt(widget.style.getPropertyValue("bottom"), 10);
    expect(bottomPx).toBeGreaterThanOrEqual(844 - 780 + CHATBOARD_FAB_GAP_PX);
    expect(widget.style.getPropertyValue("transform")).toContain("0.82");
    expect(widget.style.getPropertyValue("z-index")).toBe("10001");
  });

  it("pins Support Board inner fixed launcher above the tab bar", () => {
    const tabbar = document.createElement("nav");
    tabbar.className = "mobile-tabbar-fixed";
    tabbar.getBoundingClientRect = () =>
      ({
        top: 780,
        bottom: 844,
        left: 0,
        right: 390,
        width: 390,
        height: 64,
        x: 0,
        y: 780,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(tabbar);

    const host = document.createElement("div");
    host.className = "kp-chatboard-fab-host";
    document.body.appendChild(host);

    const sbchat = document.createElement("div");
    sbchat.id = "sbchat";
    host.appendChild(sbchat);

    const btn = document.createElement("div");
    btn.className = "sb-chat-btn";
    btn.getBoundingClientRect = () =>
      ({
        top: 790,
        bottom: 838,
        left: 318,
        right: 378,
        width: 60,
        height: 48,
        x: 318,
        y: 790,
        toJSON: () => ({}),
      }) as DOMRect;
    sbchat.appendChild(btn);

    vi.spyOn(window, "getComputedStyle").mockImplementation((node) => {
      const el = node as Element;
      if (el === btn) {
        return { position: "fixed" } as CSSStyleDeclaration;
      }
      return { position: "static" } as CSSStyleDeclaration;
    });

    repositionChatBoardFab();

    expect(host.style.getPropertyValue("bottom")).toBe("146px");
    expect(btn.style.getPropertyValue("bottom")).toBe("146px");
    expect(btn.style.getPropertyValue("z-index")).toBe("10001");
    expect(document.documentElement.style.getPropertyValue("--kp-chatboard-fab-bottom")).toBe(
      "146px",
    );
    expect(parseInt(btn.style.getPropertyValue("bottom"), 10)).toBeGreaterThanOrEqual(76);
  });
});
