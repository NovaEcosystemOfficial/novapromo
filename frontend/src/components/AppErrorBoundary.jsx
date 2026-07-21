import { Component } from 'react';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[NovaPromo] React error boundary:', error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-boundary" role="alert">
          <h1>Qualcosa non ha funzionato</h1>
          <p>
            NovaPromo ha incontrato un problema temporaneo nell&apos;interfaccia.
            Puoi riprovare o ricaricare l&apos;app.
          </p>
          <p className="app-error-boundary__detail">
            {this.state.error.message || 'Dettaglio non disponibile'}
          </p>
          <div className="app-error-boundary__actions">
            <button type="button" className="btn btn-primary" onClick={this.handleRetry}>
              Riprova
            </button>
            <button type="button" className="btn btn-secondary" onClick={this.handleReload}>
              Ricarica
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
