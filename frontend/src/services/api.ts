import axios from "axios";

const api = axios.create({
  baseURL: "/taskmanager/api",
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
