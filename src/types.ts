import { useStore } from 'jotai/react';
import type { Atom } from 'jotai/vanilla';
import { INTERNAL_DevStoreRev4, createStore } from 'jotai/vanilla/store';

export type Store = ReturnType<typeof createStore>;
export type DevStore = Store extends infer S
  ? S extends INTERNAL_DevStoreRev4
    ? S
    : never
  : never;

export type Options = Parameters<typeof useStore>[0];

export type AnyAtomValue = unknown;
export type AnyAtomError = unknown;
export type AnyAtom = Atom<AnyAtomValue>;

export type AtomsValues = Map<AnyAtom, AnyAtomValue>; // immutable
export type AtomsDependents = Map<AnyAtom, Set<AnyAtom>>; // immutable
export type AtomsSnapshot = Readonly<{
  values: AtomsValues;
  dependents: AtomsDependents;
}>;
