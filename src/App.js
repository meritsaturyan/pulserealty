// src/App.js
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import AboutUs from './pages/AboutUs';
import Contacts from './pages/Contacts';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';
import SellProperty from './pages/SellProperty';

import AdminChat from './admin/AdminChat';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/Login';
import PropertiesList from './admin/PropertiesList';
import PropertyForm from './admin/PropertyForm';
import ProtectedRoute from './admin/ProtectedRoute';

import Customers from './admin/Customers';

function App() {
  return (
    <Router>
      <Routes>
        {}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/sell" element={<SellProperty />} />
        </Route>

        {}
        <Route path="/admin/login" element={<AdminLogin />} />

        {}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PropertiesList />} />
          <Route path="properties" element={<PropertiesList />} />
          <Route path="properties/new" element={<PropertyForm />} />
          <Route path="properties/:id" element={<PropertyForm />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="customers" element={<Customers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;




