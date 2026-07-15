export type ConfigPatchOptions = { optimistic?: boolean };

type PendingPatch<T> = {
  id: number;
  patch: Partial<T>;
  optimistic: boolean;
};

export function createConfigPatchQueue<T extends object>(
  initial: T,
  save: (candidate: T) => Promise<T>,
  publish: (visible: T) => void,
) {
  let acknowledged = initial;
  let pending: PendingPatch<T>[] = [];
  let nextId = 0;
  let tail: Promise<void> = Promise.resolve();

  const visible = () =>
    pending
      .filter((entry) => entry.optimistic)
      .reduce<T>(
        (current, entry) => ({ ...current, ...entry.patch }),
        acknowledged,
      );
  const publishVisible = () => publish(visible());
  const remove = (id: number) => {
    pending = pending.filter((entry) => entry.id !== id);
  };

  publishVisible();

  return {
    enqueue(patch: Partial<T>, options: ConfigPatchOptions = {}): Promise<T> {
      const entry: PendingPatch<T> = {
        id: ++nextId,
        patch,
        optimistic: options.optimistic === true,
      };
      pending.push(entry);
      if (entry.optimistic) publishVisible();

      const operation = tail.then(async () => {
        try {
          const saved = await save({ ...acknowledged, ...entry.patch });
          acknowledged = saved;
          remove(entry.id);
          publishVisible();
          return saved;
        } catch (error) {
          remove(entry.id);
          publishVisible();
          throw error;
        }
      });
      tail = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    replaceAcknowledged(next: T) {
      acknowledged = next;
      publishVisible();
    },
    getAcknowledged: () => acknowledged,
    getVisible: visible,
  };
}
