import type { ReactElement } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import { expect, describe, it } from 'vitest';
import { FrameContextProvider, FrameContextConsumer, FrameContext, useFrame } from '../src/Context';

type FakeDocument = Document & { x?: number; foo?: number };
type FakeWindow = Window & { y?: number; bar?: number };

describe('The DocumentContext Component', () => {
  it('will establish context variables', async () => {
    const document = { x: 1 } as unknown as FakeDocument;
    const window = { y: 2 } as unknown as FakeWindow;

    const Child = (): ReactElement => (
      <FrameContextConsumer>
        {({ document: doc, window: win }) => {
          expect(doc).toEqual(document);
          expect(win).toEqual(window);
          return <h1>{`x=${(doc as FakeDocument).x},y=${(win as FakeWindow).y}`}</h1>;
        }}
      </FrameContextConsumer>
    );

    render(
      <FrameContextProvider value={{ document, window }}>
        <Child />
      </FrameContextProvider>
    );
  });

  it('exports full context instance to allow accessing via Class.contextType', async () => {
    const document = { foo: 1 } as unknown as FakeDocument;
    const window = { bar: 2 } as unknown as FakeWindow;

    class Child extends React.Component {
      static contextType = FrameContext;
      declare context: React.ContextType<typeof FrameContext>;
      override componentDidMount(): void {
        const { document: doc, window: win } = this.context;
        expect(doc).toEqual({ foo: 1 });
        expect(win).toEqual({ bar: 2 });
      }
      override render(): ReactElement {
        return <></>;
      }
    }

    render(
      <FrameContextProvider value={{ document, window }}>
        <Child />
      </FrameContextProvider>
    );
  });

  it('exports full context instance to allow accessing via custom hook', async () => {
    const document = { foo: 1 } as unknown as FakeDocument;
    const window = { bar: 2 } as unknown as FakeWindow;

    const Child = (): ReactElement => {
      useFrame();

      return (
        <FrameContextConsumer>
          {({ document: doc, window: win }) => {
            expect(doc).toEqual(document);
            expect(win).toEqual(window);
            return <></>;
          }}
        </FrameContextConsumer>
      );
    };

    render(
      <FrameContextProvider value={{ document, window }}>
        <Child />
      </FrameContextProvider>
    );
  });
});
