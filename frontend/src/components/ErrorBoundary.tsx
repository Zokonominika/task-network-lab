import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Bir şeyler ters gitti.</h1>
          <p className="text-gray-400 mb-6">Laboratuvar ortamında beklenmedik bir hata oluştu.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
          >
            Yeniden Yükle
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
