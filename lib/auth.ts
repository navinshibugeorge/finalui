import { createClient } from './supabase'
import { User } from '@supabase/supabase-js'

interface SignUpData {
  email: string
  password: string
  role: 'citizen' | 'vendor'  // Note: 'industry' role is not allowed for signup
  fullName: string
  contact: string
  address: string
  companyName?: string
  wasteTypes?: string[]
  collectingWasteTypes?: string[]
}

interface SignInData {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | null
  error: Error | null
  profile?: any
}

const supabase = createClient()

export const auth = {
  /**
   * Sign up a new user - only citizens and vendors allowed
   */
  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
            name: data.fullName,
            email: data.email
          }
        }
      })

      if (authError) throw authError

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user?.id,
          email: data.email,
          name: data.fullName,
          contact: data.contact,
          address: data.address,
          role: data.role,
          company_name: data.companyName,
          waste_types: data.wasteTypes,
        })

      if (profileError) throw profileError

      // 3. Create role-specific profile
      if (data.role === 'citizen') {
        const { error: citizenError } = await supabase
          .from('citizens')
          .insert({
            user_id: authData.user?.id,
            email: data.email,
            name: data.fullName,
            contact: data.contact,
            address: data.address,
          })
        if (citizenError) throw citizenError
      } else if (data.role === 'vendor') {
        const { error: vendorError } = await supabase
          .from('vendors')
          .insert({
            vendor_id: authData.user?.id,
            name: data.fullName,
            email: data.email,
            contact: data.contact,
            address: data.address,
            collecting_waste_types: data.collectingWasteTypes || [],
          })
        if (vendorError) throw vendorError

        // Insert waste types if provided for backward compatibility
        if (data.wasteTypes && data.wasteTypes.length > 0) {
          const wasteTypeRecords = data.wasteTypes.map(type => ({
            vendor_id: authData.user?.id,
            waste_type: type,
            rate_per_kg: 0, // Default rate, can be updated later
          }))
          const { error: wasteTypeError } = await supabase
            .from('vendor_waste_types')
            .insert(wasteTypeRecords)
          if (wasteTypeError) throw wasteTypeError
        }

        // Also insert collectingWasteTypes into vendor_waste_types for compatibility
        if (data.collectingWasteTypes && data.collectingWasteTypes.length > 0) {
          const collectingWasteTypeRecords = data.collectingWasteTypes.map(type => ({
            vendor_id: authData.user?.id,
            waste_type: type.toLowerCase(),
            rate_per_kg: 0, // Default rate, can be updated later
          }))
          const { error: collectingWasteTypeError } = await supabase
            .from('vendor_waste_types')
            .insert(collectingWasteTypeRecords)
          if (collectingWasteTypeError) throw collectingWasteTypeError
        }
      }

      return {
        user: authData.user,
        error: null
      }
    } catch (error) {
      console.error('Signup error:', error)
      return {
        user: null,
        error: error as Error
      }
    }
  },

  /**
   * Sign in a user - all roles allowed
   */
  signIn: async (data: SignInData): Promise<AuthResponse> => {
    try {
      // 1. Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError

      // 2. Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) throw profileError

      // Check if industry account is approved
      if (profile.role === 'industry' && !profile.registration_approved) {
        throw new Error('Industry account pending approval. Please contact administrator.')
      }

      return {
        user: authData.user,
        profile,
        error: null
      }
    } catch (error) {
      console.error('Signin error:', error)
      return {
        user: null,
        error: error as Error
      }
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  /**
   * Get the current session and user profile
   */
  getSession: async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { user: null, profile: null, error: sessionError }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      return { user: null, profile: null, error: profileError }
    }

    return {
      user: session.user,
      profile,
      error: null
    }
  }
}
