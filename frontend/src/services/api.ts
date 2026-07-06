import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Đường dẫn tương đối gọi thẳng vào Backend
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
