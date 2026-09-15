import React from 'react';

/** Generic, reusable error boundary -- unlike App.js's GameErrorBoundary
 * (which is games-flavored and wraps the whole route tree), this is meant
 * to wrap one section of a page so a failure there shows an honest message
 * plus the real error (so it's actually diagnosable) instead of a
 * confusing top-level fallback meant for a different part of the site.
 *
 * Usage: <ErrorBoundary fallback={(error, retry) => <div>...</div>}>...
 * `fallback` is optional -- a reasonable default is rendered without it. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  retry() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.retry);
      return (
        <div className="gs-error-box">
          <p style={{ margin: 0, fontWeight: 700 }}>Something went wrong here.</p>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>{String(this.state.error?.message || this.state.error)}</p>
          <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 10 }} onClick={this.retry}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
