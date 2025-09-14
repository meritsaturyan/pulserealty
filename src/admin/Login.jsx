import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate, Link } from 'react-router-dom';

const Wrap = styled.div`
  min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f1115;
`;
const Card = styled.div`
  width: 420px; background:#fff; border-radius:12px; padding:22px; box-shadow:0 10px 30px rgba(0,0,0,.2);
`;
const H = styled.h2`margin:0 0 8px 0;`;
const P = styled.p`margin:0 0 16px 0; color:#6b7280;`;
const Input = styled.input`
  width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;
`;
const Btn = styled.button`
  width:100%; padding:10px 14px; background:#f0ae00; border:none; color:#111; font-weight:700; border-radius:8px; cursor:pointer;
  margin-top:10px;
`;
const Small = styled.div`margin-top:8px; font-size:13px;`;

export default function AdminLogin() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (u === 'admin' && p === 'admin') {
      localStorage.setItem('pulse:admin', '1');
      navigate('/admin');
    } else {
      alert('Սխալ օգտանուն կամ գաղտնաբառ');
    }
  };

  return (
    <Wrap>
      <Card>
        <H>Ադմին մուտք</H>
        <P>Դեմո՝ <b>admin / admin</b></P>
        <form onSubmit={submit}>
          <Input placeholder="Օգտանուն" value={u} onChange={e=>setU(e.target.value)} />
          <div style={{height:10}} />
          <Input type="password" placeholder="Գաղտնաբառ" value={p} onChange={e=>setP(e.target.value)} />
          <Btn type="submit">Մուտք</Btn>
        </form>
        <Small><Link to="/#/">← Վերադարձ կայք</Link></Small>
      </Card>
    </Wrap>
  );
}


