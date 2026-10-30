import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import Registry from './pages/Registry';
import Institutions from './pages/Institutions';
import Submit from './pages/Submit';
import Verification from './pages/Verification';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Evidence from './pages/Evidence';
import BankDesk from './pages/BankDesk';
import Compliance from './pages/Compliance';
import Release from './pages/Release';
import Impact from './pages/Impact';
import DemoQA from './pages/DemoQA';
export default function App(){return <Routes><Route element={<Shell/>}><Route index element={<Dashboard/>}/><Route path="/registry" element={<Registry/>}/><Route path="/institutions" element={<Institutions/>}/><Route path="/submit" element={<Submit/>}/><Route path="/verification" element={<Verification/>}/><Route path="/evidence" element={<Evidence/>}/><Route path="/bank-desk" element={<BankDesk/>}/><Route path="/compliance" element={<Compliance/>}/><Route path="/release" element={<Release/>}/><Route path="/impact" element={<Impact/>}/><Route path="/demo-qa" element={<DemoQA/>}/><Route path="/audit" element={<Audit/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
