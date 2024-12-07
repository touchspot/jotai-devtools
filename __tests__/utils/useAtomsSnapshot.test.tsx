import React, { StrictMode, useState } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { Provider, useAtom, useAtomValue } from 'jotai/react';
import { atom, createStore } from 'jotai/vanilla';
import { useAtomsSnapshot } from 'jotai-devtools';

describe('useAtomsSnapshot', () => {
  it('[DEV-ONLY] should register newly added atoms', async () => {
    __DEV__ = true;
    const countAtom = atom(1);
    const petAtom = atom('cat');

    const DisplayCount = () => {
      const [clicked, setClicked] = useState(false);
      const [count] = useAtom(countAtom);

      return (
        <>
          <p>count: {count}</p>
          <button onClick={() => setClicked(true)}>click</button>
          {clicked && <DisplayPet />}
        </>
      );
    };

    const DisplayPet = () => {
      const [pet] = useAtom(petAtom);
      return <p>pet: {pet}</p>;
    };

    const RegisteredAtomsCount = () => {
      const atoms = useAtomsSnapshot().values;

      return <p>atom count: {atoms.size}</p>;
    };

    const { findByText, getByText } = render(
      <StrictMode>
        <DisplayCount />
        <RegisteredAtomsCount />
      </StrictMode>,
    );

    await findByText('atom count: 1');
    fireEvent.click(getByText('click'));
    await findByText('atom count: 2');
  });

  it('[DEV-ONLY] should let you access atoms and their state', async () => {
    __DEV__ = true;
    const countAtom = atom(1);
    countAtom.debugLabel = 'countAtom';
    const petAtom = atom('cat');
    petAtom.debugLabel = 'petAtom';

    const Displayer = () => {
      useAtom(countAtom);
      useAtom(petAtom);
      return null;
    };

    const SimpleDevtools = () => {
      const atoms = useAtomsSnapshot().values;

      return (
        <div>
          {Array.from(atoms).map(([atom, atomValue]) => (
            <p key={atom.debugLabel}>{`${atom.debugLabel}: ${atomValue}`}</p>
          ))}
        </div>
      );
    };

    const { findByText } = render(
      <StrictMode>
        <Displayer />
        <SimpleDevtools />
      </StrictMode>,
    );

    await findByText('countAtom: 1');
    await findByText('petAtom: cat');
  });

  it('[DEV-ONLY] should contain initial values', async () => {
    __DEV__ = true;
    const countAtom = atom(1);
    countAtom.debugLabel = 'countAtom';
    const petAtom = atom('cat');
    petAtom.debugLabel = 'petAtom';

    const Displayer = () => {
      useAtom(countAtom);
      useAtom(petAtom);
      return null;
    };

    const SimpleDevtools = () => {
      const atoms = useAtomsSnapshot().values;

      return (
        <div>
          {Array.from(atoms).map(([atom, atomValue]) => (
            <p key={atom.debugLabel}>{`${atom.debugLabel}: ${atomValue}`}</p>
          ))}
        </div>
      );
    };

    const store = createStore();
    store.set(countAtom, 42);
    store.set(petAtom, 'dog');

    const { findByText } = render(
      <StrictMode>
        <Provider store={store}>
          <Displayer />
          <SimpleDevtools />
        </Provider>
      </StrictMode>,
    );

    await findByText('countAtom: 42');
    await findByText('petAtom: dog');
  });

  it('[DEV-ONLY] should filter private atoms', async () => {
    __DEV__ = true;
    const petAtom = atom('cat');
    petAtom.debugLabel = 'petAtom';
    const lengthAtom = atom((get) => get(petAtom).length);
    lengthAtom.debugLabel = 'lengthAtom';
    lengthAtom.debugPrivate = true;

    const shouldShowPrivateAtomsAtom = atom(false);
    shouldShowPrivateAtomsAtom.debugLabel = 'shouldShowPrivateAtomsAtom';
    shouldShowPrivateAtomsAtom.debugPrivate = true;

    const Displayer = () => {
      useAtom(lengthAtom);
      useAtom(petAtom);
      return null;
    };

    const SimpleDevtools = () => {
      const { values: atoms, dependents } = useAtomsSnapshot({
        shouldShowPrivateAtoms: useAtomValue(shouldShowPrivateAtomsAtom),
      });

      return (
        <div>
          {Array.from(atoms).map(([atom, atomValue]) => (
            <p key={atom.debugLabel}>
              {`${atom.debugLabel}: ${atomValue} (deps: ${Array.from(
                dependents.get(atom) || [],
                (atom) => atom.debugLabel,
              ).join(', ')})`}
            </p>
          ))}
        </div>
      );
    };

    const store = createStore();
    store.set(petAtom, 'dog');

    const { findByText, findAllByText } = render(
      <StrictMode>
        <Provider store={store}>
          <Displayer />
          <SimpleDevtools />
        </Provider>
      </StrictMode>,
    );

    await expect(() =>
      findAllByText('lengthAtom', { exact: false }),
    ).rejects.toThrow('Unable to find an element with the text: lengthAtom.');
    await findByText('petAtom: dog (deps: )');

    await act(() => store.set(shouldShowPrivateAtomsAtom, true));

    await findAllByText('lengthAtom', { exact: false });
    await findByText('petAtom: dog (deps: lengthAtom)');
  });

  it('[DEV-ONLY] conditional dependencies + updating state should call devtools.send', async () => {
    __DEV__ = true;
    const countAtom = atom(0);
    countAtom.debugLabel = 'countAtom';
    const secondCountAtom = atom(0);
    secondCountAtom.debugLabel = 'secondCountAtom';
    const enabledAtom = atom(true);
    enabledAtom.debugLabel = 'enabledAtom';
    const anAtom = atom((get) =>
      get(enabledAtom) ? get(countAtom) : get(secondCountAtom),
    );
    anAtom.debugLabel = 'anAtom';
    const App = () => {
      const [enabled, setEnabled] = useAtom(enabledAtom);
      const [cond] = useAtom(anAtom);

      return (
        <div className="App">
          <h1>enabled: {enabled ? 'true' : 'false'}</h1>
          <h1>condition: {cond}</h1>
          <button onClick={() => setEnabled(!enabled)}>change</button>
        </div>
      );
    };

    const SimpleDevtools = () => {
      const { dependents } = useAtomsSnapshot();

      const obj: Record<string, string[]> = {};

      for (const [atom, dependentAtoms] of dependents) {
        obj[`${atom}`] = [...dependentAtoms].map((_atom) => `${_atom}`);
      }

      return <div>{JSON.stringify(obj)}</div>;
    };

    const { getByText } = render(
      <StrictMode>
        <App />
        <SimpleDevtools />
      </StrictMode>,
    );

    await waitFor(() => {
      getByText('enabled: true');
      getByText('condition: 0');
      getByText(
        JSON.stringify({
          [`${enabledAtom}`]: [`${anAtom}`],
          [`${countAtom}`]: [`${anAtom}`],
          [`${anAtom}`]: [],
        }),
      );
    });
    fireEvent.click(getByText('change'));
    await waitFor(() => {
      getByText('enabled: false');
      getByText('condition: 0');
      getByText(
        JSON.stringify({
          [`${enabledAtom}`]: [`${anAtom}`],
          [`${anAtom}`]: [],
          [`${secondCountAtom}`]: [`${anAtom}`],
        }),
      );
    });

    fireEvent.click(getByText('change'));
    await waitFor(() => {
      getByText('enabled: true');
      getByText('condition: 0');
      getByText(
        JSON.stringify({
          [`${enabledAtom}`]: [`${anAtom}`],
          [`${anAtom}`]: [],
          [`${countAtom}`]: [`${anAtom}`],
        }),
      );
    });
  });
});
