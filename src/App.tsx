import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Registry from './pages/Registry';
import Institutions from './pages/Institutions';
import Submit from './pages/Submit';
import Verification from './pages/Verification';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Evidence from './pages/Evidence';
import BankDesk from './pages/BankDesk';
import BankPortalDesk from './pages/BankPortalDesk';
import Compliance from './pages/Compliance';
import Alerts from './pages/Alerts';
import Release from './pages/Release';
import Parameters from './pages/Parameters';
import VerifyNoc from './pages/VerifyNoc';
import VerifyAudit from './pages/VerifyAudit';
import Reports from './pages/Reports';
import Impact from './pages/Impact';
import DemoQA from './pages/DemoQA';

export default function App() {
  return (
    <Routes>
      {/* Standalone Landing Page - Entry & /welcome Route (No AICTE Shell) */}
      <Route path="/" element={<Landing />} />
      <Route path="/welcome" element={<Landing />} />

      {/* Standalone Bank-side Portal Desk & NOC / Audit Verification - No AICTE Sidebar */}
      <Route path="/desk/:token" element={<BankPortalDesk />} />
      <Route path="/verify/:code" element={<VerifyNoc />} />
      <Route path="/verify" element={<VerifyNoc />} />
      <Route path="/verify-audit" element={<VerifyAudit />} />

      {/* Main AICTE Operations Shell */}
      <Route element={<Shell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/registry" element={<Registry />} />
        <Route path="/institutions" element={<Institutions />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/bank-desk" element={<BankDesk />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/release" element={<Release />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/parameters" element={<Parameters />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/demo-qa" element={<DemoQA />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
