import { UserProfile } from '@clerk/clerk-react'
import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

const Profile = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useAuth()

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
      >
        Edit Profile
      </button>

      <button
        onClick={() => signOut()}
        className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors ml-4"
      >
        Sign Out
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleOverlayClick}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <UserProfile />
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile