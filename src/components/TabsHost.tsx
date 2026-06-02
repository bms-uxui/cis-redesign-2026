import { Routes, Route } from "react-router";
import { useTabs } from "../contexts/TabsContext";
import App from "../App";
import PatientOPDCard from "./PatientOPDCard";
import AIMode from "./AIMode";
import NewPatientByVoice from "./NewPatientByVoice";
import SOAPSummary from "./SOAPSummary";
import AllMenus from "./AllMenus";
import Settings from "./Settings";

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
              <Route path="/ai" element={<AIMode />} />
              <Route path="/menus" element={<AllMenus />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/patient" element={<PatientOPDCard />} />
              <Route path="/patient/new" element={<NewPatientByVoice />} />
              <Route path="/patient/new/manual" element={<PatientOPDCard />} />
              <Route path="/patient/:hn" element={<PatientOPDCard />} />
              <Route path="/soap" element={<SOAPSummary />} />
            </Routes>
          </div>
        );
      })}
    </>
  );
}
