// src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';


import Layout from './components/Layout';          
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';
import SellProperty from './pages/SellProperty';
import AboutUs from './pages/AboutUs';
import Contacts from './pages/Contacts';


import AdminLayout from './admin/AdminLayout';      
import PropertiesList from './admin/PropertiesList';
import PropertyForm from './admin/PropertyForm';
import Customers from './admin/Customers';
import SellLeads from './admin/SellLeads';
import AdminChat from './admin/AdminChat';
import Login from './admin/Login';
import ProtectedRoute from './admin/ProtectedRoute';

export default function App() {
  return (
    <Routes>

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />


        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/properties/:id" element={<PropertyDetails />} />

        <Route path="/sell" element={<SellProperty />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contacts" element={<Contacts />} />
      </Route>


      <Route path="/admin/login" element={<Login />} />


      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="properties" element={<PropertiesList />} />
        <Route path="properties/new" element={<PropertyForm />} />
        <Route path="properties/:id" element={<PropertyForm />} />
        <Route path="customers" element={<Customers />} />

  
        <Route path="leads" element={<SellLeads />} />
        <Route path="sell-leads" element={<SellLeads />} />

        <Route path="chat" element={<AdminChat />} />
        <Route index element={<Navigate to="properties" replace />} />
      </Route>

    
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
