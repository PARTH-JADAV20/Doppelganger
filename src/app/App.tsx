import { ThemeProvider } from "next-themes";
import { IDE } from "./pages/IDE";
import { Toaster } from "sonner";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <IDE />
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  );
}