import axios from "axios";
import { useNavigate } from "react-router-dom";

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:8080/taskmanager/logout",
        {},
        {
          withCredentials: true,
        }
      );
    } catch (e) {
      console.error(e);
    } finally {
      navigate("/taskmanager", { replace: true });
      window.location.reload();
    }
  };

  return <button onClick={handleLogout}>Đăng xuất</button>;
};

export default LogoutButton;