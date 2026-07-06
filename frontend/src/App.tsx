import { useState } from "react";
import { useEffect } from "react";
import "./App.css";
import api from "./services/api";
function App() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    api
      .get("/test")
      .then((res) => setMessage(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h1>Task Management</h1>
      <p> {message}</p>
    </div>
  );
}

export default App;
