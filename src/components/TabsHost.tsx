import { Routes, Route } from "react-router";
import { useTabs } from "../contexts/TabsContext";
import App from "../App";
import NewPatientByVoice from "./NewPatientByVoice";
import SOAPSummary from "./SOAPSummary";
import AllMenus from "./AllMenus";
import Settings from "./Settings";
import DoctorSchedule from "./DoctorSchedule";
import Automation from "./Automation";
import AutomationBuilder from "./Automation/Builder";
import Dashboards from "./Dashboards";
import DashboardView from "./Dashboards/View";
import PatientOPD from "./PatientOPD";
import DrNoteConsult from "./PatientOPD/DrNoteConsult";
import PatientRegister from "./PatientRegister";

/**
 * Renders every open tab simultaneously. Only the active tab is visible —
 * inactive tabs are hidden with display:none so their React tree stays
 * mounted and their internal state survives a tab switch. Inactive tabs
 * pass `location={tab.path}` to <Routes> to freeze them at their last route
 * (otherwise every tab would re-render against the current URL).
 */
export default function TabsHost() {
  const { tabs, activeId } = useTabs();

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <div
            key={tab.id}
            hidden={!isActive}
            aria-hidden={!isActive}
            // display:none zeroes layout cost for inactive tabs while
            // preserving their state.
            style={{ display: isActive ? "block" : "none" }}
          >
            <Routes location={isActive ? undefined : tab.path}>
              <Route path="/" element={<App />} />
              <Route path="/menus" element={<AllMenus />} />
              <Route path="/schedule" element={<DoctorSchedule />} />
              <Route path="/automation" element={<Automation />} />
              <Route path="/automation/:id" element={<AutomationBuilder />} />
              <Route path="/dashboards" element={<Dashboards />} />
              <Route path="/dashboards/:id" element={<DashboardView />} />
              <Route path="/opd" element={<PatientOPD />} />
              <Route path="/opd/register" element={<PatientRegister />} />
              <Route path="/opd/:hn" element={<PatientOPD />} />
              <Route path="/opd/:hn/consult" element={<DrNoteConsult />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/patient/new" element={<NewPatientByVoice />} />
              <Route path="/patient/new/manual" element={<NewPatientByVoice />} />
              <Route path="/soap" element={<SOAPSummary />} />
            </Routes>
          </div>
        );
      })}
    </>
  );
}
