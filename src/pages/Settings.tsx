import Profile from '../components/Profile';

const Settings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"> */}
        <Profile />
      {/* </div> */}
    </div>
  );
};

export default Settings; 