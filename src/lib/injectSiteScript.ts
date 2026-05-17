const SCRIPT_MARKER_ATTR = "data-kp-site-script";

import { CHATBOARD_FAB_HOST_CLASS } from "@/lib/chatBoardFabLayout";

/** Inject third-party HTML (script tags, etc.) and remove on cleanup. */
export function injectSiteScriptSnippet(html: string, marker: string): () => void {
  const trimmed = html.trim();
  if (!trimmed) return () => undefined;

  const added: Node[] = [];
  const tpl = document.createElement("template");
  tpl.innerHTML = trimmed;

  const useFabHost = marker === "chabot";
  let fabHost: HTMLDivElement | null = null;
  if (useFabHost) {
    fabHost = document.createElement("div");
    fabHost.className = CHATBOARD_FAB_HOST_CLASS;
    fabHost.setAttribute(SCRIPT_MARKER_ATTR, marker);
    document.body.appendChild(fabHost);
    added.push(fabHost);
  }

  tpl.content.querySelectorAll("script").forEach((oldScript) => {
    const script = document.createElement("script");
    script.setAttribute(SCRIPT_MARKER_ATTR, marker);
    Array.from(oldScript.attributes).forEach((attr) => {
      if (attr.name !== SCRIPT_MARKER_ATTR) {
        script.setAttribute(attr.name, attr.value);
      }
    });
    script.text = oldScript.text;
    document.head.appendChild(script);
    added.push(script);
  });

  tpl.content.childNodes.forEach((node) => {
    if (node.nodeName === "SCRIPT") return;
    const clone = node.cloneNode(true);
    if (clone instanceof HTMLElement) {
      clone.setAttribute(SCRIPT_MARKER_ATTR, marker);
    }
    const parent = fabHost ?? document.head;
    parent.appendChild(clone);
    added.push(clone);
  });

  return () => {
    document.querySelectorAll(`[${SCRIPT_MARKER_ATTR}="${marker}"]`).forEach((el) => el.remove());
    for (const node of added) {
      if (node.parentNode) node.parentNode.removeChild(node);
    }
  };
}
