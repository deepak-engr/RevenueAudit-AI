import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout";
import { ActionPlanPage, AuditResultsPage, DashboardPage, LandingPage, LoginPage, NewAuditPage, PricingPage, RegisterPage, ReportsPage, SettingsPage } from "./pages";

export default function App() { return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route element={<AppLayout />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/audit/new" element={<NewAuditPage />} /><Route path="/audit/:id" element={<AuditResultsPage />} /><Route path="/action-plan" element={<ActionPlanPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/settings" element={<SettingsPage />} /></Route><Route path="/pricing" element={<PricingPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>; }
