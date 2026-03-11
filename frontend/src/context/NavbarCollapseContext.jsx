import React, { createContext, useState } from 'react';

export const NavbarCollapseContext = createContext();

export function NavbarCollapseProvider({ children }) {
  const [shouldCollapseNavbar, setShouldCollapseNavbar] = useState(false);

  return (
    <NavbarCollapseContext.Provider value={{ shouldCollapseNavbar, setShouldCollapseNavbar }}>
      {children}
    </NavbarCollapseContext.Provider>
  );
}
