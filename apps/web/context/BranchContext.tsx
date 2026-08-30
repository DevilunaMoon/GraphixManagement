"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BranchItem {
  id: string;
  name: string;
  address?: string | null;
  status: string;
}

interface BranchContextType {
  selectedBranch: string; // 'all' or branch name
  setSelectedBranch: (branch: string) => void;
  branches: BranchItem[];
  refreshBranches: () => Promise<void>;
  isSuperAdmin: boolean;
  userRole: string;
  userBranch: string;
}

const BranchContext = createContext<BranchContextType>({
  selectedBranch: 'all',
  setSelectedBranch: () => {},
  branches: [],
  refreshBranches: async () => {},
  isSuperAdmin: false,
  userRole: '',
  userBranch: 'Tagoloan'
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userBranch, setUserBranch] = useState('Tagoloan');

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.branches)) {
          setBranches(data.branches);
        }
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          const isSuper = data.role === 'SUPER_ADMIN';
          setIsSuperAdmin(isSuper);
          setUserRole(data.role);
          setUserBranch(data.branch || 'Tagoloan');

          if (!isSuper) {
            setSelectedBranch(data.branch || 'Tagoloan');
          } else {
            // Restore from localStorage if present
            const saved = localStorage.getItem('graphix_selected_branch');
            if (saved) {
              setSelectedBranch(saved);
            } else {
              setSelectedBranch('all');
            }
          }

          if (Array.isArray(data.branches)) {
            setBranches(data.branches);
          }
        }
      })
      .catch(err => console.error("Failed to fetch auth status in BranchProvider", err));

    fetchBranches();
  }, []);

  const handleSetSelectedBranch = (branch: string) => {
    setSelectedBranch(branch);
    if (isSuperAdmin) {
      localStorage.setItem('graphix_selected_branch', branch);
    }
  };

  return (
    <BranchContext.Provider
      value={{
        selectedBranch,
        setSelectedBranch: handleSetSelectedBranch,
        branches,
        refreshBranches: fetchBranches,
        isSuperAdmin,
        userRole,
        userBranch
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
