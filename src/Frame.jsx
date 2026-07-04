import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FrameContextProvider } from './Context';
import Content from './Content';

export class Frame extends Component {
  // React warns when you render directly into the body since browser extensions
  // also inject into the body and can mess up React. For this reason
  // initialContent is expected to have a div inside of the body
  // element that we render react into.
  static propTypes = {
    style: PropTypes.object,
    head: PropTypes.node,
    initialContent: PropTypes.string,
    mountTarget: PropTypes.string,
    dangerouslyUseDocWrite: PropTypes.bool,
    contentDidMount: PropTypes.func,
    contentDidUpdate: PropTypes.func,
    children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]),
  };

  static defaultProps = {
    style: {},
    head: undefined,
    children: undefined,
    mountTarget: undefined,
    dangerouslyUseDocWrite: false,
    contentDidMount: () => {},
    contentDidUpdate: () => {},
    initialContent: '<!DOCTYPE html><html><head></head><body><div class="frame-root"></div></body></html>',
  };

  constructor(props, context) {
    super(props, context);
    this._isMounted = false;
    this.nodeRef = React.createRef();
    this.state = { iframeLoaded: false };
  }

  componentDidMount() {
    this._isMounted = true;

    const doc = this.getDoc();

    if (doc) {
      this.nodeRef.current.contentWindow.addEventListener('DOMContentLoaded', this.handleLoad);
    }

    if (this.props.dangerouslyUseDocWrite) {
      this.handleLoad();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;

    // The listener was added to the iframe's content window in componentDidMount.
    this.nodeRef.current?.contentWindow?.removeEventListener('DOMContentLoaded', this.handleLoad);
  }

  getDoc() {
    return this.nodeRef.current ? this.nodeRef.current.contentDocument : undefined;
  }

  getMountTarget() {
    const doc = this.getDoc();

    if (!doc || !doc.body) {
      return;
    }

    if (this.props.mountTarget) {
      return doc.querySelector(this.props.mountTarget);
    }

    return doc.body.children[0];
  }

  setRef = (node) => {
    this.nodeRef.current = node;

    const { forwardedRef } = this.props;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  handleLoad = () => {
    // Bail update as some browsers will trigger on both DOMContentLoaded & onLoad ala firefox
    if (!this.state.iframeLoaded) {
      this.setState({ iframeLoaded: true });
    }
  };

  renderFrameContents() {
    if (!this._isMounted) {
      return;
    }

    const doc = this.getDoc();

    if (!doc) {
      return;
    }

    const { contentDidMount, contentDidUpdate } = this.props;

    const win = doc.defaultView || doc.parentView;
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
      doc.write(this.props.initialContent);
      doc.close();
    }

    const mountTarget = this.getMountTarget();

    if (!mountTarget) {
      return;
    }

    return [
      ReactDOM.createPortal(this.props.head, doc.head, 'head'),
      ReactDOM.createPortal(contents, mountTarget, 'contents'),
    ];
  }

  render() {
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
      iframeProps.srcDoc = initialContent;
    }

    return (
      // oxlint-disable-next-line jsx-a11y/iframe-has-title -- consumers can pass `title` via the props spread
      <iframe {...iframeProps} ref={this.setRef} onLoad={this.handleLoad}>
        {this.state.iframeLoaded && this.renderFrameContents()}
      </iframe>
    );
  }
}

export default React.forwardRef((props, ref) => <Frame {...props} forwardedRef={ref} />);
