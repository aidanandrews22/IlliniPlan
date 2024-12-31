import { SignUp } from "@clerk/clerk-react";
import IllinoisLogo from '../assets/logos/Illinois Full Color Logo.png';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUp 
        appearance={{
            layout: {
                logoImageUrl: IllinoisLogo,
                showOptionalFields: false,
                logoLinkUrl: "/logo",
            }
        }}
        signInUrl="/sign-in"
      />
    </div>
  );
} 