const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bkihtswnnrtpcrxftyqq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwNjI0NDMsImV4cCI6MjA1MjYzODQ0M30.1S-zUxjVJnl0OJNNTJXJGlQ3SkYVNDHd_lzRfqxJhHU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugVendorBidsSchema() {
  console.log('🔍 Debugging vendor_bids table schema...')
  
  try {
    // Get a sample vendor_bids record to see the actual structure
    const { data: sampleBids, error: sampleError } = await supabase
      .from('vendor_bids')
      .select('*')
      .limit(5)
    
    if (sampleError) {
      console.error('❌ Error fetching sample vendor_bids:', {
        error: sampleError,
        message: sampleError.message,
        details: sampleError.details,
        hint: sampleError.hint,
        code: sampleError.code
      })
    } else {
      console.log('✅ Sample vendor_bids records:')
      sampleBids.forEach((bid, index) => {
        console.log(`  Record ${index + 1}:`, {
          keys: Object.keys(bid),
          values: bid
        })
      })
      
      if (sampleBids.length > 0) {
        console.log('\n📋 Available columns in vendor_bids:')
        console.log(Object.keys(sampleBids[0]).join(', '))
      }
    }
    
    // Also check if there are specific requests with bids
    console.log('\n🎯 Looking for recent bids by request...')
    const { data: recentBids, error: recentError } = await supabase
      .from('vendor_bids')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!recentError && recentBids) {
      console.log('Recent bids:')
      recentBids.forEach((bid, index) => {
        console.log(`  ${index + 1}. Request: ${bid.request_id}, Vendor: ${bid.vendor_id}, Amount: ₹${bid.bid_amount}, Primary Key: ${bid.id || bid.bid_id || 'UNKNOWN'}`)
      })
    }
    
  } catch (error) {
    console.error('💥 Exception during vendor_bids debugging:', error)
  }
}

debugVendorBidsSchema()
