import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Header, Footer, Spinner, ToastProvider } from "./components/UI";
import Home from "./pages/Home";
import { AuthProvider } from "./auth/AuthProvider";
import { WorkspaceWelcome } from "./components/WorkspaceWelcome";
import { isGitHubPages } from "./lib/paths";
import { getPreference } from "./lib/storage";
const Editor = lazy(() => import("./pages/Editor"));
const Library = lazy(() => import("./pages/Library"));
const Projects = lazy(() => import("./pages/Projects"));
const Compare = lazy(() => import("./pages/Compare"));
const Pricing = lazy(() =>
  import("./pages/Info").then((m) => ({ default: m.Pricing })),
);
const Settings = lazy(() =>
  import("./pages/Info").then((m) => ({ default: m.Settings })),
);
const Help = lazy(() =>
  import("./pages/Info").then((m) => ({ default: m.Help })),
);
const Legal = lazy(() =>
  import("./pages/Info").then((m) => ({ default: m.Legal })),
);
const NotFound = lazy(() =>
  import("./pages/Info").then((m) => ({ default: m.NotFound })),
);
const AuthPage = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.AuthPage })),
);
const Account = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.Account })),
);
const CloudSetup = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.CloudSetup })),
);
const Router = isGitHubPages ? HashRouter : BrowserRouter;
function Layout() {
  const { pathname } = useLocation();
  const editor = pathname === "/editor" || pathname.startsWith("/editor/");
  useEffect(() => {
    getPreference("reducedMotion", false)
      .then((v) => (document.documentElement.dataset.reduceMotion = String(v)))
      .catch(() => {});
  }, []);
  return (
    <>
      {!editor && <Header />}
      <Suspense
        fallback={
          <main className="route-loading">
            <Spinner label="Opening your studio…" />
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path="/explore" element={<Library />} />
          <Route path="/presets" element={<Library saved />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/history" element={<Projects history />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/privacy" element={<Legal />} />
          <Route path="/terms" element={<Legal terms />} />
          <Route path="/login" element={<AuthPage key="login" />} />
          <Route
            path="/signup"
            element={<AuthPage key="signup" mode="signup" />}
          />
          <Route
            path="/forgot-password"
            element={<AuthPage key="forgot" mode="forgot" />}
          />
          <Route
            path="/reset-password"
            element={<AuthPage key="reset" mode="reset" />}
          />
          <Route path="/account" element={<Account />} />
          <Route path="/setup" element={<CloudSetup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <WorkspaceWelcome />
      {!editor && <Footer />}
    </>
  );
}
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Layout />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}
