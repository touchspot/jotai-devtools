"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/utils/useAtomsSnapshot.ts
var _react = require('react');

// src/utils/hooks/useDevToolsStore.ts
var _jotai = require('jotai');

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
      _optionalChain([onFound, 'optionalCall', _ => _()]);
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
  const store = _jotai.useStore.call(void 0, options);
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
  const [atomsSnapshot, setAtomsSnapshot] = _react.useState.call(void 0, () => ({
    values: /* @__PURE__ */ new Map(),
    dependents: /* @__PURE__ */ new Map()
  }));
  const duringReactRenderPhase = _react.useRef.call(void 0, true);
  duringReactRenderPhase.current = true;
  _react.useLayoutEffect.call(void 0, () => {
    duringReactRenderPhase.current = false;
  });
  _react.useEffect.call(void 0, () => {
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

function useGotoAtomsSnapshot(options) {
  const store = useDevToolsStore(options);
  return _react.useCallback.call(void 0, 
    (snapshot) => {
      if (isDevToolsStore(store)) {
        store.restoreAtoms(snapshot.values);
      }
    },
    [store]
  );
}

// src/utils/useAtomsDebugValue.ts







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
  const enabled = _nullishCoalesce(_optionalChain([options, 'optionalAccess', _2 => _2.enabled]), () => ( process.env.NODE_ENV !== "production"));
  const store = useDevToolsStore(options);
  const [atoms, setAtoms] = _react.useState.call(void 0, []);
  const duringReactRenderPhase = _react.useRef.call(void 0, true);
  duringReactRenderPhase.current = true;
  _react.useLayoutEffect.call(void 0, () => {
    duringReactRenderPhase.current = false;
  });
  _react.useEffect.call(void 0, () => {
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
  _react.useDebugValue.call(void 0, [store, atoms], stateToPrintable);
};

// src/utils/useAtomDevtools.ts

var _react3 = require('jotai/react');

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
  const [value, setValue] = _react3.useAtom.call(void 0, anAtom, options);
  const lastValue = _react.useRef.call(void 0, value);
  const isTimeTraveling = _react.useRef.call(void 0, false);
  const devtools = _react.useRef.call(void 0, );
  const atomName = name || anAtom.debugLabel || anAtom.toString();
  _react.useEffect.call(void 0, () => {
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
    const unsubscribe = _optionalChain([devtools, 'access', _3 => _3.current, 'optionalAccess', _4 => _4.subscribe, 'call', _5 => _5((message) => {
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
        if (_optionalChain([message, 'access', _6 => _6.payload, 'optionalAccess', _7 => _7.type]) === "JUMP_TO_ACTION" || _optionalChain([message, 'access', _8 => _8.payload, 'optionalAccess', _9 => _9.type]) === "JUMP_TO_STATE") {
          isTimeTraveling.current = true;
          setValueIfWritable(JSON.parse(message.state));
        }
      } else if (message.type === "DISPATCH" && _optionalChain([message, 'access', _10 => _10.payload, 'optionalAccess', _11 => _11.type]) === "COMMIT") {
        _optionalChain([devtools, 'access', _12 => _12.current, 'optionalAccess', _13 => _13.init, 'call', _14 => _14(lastValue.current)]);
      } else if (message.type === "DISPATCH" && _optionalChain([message, 'access', _15 => _15.payload, 'optionalAccess', _16 => _16.type]) === "IMPORT_STATE") {
        const computedStates = _optionalChain([message, 'access', _17 => _17.payload, 'access', _18 => _18.nextLiftedState, 'optionalAccess', _19 => _19.computedStates]) || [];
        computedStates.forEach(({ state }, index) => {
          if (index === 0) {
            _optionalChain([devtools, 'access', _20 => _20.current, 'optionalAccess', _21 => _21.init, 'call', _22 => _22(state)]);
          } else {
            setValueIfWritable(state);
          }
        });
      }
    })]);
    return unsubscribe;
  }, [anAtom, extension, atomName, setValue]);
  _react.useEffect.call(void 0, () => {
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
  const isTimeTraveling = _react.useRef.call(void 0, false);
  const isRecording = _react.useRef.call(void 0, true);
  const devtools = _react.useRef.call(void 0, );
  const snapshots = _react.useRef.call(void 0, []);
  _react.useEffect.call(void 0, () => {
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
    const devtoolsUnsubscribe = _optionalChain([devtools, 'access', _23 => _23.current, 'optionalAccess', _24 => _24.subscribe, 'call', _25 => _25((message) => {
      switch (message.type) {
        case "DISPATCH":
          switch (_optionalChain([message, 'access', _26 => _26.payload, 'optionalAccess', _27 => _27.type])) {
            case "RESET":
              break;
            case "COMMIT":
              _optionalChain([devtools, 'access', _28 => _28.current, 'optionalAccess', _29 => _29.init, 'call', _30 => _30(getDevtoolsState(getSnapshotAt()))]);
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
    })]);
    return () => {
      _optionalChain([extension, 'optionalAccess', _31 => _31.disconnect, 'optionalCall', _32 => _32()]);
      _optionalChain([devtoolsUnsubscribe, 'optionalCall', _33 => _33()]);
    };
  }, [extension, goToSnapshot, name]);
  _react.useEffect.call(void 0, () => {
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






exports.useAtomDevtools = useAtomDevtools; exports.useAtomsDebugValue = useAtomsDebugValue; exports.useAtomsDevtools = useAtomsDevtools; exports.useAtomsSnapshot = useAtomsSnapshot; exports.useGotoAtomsSnapshot = useGotoAtomsSnapshot;