import { esc } from "../app/format";

let modalResolve: ((v: unknown) => void) | null = null;

function modalEl(): HTMLElement {
  const m = document.getElementById("modal");
  if (!m) throw new Error("modal root missing");
  return m;
}

export function modalConfirm(title: string, body: string, okLabel?: string, danger?: boolean): Promise<boolean> {
  return new Promise((res) => {
    modalResolve = res as (v: unknown) => void;
    modalEl().innerHTML = `<div class="mtitle">${esc(title)}</div>
      <div class="mbody">${esc(body)}</div>
      <div class="flexrow">
        <button class="btn btn-ghost" data-modal-close="false">Cancel</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-modal-close="true">${esc(okLabel || "OK")}</button>
      </div>`;
    document.getElementById("modalWrap")?.classList.add("open");
  });
}

export function modalPrompt(title: string, placeholder?: string): Promise<string | null> {
  return new Promise((res) => {
    modalResolve = res as (v: unknown) => void;
    modalEl().innerHTML = `<div class="mtitle">${esc(title)}</div>
      <input id="modalInput" placeholder="${esc(placeholder || "")}" autocomplete="off">
      <div class="flexrow">
        <button class="btn btn-ghost" data-modal-close="null">Cancel</button>
        <button class="btn btn-primary" data-modal-submit="true">Add</button>
      </div>`;
    document.getElementById("modalWrap")?.classList.add("open");
    setTimeout(() => {
      const i = document.getElementById("modalInput") as HTMLInputElement | null;
      i?.focus();
    }, 60);
  });
}

export interface ModalChoiceOption {
  label: string;
  value: string;
  danger?: boolean;
}

/** A confirm-style modal with more than two buttons (e.g. Cancel / Merge /
 *  Replace for backup restore). Resolves to the chosen option's `value`,
 *  or null if dismissed. */
export function modalChoice(title: string, body: string, options: ModalChoiceOption[]): Promise<string | null> {
  return new Promise((res) => {
    modalResolve = res as (v: unknown) => void;
    modalEl().innerHTML = `<div class="mtitle">${esc(title)}</div>
      <div class="mbody">${esc(body)}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${options.map((o) => `<button class="btn ${o.danger ? "btn-danger" : "btn-primary"}" data-modal-close="${esc(o.value)}">${esc(o.label)}</button>`).join("")}
        <button class="btn btn-ghost" data-modal-close="null">Cancel</button>
      </div>`;
    document.getElementById("modalWrap")?.classList.add("open");
  });
}

export function closeModal(val: unknown): void {
  document.getElementById("modalWrap")?.classList.remove("open");
  if (modalResolve) {
    const r = modalResolve;
    modalResolve = null;
    r(val);
  }
}

export function initModal(): void {
  const wrap = document.getElementById("modalWrap");
  wrap?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "modalWrap") closeModal(false);
  });
  wrap?.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const closeAttr = target.getAttribute("data-modal-close");
    if (closeAttr !== null) {
      if (closeAttr === "true") closeModal(true);
      else if (closeAttr === "false") closeModal(false);
      else if (closeAttr === "null") closeModal(null);
      else closeModal(closeAttr); // modalChoice: pass the raw option value through
      return;
    }
    if (target.getAttribute("data-modal-submit")) {
      const input = document.getElementById("modalInput") as HTMLInputElement | null;
      closeModal(input ? input.value : null);
    }
  });
}
