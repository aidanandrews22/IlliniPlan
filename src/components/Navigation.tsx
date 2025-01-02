import { Link, useLocation } from 'react-router-dom';
// import { UserButton } from '@clerk/clerk-react';
import logo from '../assets/logos/Illinois Full Color Logo.png';
import { UserButton } from '@clerk/clerk-react';

interface NavItem {
  name: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Plan', path: '/', icon: '📋' },
  { name: 'Explore', path: '/explore', icon: '🔍' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
];

const Navigation = () => {
  const location = useLocation();

  const isCurrentPath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-[1600px] w-full mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <img src={logo} alt="Illinois Logo" className="h-10" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              IlliniPlan
            </h1>
            <div className="flex items-center space-x-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isCurrentPath(item.path)
                      ? 'bg-primary/10 text-primary dark:text-primary'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <UserButton afterSignOutUrl="/sign-in" showName={true} />
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="grid grid-cols-3 gap-1 p-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors duration-200 ${
                isCurrentPath(item.path)
                  ? 'bg-primary/10 text-primary dark:text-primary'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs">{item.name}</span>
            </Link>
          ))}
          {/* <div className="flex items-center">
            <UserButton afterSignOutUrl="/sign-in" />
          </div> */}
        </div>
      </nav>
    </>
  );
}

export default Navigation; 