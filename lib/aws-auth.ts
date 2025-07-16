import {
  signUp as cognitoSignUp,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  confirmSignUp as cognitoConfirmSignUp,
  getCurrentUser as cognitoGetCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth"
import { mockAuth } from "./mock-auth"

interface UserAttributes {
  name: string
  contact: string
  address: string
  role: string
  company_name?: string
  factory_type?: string
  waste_types?: string[]
}

// Check if AWS is properly configured
const isAWSConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID && process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID)
}

export const signUp = async (email: string, password: string, attributes: UserAttributes) => {
  try {
    if (!isAWSConfigured()) {
      console.log("🔄 Using mock authentication (AWS not configured)")
      const result = await mockAuth.signUp(email, password, attributes)
      return { user: result.userId, error: null }
    }

    const result = await cognitoSignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name: attributes.name,
          "custom:contact": attributes.contact,
          "custom:address": attributes.address,
          "custom:role": attributes.role,
          "custom:company_name": attributes.company_name ?? "",
          "custom:factory_type": attributes.factory_type ?? "",
          "custom:waste_types": JSON.stringify(attributes.waste_types ?? []),
        },
      },
    })
    return { user: result.userId, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    if (!isAWSConfigured()) {
      console.log("🔄 Using mock authentication (AWS not configured)")
      const result = await mockAuth.signIn(email, password)
      return { user: result.user, error: null }
    }

    const result = await cognitoSignIn({
      username: email,
      password,
    })
    return { user: result, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export const signOut = async () => {
  try {
    if (!isAWSConfigured()) {
      console.log("🔄 Using mock authentication sign out")
      await mockAuth.signOut()
      return { error: null }
    }

    console.log("🔄 Signing out from AWS Cognito")
    await cognitoSignOut()
    return { error: null }
  } catch (error) {
    console.error("Sign out error:", error)
    return { error }
  }
}

export const confirmSignUp = async (email: string, confirmationCode: string) => {
  try {
    if (!isAWSConfigured()) {
      console.log("🔄 Using mock authentication (AWS not configured)")
      await mockAuth.confirmSignUp(email, confirmationCode)
      return { error: null }
    }

    await cognitoConfirmSignUp({
      username: email,
      confirmationCode,
    })
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export const getCurrentUser = async () => {
  try {
    if (!isAWSConfigured()) {
      const user = await mockAuth.getCurrentUser()
      return { user, error: null }
    }

    const user = await cognitoGetCurrentUser()
    return { user, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export const getSession = async () => {
  try {
    if (!isAWSConfigured()) {
      // Mock session for development
      return {
        session: {
          tokens: {
            idToken: { toString: () => "mock-token" },
          },
        },
        error: null,
      }
    }

    const session = await fetchAuthSession()
    return { session, error: null }
  } catch (error) {
    return { session: null, error }
  }
}
