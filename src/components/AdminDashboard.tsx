import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { Role, User, ProductModuleResponse, CreateRoleRequest, CreateUserRequest } from '../types/admin';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<ProductModuleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [activeProductTab, setActiveProductTab] = useState<number | null>(null);

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  // Form states
  const [roleForm, setRoleForm] = useState<CreateRoleRequest>({
    name: '',
    description: '',
    productModuleIds: []
  });
  const [userForm, setUserForm] = useState<CreateUserRequest>({
    email: '',
    password: '',
    roleId: undefined
  });
  const [editUserForm, setEditUserForm] = useState<{ roleId: number | undefined }>({
    roleId: undefined
  });


  // Helper functions for the tabbed interface
  const getUniqueProducts = useCallback(() => {
    // Extract unique products from the product-modules data
    const uniqueProductsMap = new Map();
    modules.forEach(productModule => {
      if (productModule.product) {
        uniqueProductsMap.set(productModule.product.productId, {
          productId: productModule.product.productId,
          productName: productModule.product.productName,
          createdAt: productModule.product.createdAt
        });
      }
    });
    return Array.from(uniqueProductsMap.values());
  }, [modules]);

  const getModulesForProduct = useCallback((productId: number) => {
    const filteredModules = modules.filter(module => module.product?.productId === productId);
    return filteredModules;
  }, [modules]);

  const groupModulesByProduct = useCallback((productModules: ProductModuleResponse[]) => {
    const grouped = new Map<string, ProductModuleResponse[]>();
    
    productModules.forEach(pm => {
      const productName = pm.product?.productName || 'Unknown Product';
      if (!grouped.has(productName)) {
        grouped.set(productName, []);
      }
      grouped.get(productName)!.push(pm);
    });
    
    // Sort products alphabetically and modules by display order
    const sortedGroups = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([productName, modules]) => ({
        productName,
        modules: modules.sort((a, b) => 
          (a.module.displayOrder || 0) - (b.module.displayOrder || 0)
        )
      }));
    
    return sortedGroups;
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Set first product as active when modules load
    if (modules.length > 0 && activeProductTab === null) {
      const products = getUniqueProducts();
      if (products.length > 0) {
        setActiveProductTab(products[0].productId);
      }
    }
  }, [modules, activeProductTab, getUniqueProducts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, usersData, modulesData] = await Promise.all([
        adminService.getRoles(),
        adminService.getUsers(),
        adminService.getProductModules()
      ]);
      
      setRoles(rolesData);
      setUsers(usersData);
      setModules(modulesData);
      
    } catch (err: any) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setModalError(''); // Clear any existing modal errors
    
    try {
      if (editingRole) {
        const updatedRole = await adminService.updateRole(editingRole.id, roleForm);
        setRoles(roles.map(r => r.id === updatedRole.id ? updatedRole : r));
        setSuccessMessage('Role updated successfully!');
      } else {
        const newRole = await adminService.createRole(roleForm);
        setRoles([...roles, newRole]);
        setSuccessMessage('Role created successfully!');
      }
      setShowRoleModal(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '', productModuleIds: [] });
      setModalError('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save role';
      setModalError(errorMessage);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await adminService.createUser(userForm);
      setUsers([...users, newUser]);
      setShowUserModal(false);
      setUserForm({ email: '', password: '', roleId: undefined });
      setSuccessMessage('User created successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create user';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  const deleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteRoleModal(true);
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      await adminService.deleteRole(roleId);
      setRoles(roles.filter(r => r.id !== roleId));
      setSuccessMessage('Role deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete role';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleUpdateUser = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingUser) return;
    
    try {
      const updatedUser = await adminService.updateUser(editingUser.id, {
        roleId: editUserForm.roleId
      });
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setShowEditUserModal(false);
      setEditingUser(null);
      setEditUserForm({ roleId: undefined });
      setSuccessMessage('User updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update user';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  const deleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteUserModal(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete user';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Hold-to-delete functionality
  const startHold = () => {
    setIsHolding(true);
    setHasTriggered(false);
    const interval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          setHasTriggered(true);
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!hasTriggered) {
        // Trigger deletion
        if (roleToDelete) {
          handleDeleteRole(roleToDelete.id);
          setShowDeleteRoleModal(false);
          setRoleToDelete(null);
        } else if (userToDelete) {
          handleDeleteUser(userToDelete.id);
          setShowDeleteUserModal(false);
          setUserToDelete(null);
        }
        resetHoldState();
      }
    }, 2000);

    // Store interval and timeout for cleanup
    (window as any).holdInterval = interval;
    (window as any).holdTimeout = timeout;
  };

  const stopHold = () => {
    setIsHolding(false);
    if ((window as any).holdInterval) {
      clearInterval((window as any).holdInterval);
    }
    if ((window as any).holdTimeout) {
      clearTimeout((window as any).holdTimeout);
    }
    setTimeout(() => resetHoldState(), 200);
  };

  const resetHoldState = () => {
    setHoldProgress(0);
    setIsHolding(false);
    setHasTriggered(false);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      roleId: user.role?.id
    });
    setShowEditUserModal(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      productModuleIds: role.productModules.map(pm => pm.id)
    });
    setShowRoleModal(true);
    setModalError('');
    // Reset product tab to first available product
    const products = getUniqueProducts();
    if (products.length > 0) {
      setActiveProductTab(products[0].productId);
    }
  };

  const handleProductModuleToggle = (productModuleId: number) => {
    const currentIds = roleForm.productModuleIds || [];
    if (currentIds.includes(productModuleId)) {
      setRoleForm({
        ...roleForm,
        productModuleIds: currentIds.filter(id => id !== productModuleId)
      });
    } else {
      setRoleForm({
        ...roleForm,
        productModuleIds: [...currentIds, productModuleId]
      });
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modules-container">
      <div className="modules-header">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="admin-back-button"
          aria-label="Back to dashboard"
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <div className="product-info">
          <h1 className="product-title">Admin Dashboard</h1>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <span className="material-icons">badge</span>
          Roles
          <span className="tab-count">{roles.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="material-icons">people</span>
          Users
          <span className="tab-count">{users.length}</span>
        </button>
      </div>

      {activeTab === 'roles' && (
        <div className="tab-content">
          <div className="section-header">
            <h2 className="section-title">Role Management</h2>
            <button 
              onClick={() => {
                setShowRoleModal(true);
                setModalError('');
                // Initialize product tab for new role creation
                const products = getUniqueProducts();
                if (products.length > 0) {
                  setActiveProductTab(products[0].productId);
                }
              }}
              className="btn-primary-action"
            >
              <span className="material-icons">add</span>
              Create Role
            </button>
          </div>

          {roles.length === 0 ? (
            <div className="empty-state-table">
              <span className="material-icons">badge</span>
              <h3>No roles created yet</h3>
              <p>Create your first role to manage user permissions</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="roles-table">
                <thead>
                  <tr>
                    <th>Role Name</th>
                    <th>Description</th>
                    <th>Accessible Modules</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id}>
                      <td className="role-name-cell">
                        <div className="role-name-wrapper">
                          <span className="material-icons role-icon">badge</span>
                          <span className="role-name">{role.name}</span>
                        </div>
                      </td>
                      <td className="role-description-cell">{role.description}</td>
                      <td className="role-modules-cell">
                        {role.productModules.length === 0 ? (
                          <span className="no-modules-text">No modules assigned</span>
                        ) : (
                          <div className="modules-list">
                            {groupModulesByProduct(role.productModules).map((group) => (
                              <div key={group.productName} className="module-group">
                                <span className="product-label">{group.productName}:</span>
                                <span className="module-names">
                                  {group.modules.map(pm => pm.module.name).join(', ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="role-actions-cell">
                        <button 
                          onClick={() => openEditRole(role)}
                          className="table-action-btn edit-btn"
                          title="Edit Role"
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button 
                          onClick={() => deleteRole(role)}
                          className="table-action-btn delete-btn"
                          title="Delete Role"
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="section-header">
            <h2 className="section-title">User Management</h2>
            <button 
              onClick={() => setShowUserModal(true)}
              className="btn-primary-action"
            >
              <span className="material-icons">person_add</span>
              Create User
            </button>
          </div>

          {users.length === 0 ? (
            <div className="empty-state-table">
              <span className="material-icons">people</span>
              <h3>No users created yet</h3>
              <p>Create your first user to grant system access</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="user-email-cell">
                        <div className="user-email-wrapper">
                          <span className="material-icons user-icon">account_circle</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </td>
                      <td className="user-role-cell">
                        <span className="role-badge">
                          <span className="material-icons">badge</span>
                          {user.role?.name || 'No Role'}
                        </span>
                      </td>
                      <td className="user-status-cell">
                        {user.isSuperadmin ? (
                          <span className="badge badge-admin">
                            <span className="material-icons">admin_panel_settings</span>
                            Superadmin
                          </span>
                        ) : (
                          <span className="badge badge-user">
                            <span className="material-icons">person</span>
                            User
                          </span>
                        )}
                      </td>
                      <td className="user-created-cell">
                        <span className="date-text">
                          <span className="material-icons">calendar_today</span>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="user-actions-cell">
                        <button 
                          onClick={() => openEditUser(user)}
                          className="table-action-btn edit-btn"
                          title="Edit User"
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button 
                          onClick={() => deleteUser(user)}
                          className="table-action-btn delete-btn"
                          title="Delete User"
                          disabled={user.isSuperadmin}
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => {
          setShowRoleModal(false);
          setEditingRole(null);
          setRoleForm({ name: '', description: '', productModuleIds: [] });
          setModalError('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <span className="material-icons">
                  {editingRole ? 'edit' : 'add_circle'}
                </span>
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
              <button 
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRole(null);
                  setRoleForm({ name: '', description: '', productModuleIds: [] });
                  setModalError('');
                }}
                className="modal-close-btn"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              {modalError && (
                <div className="alert alert-error" style={{ marginBottom: '24px' }}>
                  {modalError}
                </div>
              )}
              <form onSubmit={handleCreateRole} className="modal-form">
                <div className="form-group">
                <label htmlFor="roleName" className="form-label">
                  <span className="material-icons">label</span>
                  Role Name
                </label>
                <input
                  type="text"
                  id="roleName"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="Enter role name"
                  required
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="roleDescription" className="form-label">
                  <span className="material-icons">description</span>
                  Description
                </label>
                <textarea
                  id="roleDescription"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Enter role description"
                  className="form-control"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="material-icons">dashboard</span>
                  Grant Access to Modules
                </label>
                {getUniqueProducts().length > 0 && (
                  <div className="product-module-tabs">
                    {/* Product Tabs */}
                    <div className="product-tabs">
                      {getUniqueProducts().map((product) => (
                        <button
                          key={product.productId}
                          type="button"
                          className={`product-tab ${activeProductTab === product.productId ? 'active' : ''}`}
                          onClick={() => setActiveProductTab(product.productId)}
                        >
                          {product.productName}
                        </button>
                      ))}
                    </div>
                    
                    {/* Modules for Active Product */}
                    {activeProductTab && (
                      <div className="modules-selection">
                        {getModulesForProduct(activeProductTab).length > 0 ? (
                          getModulesForProduct(activeProductTab).map((productModule) => (
                            <label key={productModule.id} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={(roleForm.productModuleIds || []).includes(productModule.id)}
                                onChange={() => handleProductModuleToggle(productModule.id)}
                              />
                              <span className="checkbox-text">
                                <span className="module-info">
                                  <span className="material-icons">extension</span>
                                  {productModule.module.name}
                                </span>
                                <span className="module-description">{productModule.module.description}</span>
                              </span>
                            </label>
                          ))
                        ) : (
                          <div className="no-modules-message">
                            <span className="material-icons">info</span>
                            <p>No modules available for this product</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              </form>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRole(null);
                  setRoleForm({ name: '', description: '', productModuleIds: [] });
                  setModalError('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleCreateRole}
                className="btn-primary"
              >
                <span className="material-icons">
                  {editingRole ? 'save' : 'add'}
                </span>
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="modal-overlay" onClick={() => {
          setShowEditUserModal(false);
          setEditingUser(null);
          setEditUserForm({ roleId: undefined });
        }}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <span className="material-icons">edit</span>
                Edit User
              </h3>
              <button 
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                  setEditUserForm({ roleId: undefined });
                }}
                className="modal-close-btn"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateUser} className="modal-form">
                <div className="form-group">
                  <label className="form-label">
                    <span className="material-icons">email</span>
                    Email (Read-only)
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="form-control disabled"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="editUserRole" className="form-label">
                    <span className="material-icons">badge</span>
                    Role
                  </label>
                  <select
                    id="editUserRole"
                    value={editUserForm.roleId || ''}
                    onChange={(e) => setEditUserForm({ 
                      roleId: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    className="form-control"
                  >
                    <option value="">No Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button"
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                  setEditUserForm({ roleId: undefined });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleUpdateUser}
                className="btn-primary"
              >
                <span className="material-icons">save</span>
                Update User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => {
          setShowUserModal(false);
          setUserForm({ email: '', password: '', roleId: undefined });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <span className="material-icons">person_add</span>
                Create New User
              </h3>
              <button 
                onClick={() => {
                  setShowUserModal(false);
                  setUserForm({ email: '', password: '', roleId: undefined });
                }}
                className="modal-close-btn"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateUser} className="modal-form">
                <div className="form-group">
                  <label htmlFor="userEmail" className="form-label">
                    <span className="material-icons">email</span>
                    Email
                  </label>
                  <input
                    type="email"
                    id="userEmail"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="userPassword" className="form-label">
                    <span className="material-icons">lock</span>
                    Password
                  </label>
                  <input
                    type="password"
                    id="userPassword"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Enter password (min 6 characters)"
                    required
                    minLength={6}
                    className="form-control"
                  />
                </div>

              <div className="form-group">
                <label htmlFor="userRole" className="form-label">
                  <span className="material-icons">badge</span>
                  Role
                </label>
                <select
                  id="userRole"
                  value={userForm.roleId || ''}
                  onChange={(e) => setUserForm({ 
                    ...userForm, 
                    roleId: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  className="form-control"
                >
                  <option value="">Select a role (optional)</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              </form>
            </div>
            <div className="modal-actions">
              <button 
                type="button"
                onClick={() => {
                  setShowUserModal(false);
                  setUserForm({ email: '', password: '', roleId: undefined });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleCreateUser}
                className="btn-primary"
              >
                <span className="material-icons">person_add</span>
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Role Confirmation Modal */}
      {showDeleteRoleModal && (
        <div className="admin-modal-overlay" onClick={() => {
          setShowDeleteRoleModal(false);
          setRoleToDelete(null);
          resetHoldState();
        }}>
          <div className="admin-modal-content delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Delete Role</h2>
              <button className="admin-modal-close-btn" onClick={() => {
                setShowDeleteRoleModal(false);
                setRoleToDelete(null);
                resetHoldState();
              }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="admin-modal-body delete-modal-body">
              <div className="warning-icon">
                <span className="material-icons">warning</span>
              </div>
              <div className="delete-message">
                <p><strong>Are you sure you want to delete "{roleToDelete?.name}"?</strong></p>
                <p className="warning-text">This action cannot be undone. This role may be assigned to users and could affect their system access.</p>
              </div>
            </div>
            <div className="admin-modal-footer delete-modal-footer">
              <button onClick={() => {
                setShowDeleteRoleModal(false);
                setRoleToDelete(null);
                resetHoldState();
              }} className="btn-cancel">Cancel</button>
              <button 
                className={`btn-delete-hold ${isHolding ? 'holding' : ''}`}
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                disabled={holdProgress >= 100 || hasTriggered}
              >
                <div className="hold-progress" style={{ width: `${holdProgress}%` }}></div>
                <span className="hold-text">
                  {holdProgress >= 100 ? 'Deleting...' : 'Hold to Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteUserModal && (
        <div className="admin-modal-overlay" onClick={() => {
          setShowDeleteUserModal(false);
          setUserToDelete(null);
          resetHoldState();
        }}>
          <div className="admin-modal-content delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Delete User</h2>
              <button className="admin-modal-close-btn" onClick={() => {
                setShowDeleteUserModal(false);
                setUserToDelete(null);
                resetHoldState();
              }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="admin-modal-body delete-modal-body">
              <div className="warning-icon">
                <span className="material-icons">warning</span>
              </div>
              <div className="delete-message">
                <p><strong>Are you sure you want to delete "{userToDelete?.email}"?</strong></p>
                <p className="warning-text">This action cannot be undone. The user will lose access to the system immediately.</p>
              </div>
            </div>
            <div className="admin-modal-footer delete-modal-footer">
              <button onClick={() => {
                setShowDeleteUserModal(false);
                setUserToDelete(null);
                resetHoldState();
              }} className="btn-cancel">Cancel</button>
              <button 
                className={`btn-delete-hold ${isHolding ? 'holding' : ''}`}
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                disabled={holdProgress >= 100 || hasTriggered}
              >
                <div className="hold-progress" style={{ width: `${holdProgress}%` }}></div>
                <span className="hold-text">
                  {holdProgress >= 100 ? 'Deleting...' : 'Hold to Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;