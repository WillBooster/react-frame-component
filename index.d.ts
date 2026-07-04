import * as React from 'react';

export interface FrameComponentProps
  extends React.IframeHTMLAttributes<HTMLIFrameElement>,
    React.RefAttributes<HTMLIFrameElement> {
  head?: React.ReactNode | undefined;
  mountTarget?: string | undefined;
  initialContent?: string | undefined;
  contentDidMount?: (() => void) | undefined;
  contentDidUpdate?: (() => void) | undefined;
  dangerouslyUseDocWrite?: boolean | undefined;
  children?: React.ReactNode | undefined;
}

declare const FrameComponent: React.ForwardRefExoticComponent<FrameComponentProps>;
export default FrameComponent;

export interface FrameContextProps {
  document?: Document;
  window?: Window;
}

export declare const FrameContext: React.Context<FrameContextProps>;

export declare const FrameContextProvider: React.Provider<FrameContextProps>;

export declare const FrameContextConsumer: React.Consumer<FrameContextProps>;

export declare function useFrame(): FrameContextProps;
