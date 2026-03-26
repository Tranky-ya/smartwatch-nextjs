'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersListPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    const userData = JSON.parse(user);
    setCurrentUser(userData);
    
    // Solo SUPER_ADMIN y ADMIN pueden ver usuarios
    const userRole = userData.role?.toUpperCase();
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Error al cargar usuarios');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`¿Estás seguro de desactivar a ${userName}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert('✅ Usuario desactivado');
        loadUsers();
      } else {
        const data = await response.json();
        alert(`❌ ${data.error || 'Error al desactivar'}`);
      }
    } catch (err) {
      alert('❌ Error de conexión');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      'admin': { emoji: '🔴', label: 'Admin', color: '#dc2626' },
      'manager': { emoji: '🟠', label: 'Manager', color: '#ea580c' },
      'operator': { emoji: '🟡', label: 'Operator', color: '#ca8a04' },
      'viewer': { emoji: '🟢', label: 'Viewer', color: '#16a34a' }
    };
    const badge = badges[role?.toLowerCase()] || badges['viewer'];
    return (
      <span style={{ 
        background: badge.color, 
        color: 'white', 
        padding: '4px 12px', 
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {badge.emoji} {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6ee' }}>
      <header style={{
        background: 'linear-gradient(135deg, #ff5e32 0%, #e64a21 100%)',
        color: 'white',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/images/LOGO-02.png" alt="Full Tranki" style={{ height: '60px', filter: 'brightness(0) invert(1)' }} />
            <div>
              <h1 style={{ margin: '0 0 5px 0' }}>Gestión de Usuarios</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push('/admin/users/new')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.9)',
                color: '#ff5e32',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ➕ Nuevo Usuario
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🏠 Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                background: '#202d35',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {error && (
          <div style={{ padding: '15px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Usuario</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Rol</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Organización</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500', color: '#111827' }}>{user.full_name || 'Sin nombre'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>ID: {user.id.substring(0, 8)}...</div>
                  </td>
                  <td style={{ padding: '12px', color: '#374151' }}>{user.email}</td>
                  <td style={{ padding: '12px' }}>{getRoleBadge(user.role)}</td>
                  <td style={{ padding: '12px', color: '#374151' }}>
                    {user.organization?.name || 'Sin organización'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {user.is_active ? (
                      <span style={{ color: '#16a34a', fontWeight: '500' }}>✅ Activo</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: '500' }}>❌ Inactivo</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                        style={{
                          padding: '6px 12px',
                          background: '#9dc4d5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        ✏️ Editar
                      </button>
                      {currentUser?.id !== user.id && (
                        <button
                          onClick={() => handleDelete(user.id, user.full_name || user.email)}
                          style={{
                            padding: '6px 12px',
                            background: '#ff5e32',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          🗑️ Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>📭 No hay usuarios registrados</p>
              <button
                onClick={() => router.push('/admin/users/new')}
                style={{
                  padding: '10px 20px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ➕ Crear Primer Usuario
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
