import { useState } from "react";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

function App() {
  const [currentPage, setCurrentPage] = useState("landing");

  function handleNavigate(page) {
    setCurrentPage(page);
  }

  if (currentPage === "login") {
    return <Login onNavigate={handleNavigate} />;
  }

  return <Landing onNavigate={handleNavigate} />;
}

export default App;