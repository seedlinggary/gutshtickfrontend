import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useFetch from './UseFetch';
import { fetchCategory, fetchData } from './actions';
import { getEmail, getToken, isAdmin, isSuperAdmin, clearAuth } from './auth';

function AppNavbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const email = getEmail();
  const cookie = getToken();
  const boss = isAdmin();
  const superAdmin = isSuperAdmin();

  const { data: categories } = useFetch('/generalc', {
    method: 'GET',
    headers: { 'x-access-token': cookie },
  });

  function go(path) { navigate(path); }

  function goToFeed(path, category) {
    dispatch(fetchCategory(category));
    dispatch(fetchData());
    navigate(path);
  }

  function handleSignOut() {
    clearAuth();
    navigate('/');
    navigate(0);
  }

  return (
    <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark" fixed="top" className="gs-navbar">
      <Container>
        <Navbar.Brand onClick={() => go('/')} style={{ cursor: 'pointer' }}>
          The Good <span>Shtick</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link onClick={() => go('/')}>Home</Nav.Link>
            <Nav.Link onClick={() => go('/about')}>About</Nav.Link>

            <NavDropdown title="Feed" id="feeds-dropdown">
              {boss && (
                <NavDropdown.Item onClick={() => goToFeed('/feed/0', '0')}>
                  ⏳ Pending Approval
                </NavDropdown.Item>
              )}
              <NavDropdown.Item onClick={() => goToFeed('/feed/all', 'all')}>
                All Posts
              </NavDropdown.Item>
              {email && (
                <NavDropdown.Item onClick={() => goToFeed('/feed/liked', 'liked')}>
                  ❤ My Liked Posts
                </NavDropdown.Item>
              )}
              {categories && categories.length > 0 && <NavDropdown.Divider />}
              {categories && categories.map((cat) => (
                <NavDropdown.Item key={cat.id} onClick={() => goToFeed(`/feed/${cat.id}`, cat.id)}>
                  {cat.name}
                </NavDropdown.Item>
              ))}
            </NavDropdown>

            <Nav.Link onClick={() => go('/games')}>🎮 Games</Nav.Link>

            {boss && (
              <NavDropdown title="⚙ Admin" id="admin-dropdown">
                <NavDropdown.Item onClick={() => go('/admin')}>Admin Dashboard</NavDropdown.Item>
                {superAdmin && (
                  <NavDropdown.Item onClick={() => go('/superadmin')}>Super Admin</NavDropdown.Item>
                )}
              </NavDropdown>
            )}
          </Nav>

          <Nav>
            {email ? (
              <>
                <Nav.Link onClick={() => go('/CreateShtick')}>+ Post</Nav.Link>
                <Nav.Link onClick={handleSignOut}>Sign Out</Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link onClick={() => go('/signin')}>Sign In</Nav.Link>
                <Nav.Link onClick={() => go('/signup')}>Sign Up</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
