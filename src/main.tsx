import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Theme as RadixTheme } from "@radix-ui/themes";
import AppShell from "./components/AppShell";
import { ThemeProvider as EhpThemeProvider } from "./contexts/ThemeContext";
import { applyFont, loadFontId } from "./services/fontPrefs";
import "./index.css";
import "@radix-ui/themes/styles.css";

// Apply the saved font before first paint so there's no flash of the default.
applyFont(loadFontId());

const muiTheme = createTheme({
  typography: {
    fontFamily:
      '"Sukhumvit Set", "Google Sans", "Roboto", "Noto Sans Thai Looped", "Helvetica Neue", Arial, sans-serif',
  },
  palette: {
    primary: { main: "#4285F4" },
    secondary: { main: "#34A853" },
    error: { main: "#EA4335" },
    warning: { main: "#FBBC05" },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <HeroUIProvider>
        <ThemeProvider theme={muiTheme}>
          <RadixTheme accentColor="blue" radius="medium">
            <EhpThemeProvider>
              {/* HeroUI portal-style toast host — addToast() pushes into this.
                  Styled to match HeroUI's dark-pill examples: near-black
                  background, generous radius, colored title + muted body. */}
              <ToastProvider
                placement="top-center"
                toastOffset={32}
                toastProps={{
                  radius: "lg",
                  variant: "bordered",
                  classNames: {
                    base: "!bg-[#0c0c0c] !text-white !border-0 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-md py-3 pl-4 pr-3 gap-3",
                    title: "font-medium text-[14px]",
                    description: "!text-white/65 text-[13px]",
                    closeButton:
                      "absolute right-2 top-2 !text-white/70 hover:!text-white !bg-white/10 hover:!bg-white/20 transition",
                    closeIcon: "!text-white/80",
                  },
                }}
              />
              <AppShell />
            </EhpThemeProvider>
          </RadixTheme>
        </ThemeProvider>
      </HeroUIProvider>
    </BrowserRouter>
  </StrictMode>
);
