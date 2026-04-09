import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import LoginPage        from "./pages/LoginPage";
import DashboardPage    from "./pages/DashboardPage";
import OrdersPage       from "./pages/OrdersPage";
import ProductsPage     from "./pages/ProductsPage";
import NewOrderPage     from "./pages/NewOrderPage";
import KitchenPage      from "./pages/KitchenPage";
import CategoriesPage   from "./pages/CategoriesPage";
import UsersPage        from "./pages/UsersPage";
import TablesPage       from "./pages/TablesPage";
import CashRegisterPage from "./pages/CashRegisterPage";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/tables" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Vista cocina — sin sidebar */}
          <Route path="/kitchen" element={
            <PrivateRoute>
              <RoleRoute roles={["ADMIN", "KITCHEN"]}>
                <KitchenPage />
              </RoleRoute>
            </PrivateRoute>
          } />

          {/* App principal — con sidebar */}
          <Route path="/" element={
            <PrivateRoute><Layout /></PrivateRoute>
          }>
            <Route index element={<Navigate to="/tables" replace />} />

            {/* Solo ADMIN */}
            <Route path="dashboard" element={
              <RoleRoute roles={["ADMIN"]}><DashboardPage /></RoleRoute>
            } />
            <Route path="cash" element={
              <RoleRoute roles={["ADMIN"]}><CashRegisterPage /></RoleRoute>
            } />
            <Route path="categories" element={
              <RoleRoute roles={["ADMIN"]}><CategoriesPage /></RoleRoute>
            } />
            <Route path="users" element={
              <RoleRoute roles={["ADMIN"]}><UsersPage /></RoleRoute>
            } />

            {/* Solo ADMIN y CASHIER */}
            <Route path="products" element={
              <RoleRoute roles={["ADMIN", "CASHIER"]}>
                <ProductsPage />
              </RoleRoute>
            } />

            {/* ADMIN, CASHIER y MESERO */}
            <Route path="tables"     element={<TablesPage />} />
            <Route path="orders"     element={<OrdersPage />} />
            <Route path="orders/new" element={<NewOrderPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/tables" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;


