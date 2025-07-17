import { createClient } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

interface CreateIndustryAccountParams {
  email: string;
  password: string;
  companyName: string;
  industryType: string;
  adminContact: string;
  address: string;
  wasteTypes: string[];
}

/**
 * Helper function for administrators to create industry accounts
 * Can only be called by users with admin role
 */
export async function createIndustryAccount(params: CreateIndustryAccountParams) {
  const supabase = createClient()

  // First verify the current user is an admin
  const { data: session } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profileError || adminProfile?.role !== 'admin') {
    throw new Error('Only administrators can create industry accounts')
  }

  try {
    // Create the Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
    })

    if (authError) throw authError

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: params.email,
        role: 'industry',
        company_name: params.companyName,
        factory_type: params.industryType,
        contact: params.adminContact,
        address: params.address,
        waste_types: params.wasteTypes,
        registration_approved: false,
      })

    if (profileError) throw profileError

    // Create factory profile
    const { error: factoryError } = await supabase
      .from('factories')
      .insert({
        factory_id: authData.user.id,
        factory_name: params.companyName,
        contact: params.adminContact,
        address: params.address,
        email: params.email,
        factory_type: params.industryType,
        waste_types_produced: params.wasteTypes,
      })

    if (factoryError) throw factoryError

    return {
      success: true,
      user: authData.user,
    }
  } catch (error) {
    console.error('Error creating industry account:', error)
    throw error
  }
}

/**
 * Helper function for administrators to approve industry accounts
 * Can only be called by users with admin role
 */
export async function approveIndustryAccount(industryId: string) {
  const supabase = createClient()

  // First verify the current user is an admin
  const { data: session } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profileError || adminProfile?.role !== 'admin') {
    throw new Error('Only administrators can approve industry accounts')
  }

  // Verify the target account is an industry
  const { data: industryProfile, error: industryError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', industryId)
    .single()

  if (industryError || industryProfile?.role !== 'industry') {
    throw new Error('Invalid industry account')
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ registration_approved: true })
      .eq('id', industryId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error approving industry account:', error)
    throw error
  }
}
