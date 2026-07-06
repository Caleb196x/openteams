export type TauriInvoke = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

type TauriGlobal = {
  invoke?: TauriInvoke;
  tauri?: {
    invoke?: TauriInvoke;
  };
};

export const getTauriInvoke = (): TauriInvoke | null => {
  if (typeof window === 'undefined') return null;

  const tauriGlobal = (window as Window & { __TAURI__?: TauriGlobal })
    .__TAURI__;
  return tauriGlobal?.tauri?.invoke ?? tauriGlobal?.invoke ?? null;
};
