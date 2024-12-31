import { SignIn } from "@clerk/clerk-react";
import IllinoisLogo from '../assets/logos/Illinois Full Color Logo.png';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn 
        appearance={{
            layout: {
                logoImageUrl: IllinoisLogo,
                showOptionalFields: false,
                logoLinkUrl: "/logo",
            }
            
        }}
        signUpUrl="/sign-up"
      />
    </div>
  );
} 