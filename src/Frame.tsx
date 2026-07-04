import * as React from 'react';
import * as ReactDOM from 'react-dom';
import type { FrameContextProps } from './Context.js';
import { FrameContextProvider } from './Context.js';
import Content from './Content.js';

interface FrameOwnProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  head?: React.ReactNode | undefined;
  mountTarget?: string | undefined;
  initialContent?: string | undefined;
  contentDidMount?: (() => void) | undefined;
  contentDidUpdate?: (() => void) | undefined;
  dangerouslyUseDocWrite?: boolean | undefined;
  children?: React.ReactNode | undefined;
}

// The public props type accepts `ref` (forwarded to the underlying iframe element),
// while the internal class must not declare `ref` in its props so that a ref on
// `Frame` itself keeps referring to the component instance.
export type FrameComponentProps = FrameOwnProps & React.RefAttributes<HTMLIFrameElement>;

interface InternalFrameProps extends FrameOwnProps {
  forwardedRef?: React.ForwardedRef<HTMLIFrameElement> | undefined;
}

interface FrameState {
  iframeLoaded: boolean;
}

// React warns when you render directly into the body since browser extensions
// also inject into the body and can mess up React. For this reason
// initialContent is expected to have a div inside of the body
// element that we render react into.
const DEFAULT_INITIAL_CONTENT = '<!DOCTYPE html><html><head></head><body><div class="frame-root"></div></body></html>';

const resilientContainers = new WeakSet<Node>();

/**
 * Makes a portal container tolerate DOM mutations performed by scripts running
 * inside the iframe document.
 *
 * Scripts in the loaded document (e.g. `initialContent` of a generated app) may
 * remove or move the nodes React rendered into the container. React would then
 * throw `NotFoundError` from `removeChild`/`insertBefore` while committing an
 * update or unmount, crashing the parent React tree. Shadowing these methods on
 * the container node itself (not on the realm's prototypes, so the embedded
 * app's own DOM code keeps standard semantics) lets React degrade gracefully.
 */
function makePortalContainerResilient(container: Element): void {
  if (resilientContainers.has(container)) {
    return;
  }
  resilientContainers.add(container);

  const originalRemoveChild = container.removeChild.bind(container);
  container.removeChild = <T extends Node>(child: T): T => {
    // The child was already detached by the embedded document's scripts; React
    // only wants it gone from the container, so this is a successful no-op.
    if (child.parentNode !== container) {
      return child;
    }
    return originalRemoveChild(child) as T;
  };

  const originalInsertBefore = container.insertBefore.bind(container);
  container.insertBefore = <T extends Node>(node: T, reference: Node | null): T => {
    // The reference sibling was detached by the embedded document's scripts;
    // appending is the closest position that keeps the node in the container.
    if (reference !== null && reference.parentNode !== container) {
      container.append(node);
      return node;
    }
    return originalInsertBefore(node, reference) as T;
  };
}

export class Frame extends React.Component<InternalFrameProps, FrameState> {
  private _isMounted = false;
  private _contextValue: FrameContextProps | undefined;
  private readonly nodeRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  override state: FrameState = { iframeLoaded: false };

  override componentDidMount(): void {
    this._isMounted = true;

    const doc = this.getDoc();

    if (doc) {
      this.nodeRef.current?.contentWindow?.addEventListener('DOMContentLoaded', this.handleLoad);
    }

    if (this.props.dangerouslyUseDocWrite) {
      this.handleLoad();
    }
  }

  override componentWillUnmount(): void {
    this._isMounted = false;

    // The listener was added to the iframe's content window in componentDidMount.
    // A null document means the content window is cross-origin (e.g. a sandbox
    // without allow-same-origin) — no listener was added there, and touching the
    // window would throw SecurityError and crash the unmounting React tree.
    if (this.getDoc()) {
      this.nodeRef.current?.contentWindow?.removeEventListener('DOMContentLoaded', this.handleLoad);
    }
  }

  getDoc(): Document | undefined {
    return this.nodeRef.current?.contentDocument ?? undefined;
  }

  getMountTarget(): Element | undefined {
    const doc = this.getDoc();

    if (!doc || !doc.body) {
      return undefined;
    }

    if (this.props.mountTarget) {
      return doc.querySelector(this.props.mountTarget) ?? undefined;
    }

    return doc.body.children[0];
  }

  setRef = (node: HTMLIFrameElement | null): void => {
    this.nodeRef.current = node;

    const { forwardedRef } = this.props;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  handleLoad = (): void => {
    // Bail update as some browsers will trigger on both DOMContentLoaded & onLoad ala firefox
    if (!this.state.iframeLoaded) {
      this.setState({ iframeLoaded: true });
    }
  };

  renderFrameContents(): React.ReactNode {
    if (!this._isMounted) {
      return undefined;
    }

    const doc = this.getDoc();

    if (!doc) {
      return undefined;
    }

    const { contentDidMount = () => {}, contentDidUpdate = () => {} } = this.props;

    const win = doc.defaultView ?? undefined;
    // Reuse the context value across renders so consumers only re-render when the
    // document or window actually changes, not on every render of Frame.
    if (!this._contextValue || this._contextValue.document !== doc || this._contextValue.window !== win) {
      this._contextValue = { document: doc, window: win };
    }
    const contents = (
      <Content contentDidMount={contentDidMount} contentDidUpdate={contentDidUpdate}>
        <FrameContextProvider value={this._contextValue}>
          <div className="frame-content">{this.props.children}</div>
        </FrameContextProvider>
      </Content>
    );

    if (this.props.dangerouslyUseDocWrite && doc.body.children.length === 0) {
      doc.open('text/html', 'replace');
      doc.write(this.props.initialContent ?? DEFAULT_INITIAL_CONTENT);
      doc.close();
    }

    const mountTarget = this.getMountTarget();

    if (!mountTarget) {
      return undefined;
    }

    makePortalContainerResilient(doc.head);
    makePortalContainerResilient(mountTarget);

    return [
      ReactDOM.createPortal(this.props.head, doc.head, 'head'),
      ReactDOM.createPortal(contents, mountTarget, 'contents'),
    ];
  }

  override render(): React.ReactElement {
    // The iframe isn't ready so we drop children from the iframe props here. #12, #17
    const {
      children: _children,
      contentDidMount: _contentDidMount,
      contentDidUpdate: _contentDidUpdate,
      dangerouslyUseDocWrite,
      forwardedRef: _forwardedRef,
      head: _head,
      initialContent,
      mountTarget: _mountTarget,
      ...iframeProps
    } = this.props;

    if (!dangerouslyUseDocWrite) {
      iframeProps.srcDoc = initialContent ?? DEFAULT_INITIAL_CONTENT;
    }

    return (
      // oxlint-disable-next-line jsx-a11y/iframe-has-title -- consumers can pass `title` via the props spread
      <iframe {...iframeProps} ref={this.setRef} onLoad={this.handleLoad}>
        {this.state.iframeLoaded && this.renderFrameContents()}
      </iframe>
    );
  }
}

export default React.forwardRef<HTMLIFrameElement, FrameOwnProps>((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
