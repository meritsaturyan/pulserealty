// src/components/Layout.jsx
import React, { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Header from './Header';
import Footer from './Footer';

const Main = styled.main` flex: 1; `;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;

  ${({ $withBackground }) =>
    $withBackground &&
    `
    background-image: url('https://images.unsplash.com/photo-1501183638710-841dd1904471');
    background-size: cover;
    background-position: center;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background-color: rgba(0,0,0,0.5);
      z-index: 0;
    }
    > * { position: relative; z-index: 1; }
  `}
`;

const Layout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const propertiesRef = useRef(null);
  const scrollToProperties = () => {
    propertiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Wrapper $withBackground={!isHomePage}>
      <Header onPropertiesClick={scrollToProperties} />
      <Main>
        <Outlet context={{ propertiesRef }} />
      </Main>
      <Footer />
    </Wrapper>
  );
};

export default Layout;











