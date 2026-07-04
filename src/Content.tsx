import type { ReactElement } from 'react';
import { Children, Component } from 'react';

interface ContentProps {
  children: ReactElement;
  contentDidMount: () => void;
  contentDidUpdate: () => void;
}

export default class Content extends Component<ContentProps> {
  override componentDidMount(): void {
    this.props.contentDidMount();
  }

  override componentDidUpdate(): void {
    this.props.contentDidUpdate();
  }

  override render(): ReactElement {
    return Children.only(this.props.children);
  }
}
