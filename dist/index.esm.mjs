// src/utils/useAtomsSnapshot.ts
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// src/utils/hooks/useDevToolsStore.ts
import { useStore } from "jotai";

// src/utils/internals/compose-with-devtools.ts
var isDevToolsStore = (store) => {
  return "subscribeStore" in store;
};
var isDevStore = (store) => {
  return "dev4_get_internal_weak_map" in store;
};
var __composeStoreWithDevTools = (store) => {
  const { sub, set, get } = store;
  const storeListeners = /* @__PURE__ */ new Set();
  const recentlySetAtomsMap = /* @__PURE__ */ new WeakMap();
  const reduceCountOrRemoveRecentlySetAtom = (atom, onFound) => {
    const foundCount = recentlySetAtomsMap.get(atom);
    if (typeof foundCount === "number") {
      if (foundCount > 1) {
        recentlySetAtomsMap.set(atom, foundCount - 1);
      } else {
        recentlySetAtomsMap.delete(atom);
      }
      onFound?.();
    }
  };
  const increaseCountRecentlySetAtom = (atom) => {
    const foundCount = recentlySetAtomsMap.get(atom);
    recentlySetAtomsMap.set(atom, (foundCount || 0) + 1);
  };
  store.sub = (...args) => {
    const unsub = sub(...args);
    storeListeners.forEach((l) => l({ type: "sub" }));
    return () => {
      unsub();
      reduceCountOrRemoveRecentlySetAtom(args[0]);
      storeListeners.forEach((l) => l({ type: "unsub" }));
    };
  };
  store.get = (...args) => {
    const value = get(...args);
    reduceCountOrRemoveRecentlySetAtom(args[0], () => {
      if (value instanceof Promise) {
        value.then(() => {
          Promise.resolve().then(() => {
            storeListeners.forEach((l) => l({ type: "async-get" }));
          });
        });
      }
    });
    return value;
  };
  store.set = (...args) => {
    const value = set(...args);
    increaseCountRecentlySetAtom(args[0]);
    storeListeners.forEach((l) => l({ type: "set" }));
    return value;
  };
  store.subscribeStore = (l) => {
    storeListeners.add(l);
    return () => {
      storeListeners.delete(l);
    };
  };
  store.getMountedAtoms = () => {
    return store.dev4_get_mounted_atoms();
  };
  store.getAtomState = (atom) => {
    const aState = store.dev4_get_internal_weak_map().get(atom);
    if (aState) {
      return { v: aState.v, e: aState.e, d: new Set(aState.d.keys()) };
    }
    return void 0;
  };
  store.getMountedAtomState = (atom) => {
    const aState = store.dev4_get_internal_weak_map().get(atom);
    if (aState && aState.m) {
      return {
        l: aState.m.l,
        t: aState.m.t
      };
    }
    return void 0;
  };
  store.restoreAtoms = (values) => {
    store.dev4_restore_atoms(values);
    storeListeners.forEach((l) => l({ type: "restore" }));
  };
  return store;
};
var composeWithDevTools = (store) => {
  if (isDevToolsStore(store)) {
    return store;
  }
  if (isDevStore(store)) {
    return __composeStoreWithDevTools(store);
  }
  return store;
};

// src/utils/hooks/useDevToolsStore.ts
var useDevToolsStore = (options) => {
  const store = useStore(options);
  return composeWithDevTools(store);
};

// src/utils/useAtomsSnapshot.ts
var isEqualAtomsValues = (left, right) => left.size === right.size && Array.from(left).every(([left2, v]) => Object.is(right.get(left2), v));
var isEqualAtomsDependents = (left, right) => left.size === right.size && Array.from(left).every(([a, dLeft]) => {
  const dRight = right.get(a);
  return dRight && dLeft.size === dRight.size && Array.from(dLeft).every((d) => dRight.has(d));
});
function useAtomsSnapshot({
  shouldShowPrivateAtoms = false,
  ...options
} = {}) {
  const store = useDevToolsStore(options);
  const [atomsSnapshot, setAtomsSnapshot] = useState(() => ({
    values: /* @__PURE__ */ new Map(),
    dependents: /* @__PURE__ */ new Map()
  }));
  const duringReactRenderPhase = useRef(true);
  duringReactRenderPhase.current = true;
  useLayoutEffect(() => {
    duringReactRenderPhase.current = false;
  });
  useEffect(() => {
    if (!isDevToolsStore(store)) return;
    let prevValues = /* @__PURE__ */ new Map();
    let prevDependents = /* @__PURE__ */ new Map();
    const callback = () => {
      const values = /* @__PURE__ */ new Map();
      const dependents = /* @__PURE__ */ new Map();
      for (const atom of store.getMountedAtoms() || []) {
        if (!shouldShowPrivateAtoms && atom.debugPrivate) {
          continue;
        }
        const atomState = store.getAtomState(atom);
        if (atomState) {
          if ("v" in atomState) {
            values.set(atom, atomState.v);
          }
        }
        const mounted = store.getMountedAtomState(atom);
        if (mounted) {
          let atomDependents = mounted.t;
          if (!shouldShowPrivateAtoms) {
            atomDependents = new Set(
              Array.from(atomDependents.values()).filter(
                /* NOTE: This just removes private atoms from the dependents list,
                  instead of hiding them from the dependency chain and showing
                  the nested dependents of the private atoms. */
                (dependent) => !dependent.debugPrivate
              )
            );
          }
          dependents.set(atom, atomDependents);
        }
      }
      if (isEqualAtomsValues(prevValues, values) && isEqualAtomsDependents(prevDependents, dependents)) {
        return;
      }
      prevValues = values;
      prevDependents = dependents;
      const deferrableAtomSetAction = () => setAtomsSnapshot({ values, dependents });
      if (duringReactRenderPhase.current) {
        Promise.resolve().then(deferrableAtomSetAction);
      } else {
        deferrableAtomSetAction();
      }
    };
    const unsubscribe = store.subscribeStore(callback);
    callback();
    return unsubscribe;
  }, [store, shouldShowPrivateAtoms]);
  return atomsSnapshot;
}

// src/utils/useGotoAtomsSnapshot.ts
import { useCallback } from "react";
function useGotoAtomsSnapshot(options) {
  const store = useDevToolsStore(options);
  return useCallback(
    (snapshot) => {
      if (isDevToolsStore(store)) {
        store.restoreAtoms(snapshot.values);
      }
    },
    [store]
  );
}

// src/utils/useAtomsDebugValue.ts
import {
  useDebugValue,
  useEffect as useEffect2,
  useLayoutEffect as useLayoutEffect2,
  useRef as useRef2,
  useState as useState2
} from "react";
var atomToPrintable = (atom) => atom.debugLabel || atom.toString();
var stateToPrintable = ([store, atoms]) => Object.fromEntries(
  atoms.flatMap((atom) => {
    const mounted = isDevToolsStore(store) && store.getMountedAtomState(atom);
    if (!mounted) {
      return [];
    }
    const dependents = mounted.t;
    const atomState = store.getAtomState(atom) || {};
    return [
      [
        atomToPrintable(atom),
        {
          ..."e" in atomState && { error: atomState.e },
          ..."v" in atomState && { value: atomState.v },
          dependents: Array.from(dependents).map(atomToPrintable)
        }
      ]
    ];
  })
);
var useAtomsDebugValue = (options) => {
  const enabled = options?.enabled ?? process.env.NODE_ENV !== "production";
  const store = useDevToolsStore(options);
  const [atoms, setAtoms] = useState2([]);
  const duringReactRenderPhase = useRef2(true);
  duringReactRenderPhase.current = true;
  useLayoutEffect2(() => {
    duringReactRenderPhase.current = false;
  });
  useEffect2(() => {
    if (!enabled || !isDevToolsStore(store)) {
      return;
    }
    const callback = () => {
      const deferrableAtomSetAction = () => setAtoms(Array.from(store.getMountedAtoms() || []));
      if (duringReactRenderPhase.current) {
        Promise.resolve().then(deferrableAtomSetAction);
      } else {
        deferrableAtomSetAction();
      }
    };
    const unsubscribe = store.subscribeStore(callback);
    callback();
    return unsubscribe;
  }, [enabled, store]);
  useDebugValue([store, atoms], stateToPrintable);
};

// src/utils/useAtomDevtools.ts
import { useEffect as useEffect3, useRef as useRef3 } from "react";
import { useAtom } from "jotai/react";

// src/utils/redux-extension/createReduxConnection.ts
var createReduxConnection = (extension, name) => {
  if (!extension) return void 0;
  const connection = extension.connect({ name });
  return Object.assign(connection, {
    shouldInit: true
  });
};

// src/utils/redux-extension/getReduxExtension.ts
var getReduxExtension = (enabled = process.env.NODE_ENV !== "production") => {
  if (!enabled) {
    return void 0;
  }
  if (typeof window === "undefined") {
    return void 0;
  }
  const reduxExtension = window.__REDUX_DEVTOOLS_EXTENSION__;
  if (!reduxExtension && process.env.NODE_ENV !== "production") {
    console.warn("Please install/enable Redux devtools extension");
    return void 0;
  }
  return reduxExtension;
};

// src/utils/useAtomDevtools.ts
function useAtomDevtools(anAtom, options) {
  const { enabled, name } = options || {};
  const extension = getReduxExtension(enabled);
  const [value, setValue] = useAtom(anAtom, options);
  const lastValue = useRef3(value);
  const isTimeTraveling = useRef3(false);
  const devtools = useRef3();
  const atomName = name || anAtom.debugLabel || anAtom.toString();
  useEffect3(() => {
    if (!extension) {
      return;
    }
    const setValueIfWritable = (value2) => {
      if (typeof setValue === "function") {
        setValue(value2);
        return;
      }
      console.warn(
        "[Warn] you cannot do write operations (Time-travelling, etc) in read-only atoms\n",
        anAtom
      );
    };
    devtools.current = createReduxConnection(extension, atomName);
    const unsubscribe = devtools.current?.subscribe((message) => {
      if (message.type === "ACTION" && message.payload) {
        try {
          setValueIfWritable(JSON.parse(message.payload));
        } catch (e) {
          console.error(
            "please dispatch a serializable value that JSON.parse() support\n",
            e
          );
        }
      } else if (message.type === "DISPATCH" && message.state) {
        if (message.payload?.type === "JUMP_TO_ACTION" || message.payload?.type === "JUMP_TO_STATE") {
          isTimeTraveling.current = true;
          setValueIfWritable(JSON.parse(message.state));
        }
      } else if (message.type === "DISPATCH" && message.payload?.type === "COMMIT") {
        devtools.current?.init(lastValue.current);
      } else if (message.type === "DISPATCH" && message.payload?.type === "IMPORT_STATE") {
        const computedStates = message.payload.nextLiftedState?.computedStates || [];
        computedStates.forEach(({ state }, index) => {
          if (index === 0) {
            devtools.current?.init(state);
          } else {
            setValueIfWritable(state);
          }
        });
      }
    });
    return unsubscribe;
  }, [anAtom, extension, atomName, setValue]);
  useEffect3(() => {
    if (!devtools.current) {
      return;
    }
    lastValue.current = value;
    if (devtools.current.shouldInit) {
      devtools.current.init(value);
      devtools.current.shouldInit = false;
    } else if (isTimeTraveling.current) {
      isTimeTraveling.current = false;
    } else {
      devtools.current.send(
        `${atomName} - ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
        value
      );
    }
  }, [anAtom, extension, atomName, value]);
}

// src/utils/useAtomsDevtools.ts
import { useEffect as useEffect4, useRef as useRef4 } from "react";
var atomToPrintable2 = (atom) => atom.debugLabel && !String(atom).includes(":") ? `${atom}:${atom.debugLabel}` : `${atom}`;
var getDevtoolsState = (atomsSnapshot) => {
  const values = {};
  atomsSnapshot.values.forEach((v, atom) => {
    values[atomToPrintable2(atom)] = v;
  });
  const dependents = {};
  atomsSnapshot.dependents.forEach((d, atom) => {
    dependents[atomToPrintable2(atom)] = Array.from(d).map(atomToPrintable2);
  });
  return {
    values,
    dependents
  };
};
function useAtomsDevtools(name, options) {
  const { enabled } = options || {};
  const extension = getReduxExtension(enabled);
  const atomsSnapshot = useAtomsSnapshot(options);
  const goToSnapshot = useGotoAtomsSnapshot(options);
  const isTimeTraveling = useRef4(false);
  const isRecording = useRef4(true);
  const devtools = useRef4();
  const snapshots = useRef4([]);
  useEffect4(() => {
    if (!extension) {
      return;
    }
    const getSnapshotAt = (index = snapshots.current.length - 1) => {
      const snapshot = snapshots.current[index >= 0 ? index : 0];
      if (!snapshot) {
        throw new Error("snapshot index out of bounds");
      }
      return snapshot;
    };
    devtools.current = createReduxConnection(extension, name);
    const devtoolsUnsubscribe = devtools.current?.subscribe((message) => {
      switch (message.type) {
        case "DISPATCH":
          switch (message.payload?.type) {
            case "RESET":
              break;
            case "COMMIT":
              devtools.current?.init(getDevtoolsState(getSnapshotAt()));
              snapshots.current = [];
              break;
            case "JUMP_TO_ACTION":
            case "JUMP_TO_STATE":
              isTimeTraveling.current = true;
              goToSnapshot(getSnapshotAt(message.payload.actionId - 1));
              break;
            case "PAUSE_RECORDING":
              isRecording.current = !isRecording.current;
              break;
          }
      }
    });
    return () => {
      extension?.disconnect?.();
      devtoolsUnsubscribe?.();
    };
  }, [extension, goToSnapshot, name]);
  useEffect4(() => {
    if (!devtools.current) {
      return;
    }
    if (devtools.current.shouldInit) {
      devtools.current.init(void 0);
      devtools.current.shouldInit = false;
      return;
    }
    if (isTimeTraveling.current) {
      isTimeTraveling.current = false;
    } else if (isRecording.current) {
      snapshots.current.push(atomsSnapshot);
      devtools.current.send(
        {
          type: `${snapshots.current.length}`,
          updatedAt: (/* @__PURE__ */ new Date()).toLocaleString()
        },
        getDevtoolsState(atomsSnapshot)
      );
    }
  }, [atomsSnapshot]);
}
export {
  useAtomDevtools,
  useAtomsDebugValue,
  useAtomsDevtools,
  useAtomsSnapshot,
  useGotoAtomsSnapshot
};