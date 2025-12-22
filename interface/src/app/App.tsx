import "@/app/styles/App.css";

import { Providers } from "./providers";
import { Router } from "./router";

const App = () => (
  <Providers>
    <Router />
  </Providers>
);

export default App;
