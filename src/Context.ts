import * as React from 'react';

export interface FrameContextProps {
  document?: Document;
  window?: Window;
}

let doc: Document | undefined;
let win: Window | undefined;
if (typeof document !== 'undefined') {
  doc = document;
}
if (globalThis.window !== undefined) {
  win = globalThis.window;
}

export const FrameContext = React.createContext<FrameContextProps>({ document: doc, window: win });

export const useFrame = (): FrameContextProps => React.useContext(FrameContext);

export const { Provider: FrameContextProvider, Consumer: FrameContextConsumer } = FrameContext;
