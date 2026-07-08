import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/taskmanager/api", // Đường dẫn tương đối gọi thẳng vào Backend
  // Dòng này cực kỳ quan trọng để gửi Cookie JSESSIONID sang backend
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
