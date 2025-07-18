import { pickupRequestService } from './pickup-request-service'

class BiddingTimerService {
  private timers: Map<string, NodeJS.Timeout> = new Map()

  startTimer(requestId: string, durationMs: number = 5 * 60 * 1000) {
    // Clear existing timer if any
    this.clearTimer(requestId)
    
    const timer = setTimeout(async () => {
      try {
        console.log(`Bidding ended for request ${requestId}, selecting winner...`)
        const winner = await pickupRequestService.selectWinningBid(requestId)
        
        if (winner) {
          console.log(`Winner selected: ${winner.vendor_name} with bid ₹${winner.bid_amount}`)
          
          // You can add notification logic here
          // For example, send notifications to the industry and vendor
          
        } else {
          console.log(`No bids found for request ${requestId}`)
        }
      } catch (error) {
        console.error(`Error selecting winner for request ${requestId}:`, error)
      } finally {
        this.clearTimer(requestId)
      }
    }, durationMs)
    
    this.timers.set(requestId, timer)
    console.log(`Timer started for request ${requestId} (${durationMs}ms)`)
  }

  clearTimer(requestId: string) {
    const timer = this.timers.get(requestId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(requestId)
      console.log(`Timer cleared for request ${requestId}`)
    }
  }

  clearAllTimers() {
    this.timers.forEach((timer, requestId) => {
      clearTimeout(timer)
      console.log(`Timer cleared for request ${requestId}`)
    })
    this.timers.clear()
  }
}

export const biddingTimerService = new BiddingTimerService()

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    biddingTimerService.clearAllTimers()
  })
}
