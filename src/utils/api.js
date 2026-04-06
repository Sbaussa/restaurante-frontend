import axios from "axios";

// La variable de entorno apunta al backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Interceptor: si el token expiró (401/403), limpiar sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
