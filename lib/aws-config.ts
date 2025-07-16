import { Amplify } from "aws-amplify"

// Check if we're in the browser environment
if (typeof window !== "undefined") {
  const awsConfig = {
    Auth: {
      Cognito: {
        region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "",
        identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || "",
        loginWith: {
          email: true,
        },
        signUpVerificationMethod: "code",
        userAttributes: {
          email: {
            required: true,
          },
          name: {
            required: true,
          },
        },
        allowGuestAccess: false,
        passwordFormat: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialCharacters: true,
        },
      },
    },
    API: {
      REST: {
        "ecosync-api": {
          endpoint: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "",
          region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
        },
      },
    },
  }

  // Only configure if we have the required environment variables
  if (awsConfig.Auth.Cognito.userPoolId && awsConfig.Auth.Cognito.userPoolClientId) {
    try {
      Amplify.configure(awsConfig)
      console.log("✅ AWS Amplify configured successfully")
    } catch (error) {
      console.error("❌ Failed to configure AWS Amplify:", error)
    }
  } else {
    console.warn("⚠️ AWS Cognito environment variables not found. Using mock authentication.")
  }
}

export default {}
