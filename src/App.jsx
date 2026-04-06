import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import NewOrderPage from "./pages/NewOrderPage";
import KitchenPage from "./pages/KitchenPage";
import CategoriesPage from "./pages/CategoriesPage";
import UsersPage from "./pages/UsersPage";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

// Redirige si el usuario no tiene el rol requerido
function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Vista cocina — sin sidebar */}
          <Route
            path="/kitchen"
            element={
              <PrivateRoute>
                <RoleRoute roles={["ADMIN", "KITCHEN"]}>
                  <KitchenPage />
                </RoleRoute>
              </PrivateRoute>
            }
          />

          {/* App principal — con sidebar */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/new" element={<NewOrderPage />} />
            <Route path="products" element={<ProductsPage />} />

            {/* Solo ADMIN */}
            <Route path="categories" element={
              <RoleRoute roles={["ADMIN"]}>
                <CategoriesPage />
              </RoleRoute>
            } />
            <Route path="users" element={
              <RoleRoute roles={["ADMIN"]}>
                <UsersPage />
              </RoleRoute>
            } />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;