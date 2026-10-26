import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Home from './pages/Home.jsx';
import CreateIncident from './pages/CreateIncident.jsx';
import InvestigationRoom from './pages/InvestigationRoom.jsx';
import SubmitFindings from './pages/SubmitFindings.jsx';
import Results from './pages/Results.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateIncident />} />
          <Route path="/cases/:id" element={<InvestigationRoom />} />
          <Route path="/cases/:id/submit" element={<SubmitFindings />} />
          <Route path="/cases/:id/results" element={<Results />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        Educational simulator. Every organisation, user, host and log line is fictional and synthetic.
      </footer>
    </ToastProvider>
  );
}
