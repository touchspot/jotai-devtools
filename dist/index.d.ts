import { useStore, useAtom } from 'jotai/react';
import { Atom, WritableAtom } from 'jotai/vanilla';

type Options$1 = Parameters<typeof useStore>[0];
type AnyAtomValue = unknown;
type AnyAtom = Atom<AnyAtomValue>;
type AtomsValues = Map<AnyAtom, AnyAtomValue>;
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>>;
type AtomsSnapshot = Readonly<{
  values: AtomsValues;
  dependents: AtomsDependents;
}>;

type SnapshotOptions = Options$1 & {
  /**
   * Defaults to `false`
   *
   * Private are atoms that are used by Jotai libraries internally to manage state.
   * They're often used internally in atoms like `atomWithStorage` or `atomWithLocation`, etc. to manage state.
   */
  shouldShowPrivateAtoms?: boolean;
};
declare function useAtomsSnapshot({
  shouldShowPrivateAtoms,
  ...options
}?: SnapshotOptions): AtomsSnapshot;

declare function useGotoAtomsSnapshot(
  options?: Options$1,
): (snapshot: AtomsSnapshot) => void;

type Options = Parameters<typeof useStore>[0] & {
  enabled?: boolean;
};
declare const useAtomsDebugValue: (options?: Options) => void;

type DevtoolOptions = Parameters<typeof useAtom>[1] & {
  name?: string;
  enabled?: boolean;
};
declare function useAtomDevtools<Value, Result>(
  anAtom: WritableAtom<Value, [Value], Result> | Atom<Value>,
  options?: DevtoolOptions,
): void;

type DevtoolsOptions = SnapshotOptions & {
  enabled?: boolean;
};
declare function useAtomsDevtools(
  name: string,
  options?: DevtoolsOptions,
): void;

export {
  useAtomDevtools,
  useAtomsDebugValue,
  useAtomsDevtools,
  useAtomsSnapshot,
  useGotoAtomsSnapshot,
};
